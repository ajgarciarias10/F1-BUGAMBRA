/**
 * Sesión real para el diseño del prototipo (docs/redesign/prototipo-gemini).
 *
 * El prototipo es HTML con su propio script: pinta la liga leyendo Firestore y
 * antes simulaba el rol con una barra. Este módulo pone la sesión de verdad
 * (Firebase Auth + el perfil de `usuarios/{uid}`) con los mismos servicios que
 * usa la app React, y se la pasa al prototipo con el evento `bugambra:sesion`.
 * Las acciones de acceso quedan en `window.bugambraSesion`.
 */
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, linkWithCredential, onAuthStateChanged,
  sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, type AuthCredential, type User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth } from "../services/auth";
import { db } from "../services/firebase";
import { guardarPerfil, perfilGoogleExistente, provisionProfile } from "../services/perfilService";
import { escucharSugerencias } from "../services/sugerenciasService";
import { authFeedback } from "../utils/authFeedback";
import { registerServiceWorker } from "../pwa/registerServiceWorker";
import { getYoutubeEmbedUrl, getYoutubeThumbnailUrl } from "../utils/youtube";
import { sesionDesdePerfil, type SesionPrototipo } from "./perfil";

/** Resultado de una acción de acceso, para que el prototipo enseñe el aviso. */
export interface Resultado { ok: boolean; mensaje?: string }

let actual: SesionPrototipo | null = null;
/** Credencial de Google pendiente de vincular cuando el correo ya tenía cuenta con contraseña. */
let googlePendiente: AuthCredential | null = null;
let ocupado = false;

function publicar(sesion: SesionPrototipo | null) {
  actual = sesion;
  window.dispatchEvent(new CustomEvent("bugambra:sesion", { detail: sesion }));
}

/** Una acción de acceso cada vez: un doble toque no lanza dos ventanas de Google. */
async function unaVez(accion: () => Promise<Resultado>): Promise<Resultado> {
  if (ocupado) return { ok: false, mensaje: "Espera un momento: hay otra operación en marcha." };
  ocupado = true;
  try { return await accion(); }
  catch (error) {
    if (auth.currentUser && !actual) await signOut(auth).catch(() => {});
    return { ok: false, mensaje: authFeedback(error) };
  }
  finally { ocupado = false; }
}

/** Cuántas veces se ha pulsado Google: solo la última pulsación enseña su resultado. */
let intentoGoogle = 0;

/**
 * Fuera de `unaVez` a propósito: Google no deja a la página comprobar si su ventana sigue
 * abierta (Cross-Origin-Opener-Policy), así que un intento cerrado a medias puede no terminar
 * nunca. Volver a pulsar abre otra ventana y Firebase cancela la anterior.
 */
async function entrarConGoogle(): Promise<Resultado> {
  const intento = ++intentoGoogle;
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    const correo = result.user.email?.trim().toLowerCase();
    if (!correo) throw new Error("Google no devolvió un correo válido.");
    if (await perfilGoogleExistente(result.user.uid, correo)) {
      await signOut(auth);
      return { ok: false, mensaje: "No se ha podido vincular Google con tu cuenta. Accede con correo y contraseña o pide ayuda al comisario." };
    }
    await provisionProfile(result.user, correo);
    return { ok: true };
  } catch (error: any) {
    // Una pulsación posterior ya ha abierto otra ventana: esta no tiene nada que decir.
    if (intento !== intentoGoogle) return { ok: false };
    console.error("Acceso con Google", error);
    if (error?.code === "auth/account-exists-with-different-credential") {
      googlePendiente = GoogleAuthProvider.credentialFromError(error);
      if (googlePendiente) return { ok: false, mensaje: "Este Gmail ya tiene cuenta. Entra con su correo y contraseña para vincular Google sin perder tus datos." };
    }
    if (auth.currentUser && !actual) await signOut(auth).catch(() => {});
    return { ok: false, mensaje: authFeedback(error) };
  }
}

async function entrarConCorreo(email: string, password: string): Promise<Resultado> {
  return unaVez(async () => {
    const correo = email.trim().toLowerCase();
    const credential = await signInWithEmailAndPassword(auth, correo, password);
    try {
      await provisionProfile(credential.user, correo);
      if (googlePendiente) { await linkWithCredential(credential.user, googlePendiente); googlePendiente = null; }
    } catch (error) { await signOut(auth); throw error; }
    return { ok: true };
  });
}

/** Igual que el registro de la app: crea la cuenta y su perfil y deja la sesión cerrada. */
async function registrar(alias: string, email: string, password: string): Promise<Resultado> {
  return unaVez(async () => {
    if (password.length < 6) return { ok: false, mensaje: "La contraseña debe tener al menos 6 caracteres." };
    const correo = email.trim().toLowerCase();
    const credential = await createUserWithEmailAndPassword(auth, correo, password);
    try {
      await provisionProfile(credential.user, correo);
      if (alias.trim()) await guardarPerfil(credential.user.uid, alias.trim(), credential.user.photoURL || "");
      await signOut(auth);
    } catch (error) {
      await credential.user.delete().catch(() => signOut(auth));
      throw error;
    }
    return { ok: true, mensaje: "Cuenta creada. Entra con tu correo; el comisario te inscribirá como piloto cuando toque." };
  });
}

async function recuperar(email: string): Promise<Resultado> {
  return unaVez(async () => {
    if (!email.trim()) return { ok: false, mensaje: "Escribe tu correo arriba para recuperar la contraseña." };
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    return { ok: true, mensaje: "Si el correo tiene cuenta, te llegará un enlace. Mira también en spam." };
  });
}

async function salir(): Promise<Resultado> {
  return unaVez(async () => { await signOut(auth); return { ok: true }; });
}

async function guardarAlias(nombre: string): Promise<Resultado> {
  return unaVez(async () => {
    const limpio = nombre.trim();
    if (!actual) return { ok: false, mensaje: "Entra para editar tu perfil." };
    if (!limpio) return { ok: false, mensaje: "El alias no puede quedar vacío." };
    await guardarPerfil(actual.uid, limpio, actual.foto || "");
    return { ok: true, mensaje: "Perfil guardado." };
  });
}

type Acciones = typeof import("./acciones");

/**
 * Acciones que escriben en la liga (acciones.ts), cargadas la primera vez que se usan: la portada
 * pública no descarga los servicios de economía. Una cada vez, como el resto de la sesión.
 */
function accion<K extends Exclude<keyof Acciones, "Resultado">>(nombre: K) {
  return (...args: Parameters<Acciones[K]>): Promise<Resultado> => unaVez(async () => {
    if (!actual) return { ok: false, mensaje: "Entra con tu cuenta para hacer esto." };
    const modulo = await import("./acciones");
    return (modulo[nombre] as (...a: unknown[]) => Promise<Resultado>)(...args);
  });
}

/** Lecturas que la página lanza sola (libro, avisos): fuera del candado, para no bloquear los clics. */
function lectura<K extends "libro" | "ultimoAviso">(nombre: K) {
  return async (...args: Parameters<Acciones[K]>) => {
    if (!actual) return { ok: false };
    try {
      const modulo = await import("./acciones");
      return await (modulo[nombre] as (...a: unknown[]) => ReturnType<Acciones[K]>)(...args);
    } catch (error) {
      console.error(`No se pudo leer ${nombre}`, error);
      return { ok: false };
    }
  };
}

const bugambraAcciones = {
  pactar: accion("pactar"),
  deshacer: accion("deshacer"),
  corregirPrecio: accion("corregirPrecio"),
  procesarEconomia: accion("procesarEconomia"),
  rivalidades: accion("rivalidades"),
  alternarMercado: accion("alternarMercado"),
  guardarActa: accion("guardarActa"),
  decisionFia: accion("decisionFia"),
  fichar: accion("fichar"),
  ajustarSaldo: accion("ajustarSaldo"),
  liberar: accion("liberar"),
  clausula: accion("clausula"),
  usuarios: accion("usuarios"),
  guardarUsuario: accion("guardarUsuario"),
  logo: accion("logo"),
  programar: accion("programar"),
  libro: lectura("libro"),
  ultimoAviso: lectura("ultimoAviso"),
  publicarAviso: accion("publicarAviso"),
  alternarSubasta: accion("alternarSubasta"),
  comenzarSplit: accion("comenzarSplit"),
  presupuestoInicial: accion("presupuestoInicial"),
  reabrirActa: accion("reabrirActa"),
  proponer: (p: { categoria: string; titulo: string }) => unaVez(async () => {
    if (!actual) return { ok: false, mensaje: "Entra con tu cuenta para enviar propuestas." };
    const { proponer } = await import("./acciones");
    return proponer(p, { uid: actual.uid, nombre: actual.nombre, email: auth.currentUser?.email || "", rol: actual.rol });
  }),
};

declare global {
  interface Window {
    bugambraAcciones: typeof bugambraAcciones;
    bugambraYoutube: { embed: typeof getYoutubeEmbedUrl; miniatura: typeof getYoutubeThumbnailUrl };
    bugambraSesion: {
      entrarConGoogle: typeof entrarConGoogle;
      entrarConCorreo: typeof entrarConCorreo;
      registrar: typeof registrar;
      recuperar: typeof recuperar;
      salir: typeof salir;
      guardarAlias: typeof guardarAlias;
    };
  }
}

window.bugambraSesion = { entrarConGoogle, entrarConCorreo, registrar, recuperar, salir, guardarAlias };
window.bugambraAcciones = bugambraAcciones;
// Para enseñar el vídeo de la vuelta rápida con las mismas reglas que lo validan al guardarlo.
window.bugambraYoutube = { embed: getYoutubeEmbedUrl, miniatura: getYoutubeThumbnailUrl };

/** El buzón real (colección `mejoras`) para quien tiene sesión, con el evento `bugambra:propuestas`. */
let dejarBuzon: (() => void) | null = null;
function escucharBuzon(conSesion: boolean) {
  dejarBuzon?.();
  dejarBuzon = null;
  if (!conSesion) return;
  dejarBuzon = escucharSugerencias(
    items => window.dispatchEvent(new CustomEvent("bugambra:propuestas", { detail: items })),
    error => console.error("No se pudo leer el buzón", error),
  );
}

let dejarDeEscuchar: (() => void) | null = null;
onAuthStateChanged(auth, (user: User | null) => {
  dejarDeEscuchar?.();
  dejarDeEscuchar = null;
  escucharBuzon(!!user);
  if (!user) { publicar(null); return; }
  dejarDeEscuchar = onSnapshot(doc(db, "usuarios", user.uid), snap => {
    // Sin perfil todavía (Google recién creado): se publica cuando provisionProfile lo escriba.
    if (snap.exists()) publicar(sesionDesdePerfil(user.uid, user.email || "", snap.data()));
  }, error => {
    console.error("No se pudo leer el perfil", error);
    publicar(null);
  });
});

registerServiceWorker();

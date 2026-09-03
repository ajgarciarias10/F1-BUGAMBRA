import { collection, deleteDoc, doc, getDoc, getDocs, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { clausulaInicialDe, mantenerInicialDe } from "./economyService";
import { OVR_DEBUT } from "../utils/splitResolver";
import type { TipoFichaje } from "../types";

// ─── CICLO DE VIDA DE UN SPLIT ───────────────────────────────────────────────
// Cerrar un bloque, abrir el mercado y levantar el siguiente —o arrancar temporada
// nueva— es siempre el mismo recorrido; lo único que cambia son los datos. Antes cada
// bloque tenía su propio panel con los nombres a fuego, así que el Split 4 habría pedido
// otro. Aquí todo entra por configuración.

const r1 = (n: number) => Math.round(n * 10) / 10;

export const slug = (value: string) => String(value).normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
export const clave = (value: string) => slug(value).replace(/_/g, "");

// ─── LO QUE DEJA EL SPLIT ANTERIOR ───────────────────────────────────────────

export interface EquipoAnterior {
  id: string;
  nombre: string;
  saldoCierre: number;
  conciliado: boolean;
}

export interface FichaAnterior {
  pilotoId: string;
  nombre: string;
  equipoId: string;
  equipoNombre: string;
  precioCompra: number;
  mantenerCierre: number;
  clausulaCierre: number;
  rating: number;
  siguePendiente: boolean;
}

export async function leerCierreDeSplit(
  splitId: string,
): Promise<{ equipos: EquipoAnterior[]; fichas: FichaAnterior[] }> {
  const equiposSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
  const equipos: EquipoAnterior[] = [];
  const fichas: FichaAnterior[] = [];

  for (const equipoDoc of equiposSnap.docs) {
    const data = equipoDoc.data() as any;
    const nombre = data.nombre || equipoDoc.id;
    if (equipoDoc.id !== "agente_libre") {
      // El cierre conciliado manda: el `presupuesto` vivo puede llevar ya descontados
      // fichajes del bloque siguiente y usarlo como apertura los cobraría dos veces.
      equipos.push({
        id: equipoDoc.id,
        nombre,
        saldoCierre: Number(data.economia_historica?.presupuesto_cierre ?? data.presupuesto ?? 0),
        conciliado: typeof data.economia_historica?.presupuesto_cierre === "number",
      });
    }
    const pilotosSnap = await getDocs(collection(db, `splits/${splitId}/equipos/${equipoDoc.id}/pilotos`));
    pilotosSnap.docs.forEach(pd => {
      const p = pd.data() as any;
      fichas.push({
        pilotoId: pd.id,
        nombre: p.nombre || pd.id,
        equipoId: equipoDoc.id,
        equipoNombre: nombre,
        precioCompra: Number(p.precio_compra ?? 0),
        mantenerCierre: Number(p.mantener_actual ?? 0),
        clausulaCierre: Number(p.clausula_actual ?? 0),
        rating: Number(p.rating_piloto) > 0 ? Number(p.rating_piloto) : OVR_DEBUT,
        siguePendiente: p.participa_hasta == null,
      });
    });
  }

  return {
    equipos: equipos.sort((a, b) => a.nombre.localeCompare(b.nombre)),
    fichas: fichas.sort((a, b) => a.equipoNombre.localeCompare(b.equipoNombre) || a.nombre.localeCompare(b.nombre)),
  };
}

// ─── APERTURA DERIVADA ───────────────────────────────────────────────────────
// La apertura de un bloque no se teclea: es el cierre del anterior menos lo que costó el
// mercado. Y el registro de ese mercado es el propio roster del bloque nuevo, porque cada
// ficha guarda el precio al que se fichó. Así la cuenta se puede repetir después de cada
// movimiento sin llevar la cuenta a mano y sin que sumar dos veces cambie el resultado.

export interface AperturaDerivada {
  equipoId: string;
  nombre: string;
  cierreAnterior: number;
  conciliado: boolean;
  /** Lo que el equipo pagó (o cobró, si el precio era negativo) en el mercado del bloque. */
  mercado: number;
  apertura: number;
  aperturaActual: number | null;
  desvio: number;
  detalle: string[];
}

export async function derivarAperturas(
  splitId: string,
  splitAnteriorId: string,
): Promise<{ filas: AperturaDerivada[]; avisos: string[] }> {
  const anterior = await leerCierreDeSplit(splitAnteriorId);
  const cierres = new Map(anterior.equipos.map(e => [e.id, e]));
  const avisos: string[] = [];

  // El precio de compra del roster es el registro del mercado entre bloques. Un piloto
  // fichado con el bloque ya empezado también lo lleva, pero su coste ya se descontó del
  // presupuesto vivo: derivarlo entonces se lo cobraría dos veces.
  const circuitosSnap = await getDocs(collection(db, `splits/${splitId}/circuitos`));
  const corridas = circuitosSnap.docs.filter(d => (d.data() as any).completado).length;
  if (corridas > 0) {
    avisos.push(`${splitId} ya tiene ${corridas} carrera(s) disputada(s): si has fichado con el bloque empezado, ese fichaje se cobraría dos veces.`);
  }

  const equiposSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
  const filas: AperturaDerivada[] = [];

  for (const equipoDoc of equiposSnap.docs) {
    if (equipoDoc.id === "agente_libre") continue;
    const data = equipoDoc.data() as any;
    const nombre = data.nombre || equipoDoc.id;
    const cierre = cierres.get(equipoDoc.id);
    if (!cierre) {
      avisos.push(`${nombre}: no existe en ${splitAnteriorId}, su apertura se queda como está.`);
      continue;
    }
    if (!cierre.conciliado) {
      avisos.push(`${nombre}: ${splitAnteriorId} no tiene cierre conciliado, se usa su presupuesto vivo (${cierre.saldoCierre}M).`);
    }

    const pilotosSnap = await getDocs(collection(db, `splits/${splitId}/equipos/${equipoDoc.id}/pilotos`));
    const detalle: string[] = [];
    let mercado = 0;
    for (const pilotoDoc of pilotosSnap.docs) {
      const ficha = pilotoDoc.data() as any;
      const precio = Number(ficha.precio_compra ?? 0);
      if (precio === 0) continue;
      // Un piloto de precio negativo se cobra en vez de pagarse.
      mercado = r1(mercado + (precio < 0 ? Math.abs(precio) : -precio));
      detalle.push(`${ficha.nombre || pilotoDoc.id} ${precio < 0 ? "+" : "−"}${Math.abs(precio)}M`);
    }

    const apertura = r1(cierre.saldoCierre + mercado);
    const aperturaActual = typeof data.presupuesto_inicial === "number" ? data.presupuesto_inicial : null;
    filas.push({
      equipoId: equipoDoc.id,
      nombre,
      cierreAnterior: cierre.saldoCierre,
      conciliado: cierre.conciliado,
      mercado,
      apertura,
      aperturaActual,
      desvio: aperturaActual == null ? 0 : r1(apertura - aperturaActual),
      detalle,
    });
  }

  return { filas: filas.sort((a, b) => a.nombre.localeCompare(b.nombre)), avisos };
}

// Escribe las aperturas derivadas. El presupuesto vivo se mueve lo mismo que la apertura,
// no se iguala a ella: lo gastado y lo ingresado dentro del bloque tiene que sobrevivir.
export async function aplicarAperturas(
  splitId: string,
  filas: AperturaDerivada[],
): Promise<{ ok: boolean; message: string }> {
  try {
    const cambios = filas.filter(fila => fila.aperturaActual == null || fila.desvio !== 0);
    if (cambios.length === 0) return { ok: true, message: "Las aperturas ya estaban derivadas: no hay nada que cambiar." };

    const batch = writeBatch(db);
    for (const fila of cambios) {
      const equipoRef = doc(db, `splits/${splitId}/equipos`, fila.equipoId);
      const snap = await getDoc(equipoRef);
      const data = snap.data() as any;
      const vivo = Number(data?.presupuesto ?? 0);
      const iniActual = typeof data?.presupuesto_inicial === "number" ? data.presupuesto_inicial : null;
      batch.update(equipoRef, {
        presupuesto_inicial: fila.apertura,
        presupuesto: iniActual == null ? fila.apertura : r1(vivo + fila.apertura - iniActual),
      });
    }
    await batch.commit();
    return { ok: true, message: `Aperturas derivadas en ${cambios.length} escudería(s).` };
  } catch (error: any) {
    return { ok: false, message: `Error al aplicar las aperturas: ${error.message}` };
  }
}

// Cuántas carreras se han disputado ya, para numerar el calendario del bloque nuevo.
export async function contarCarrerasPrevias(splitIds: string[]): Promise<number> {
  let total = 0;
  for (const splitId of splitIds) {
    const snap = await getDocs(collection(db, `splits/${splitId}/circuitos`));
    total += snap.docs.length;
  }
  return total;
}

// ─── CONFIGURACIÓN ───────────────────────────────────────────────────────────

// Qué pasa con cada piloto del bloque anterior.
//   "pendiente"  sale a la puja del día de mercado
//   "se_va"      deja la liga
//   "fichado"    operación ya cerrada: equipo, tipo y precio (precio null = sin cifra aún)
export type Destino =
  | { estado: "pendiente" }
  | { estado: "se_va" }
  | { estado: "fichado"; equipoId: string; tipo: TipoFichaje; precio: number | null };

export interface ConfigNuevoSplit {
  splitAnteriorId: string | null;
  splitId: string;
  nombre: string;
  orden: number;
  temporadaId: string;
  circuitos: string[];
  primeraCarrera: number;
  destinos: Record<string, Destino>;
  rookies: string[];
  /** Apertura tomada de la hoja, por equipoId. Manda sobre la derivada. */
  aperturas: Record<string, number | null>;
  /** Temporada nueva: todos arrancan con este saldo en vez de heredar. */
  presupuestoDeArranque: number | null;
  activo: boolean;
  fichajesAbiertos: boolean;
  cerrarAnterior: boolean;
}

export interface ResultadoCreacion {
  ok: boolean;
  message: string;
  avisos: string[];
}

// ─── CREAR EL SPLIT ──────────────────────────────────────────────────────────

export async function crearSplit(
  config: ConfigNuevoSplit,
  onProgress?: (linea: string) => void,
): Promise<ResultadoCreacion> {
  const avisos: string[] = [];
  const add = (linea: string) => onProgress?.(linea);

  try {
    if (!config.splitId) return { ok: false, message: "Falta el identificador del split.", avisos };
    if (config.circuitos.length === 0) return { ok: false, message: "El split necesita al menos un circuito.", avisos };

    const anterior = config.splitAnteriorId
      ? await leerCierreDeSplit(config.splitAnteriorId)
      : { equipos: [], fichas: [] };

    if (config.splitAnteriorId && anterior.equipos.length === 0) {
      return { ok: false, message: `${config.splitAnteriorId} no tiene escuderías: no hay de dónde heredar.`, avisos };
    }
    add(`Origen: ${config.splitAnteriorId ?? "ninguno"} · ${anterior.equipos.length} escuderías y ${anterior.fichas.length} pilotos.`);

    anterior.equipos.filter(e => !e.conciliado).forEach(e =>
      avisos.push(`${e.nombre}: el split anterior no tiene cierre conciliado, se hereda su presupuesto vivo (${e.saldoCierre}M).`));

    // 1. Vaciar lo que hubiera en el split destino.
    const equiposActuales = await getDocs(collection(db, `splits/${config.splitId}/equipos`));
    for (const equipoDoc of equiposActuales.docs) {
      const pilotosSnap = await getDocs(collection(db, `splits/${config.splitId}/equipos/${equipoDoc.id}/pilotos`));
      for (const pilotDoc of pilotosSnap.docs) await deleteDoc(pilotDoc.ref);
    }
    const circuitosActuales = await getDocs(collection(db, `splits/${config.splitId}/circuitos`));
    for (const circuitoDoc of circuitosActuales.docs) await deleteDoc(circuitoDoc.ref);
    add(`${config.splitId} vaciado: ${equiposActuales.docs.length} escuderías y ${circuitosActuales.docs.length} circuitos.`);

    const batch = writeBatch(db);

    // 2. Movimiento de caja del mercado ya cerrado. El dinero de una cláusula se retira
    //    del sistema, así que solo paga el comprador.
    const caja = new Map<string, number>(anterior.equipos.map(e => [e.id, 0]));
    const mueveCaja = (equipoId: string, importe: number) =>
      caja.set(equipoId, r1((caja.get(equipoId) ?? 0) + importe));

    const enBlanco = {
      puntos_piloto: 0, victorias: 0, podios: 0, poles: 0, dnfs: 0,
      carreras_limpias: 0, vueltas_rapidas: 0,
      historial_precios: {}, historial_rating: {},
      congelado: false, congelado_en: null,
      pending_equipoId: null, pending_precio_compra: null, pending_tipo_fichaje: null,
      participa_desde: 1, participa_hasta: null,
    };

    const fichados: string[] = [];
    const aPuja: string[] = [];
    const salen: string[] = [];

    for (const ficha of anterior.fichas) {
      const destino = config.destinos[ficha.pilotoId] ?? { estado: "pendiente" as const };
      // El overall es trayectoria: las stats se reinician, el rating se arrastra.
      const ovr = { rating_base: ficha.rating, rating_piloto: ficha.rating, rating_exacto: ficha.rating };
      const referencias = {
        valor_split_anterior: ficha.mantenerCierre,
        clausula_split_anterior: ficha.clausulaCierre,
        precio_split_anterior: ficha.precioCompra,
      };

      if (destino.estado === "se_va") { salen.push(ficha.nombre); continue; }

      if (destino.estado === "pendiente") {
        batch.set(doc(db, `splits/${config.splitId}/equipos/agente_libre/pilotos`, ficha.pilotoId), {
          ...enBlanco, ...ovr, ...referencias,
          pilotoId: ficha.pilotoId, nombre: ficha.nombre,
          equipoId: "agente_libre", tipo_fichaje: "subasta",
          // Sin precio hasta que alguien puje: no hay precio de salida.
          precio_compra: 0, mantener_actual: 0, clausula_actual: 0,
          mantener_inicial_split: 0, clausula_inicial_split: 0, precio_carrera_anterior: 0,
        });
        aPuja.push(ficha.nombre);
        continue;
      }

      const precio = destino.precio;
      const cambiaDeEquipo = ficha.equipoId !== destino.equipoId && ficha.equipoId !== "agente_libre";

      batch.set(doc(db, `splits/${config.splitId}/equipos/${destino.equipoId}/pilotos`, ficha.pilotoId), {
        ...enBlanco, ...ovr, ...referencias,
        pilotoId: ficha.pilotoId, nombre: ficha.nombre,
        equipoId: destino.equipoId, tipo_fichaje: destino.tipo,
        ...(precio == null
          ? {
              // Destino acordado sin cifra: ocupa su sitio y no mueve dinero todavía.
              precio_compra: 0, mantener_actual: 0, clausula_actual: 0,
              mantener_inicial_split: 0, clausula_inicial_split: 0, precio_carrera_anterior: 0,
              pendiente_precio: true,
            }
          : {
              precio_compra: precio,
              mantener_actual: mantenerInicialDe(precio),
              clausula_actual: clausulaInicialDe(precio),
              mantener_inicial_split: mantenerInicialDe(precio),
              clausula_inicial_split: clausulaInicialDe(precio),
              precio_carrera_anterior: mantenerInicialDe(precio),
            }),
      });

      if (precio == null) {
        avisos.push(`${ficha.nombre}: destino acordado sin precio, colocado sin cobrar nada.`);
        fichados.push(`${ficha.nombre} → ${destino.equipoId} · ${destino.tipo} · precio pendiente`);
      } else {
        // Un precio negativo se cobra en vez de pagarse.
        mueveCaja(destino.equipoId, precio < 0 ? Math.abs(precio) : -precio);
        fichados.push(`${ficha.nombre} → ${destino.equipoId} · ${destino.tipo} · ${precio}M`
          + (cambiaDeEquipo ? ` (sale de ${ficha.equipoNombre})` : " · sigue"));
      }
    }

    // 3. Escuderías, con la apertura que toque.
    const pilotosGlobales = await getDocs(collection(db, "pilotos"));
    const idPorNombre = new Map<string, string>();
    pilotosGlobales.docs.forEach(d => {
      const nombre = (d.data() as any).nombre;
      if (nombre) idPorNombre.set(clave(nombre), d.id);
    });

    for (const equipo of anterior.equipos) {
      const derivado = r1(equipo.saldoCierre + (caja.get(equipo.id) ?? 0));
      const oficial = config.aperturas[equipo.id];
      const apertura = config.presupuestoDeArranque != null
        ? config.presupuestoDeArranque
        : oficial ?? derivado;

      if (config.presupuestoDeArranque == null && oficial != null && r1(oficial - derivado) !== 0) {
        avisos.push(`${equipo.nombre}: la hoja dice ${oficial}M y de las operaciones salen ${derivado}M `
          + `(desvío ${r1(derivado - oficial) > 0 ? "+" : ""}${r1(derivado - oficial)}M). Mando la hoja.`);
      }

      batch.set(doc(db, `splits/${config.splitId}/equipos`, equipo.id), {
        id: equipo.id,
        nombre: equipo.nombre,
        presupuesto: apertura,
        presupuesto_inicial: apertura,
        puntos_constructores: 0,
        puntos_carreras: [],
      }, { merge: true });
    }

    batch.set(doc(db, `splits/${config.splitId}/equipos`, "agente_libre"), {
      id: "agente_libre", nombre: "Agentes libres", presupuesto: 0, puntos_constructores: 0,
    }, { merge: true });

    // 4. Debutantes: sin trayectoria previa, arrancan en el OVR de partida y a la bolsa.
    const debutan: string[] = [];
    for (const nombre of config.rookies.filter(n => n.trim() !== "")) {
      const pilotId = idPorNombre.get(clave(nombre)) ?? `piloto_${slug(nombre)}`;
      batch.set(doc(db, "pilotos", pilotId), { nombre }, { merge: true });
      batch.set(doc(db, `splits/${config.splitId}/equipos/agente_libre/pilotos`, pilotId), {
        ...enBlanco,
        pilotoId: pilotId, nombre,
        equipoId: "agente_libre", tipo_fichaje: "subasta", rookie: true,
        rating_base: OVR_DEBUT, rating_piloto: OVR_DEBUT, rating_exacto: OVR_DEBUT,
        precio_compra: 0, mantener_actual: 0, clausula_actual: 0,
        mantener_inicial_split: 0, clausula_inicial_split: 0, precio_carrera_anterior: 0,
      });
      debutan.push(nombre);
    }

    // 5. El calendario, vacío.
    config.circuitos.filter(n => n.trim() !== "").forEach((nombre, indice) => {
      batch.set(doc(db, `splits/${config.splitId}/circuitos`, slug(nombre)), {
        nombre,
        numero_carrera: config.primeraCarrera + indice,
        completado: false,
        acta_cerrada: false,
        economia_procesada: false,
        resultados: [],
      });
    });

    // 6. El documento del split. Merge, para no pisar rivalidades ya metidas a mano.
    batch.set(doc(db, "splits", config.splitId), {
      nombre: config.nombre,
      orden: config.orden,
      tipo: "equipos",
      temporadaId: config.temporadaId,
      completado: false,
      activo: config.activo,
      fichajes_abiertos: config.fichajesAbiertos,
      temporada_iniciada: false,
    }, { merge: true });

    await batch.commit();

    // 7. Cerrar el anterior, si se pidió.
    if (config.cerrarAnterior && config.splitAnteriorId) {
      await updateDoc(doc(db, "splits", config.splitAnteriorId), { completado: true, activo: false, fichajes_abiertos: false });
      add(`${config.splitAnteriorId} cerrado.`);
    }

    add(`✓ ${config.nombre}: ${anterior.equipos.length} escuderías, ${config.circuitos.length} carreras.`);
    if (fichados.length) { add(`Operaciones cerradas: ${fichados.length}`); fichados.forEach(l => add(`  ${l}`)); }
    add(`A la puja: ${aPuja.join(" · ") || "nadie"}`);
    if (debutan.length) add(`Debutan: ${debutan.join(" · ")}`);
    if (salen.length) add(`Fuera de la liga: ${salen.join(" · ")}`);
    avisos.forEach(a => add(`⚠ ${a}`));

    return { ok: true, message: `${config.nombre} creado.`, avisos };
  } catch (error: any) {
    const message = `Error creando el split: ${error.message}`;
    add(`⚠ ${message}`);
    return { ok: false, message, avisos };
  }
}

// ─── CERRAR UN SPLIT Y ABRIR EL MERCADO ──────────────────────────────────────
// Acción suelta, para cuando el bloque termina pero todavía no se sabe cómo será el
// siguiente. Deja el mercado abierto en el split que se indique.

export async function cerrarSplitYAbrirMercado(
  splitId: string,
  splitDelMercado: string | null,
): Promise<{ ok: boolean; message: string }> {
  try {
    const snap = await getDoc(doc(db, "splits", splitId));
    if (!snap.exists()) return { ok: false, message: `${splitId} no existe.` };

    const circuitos = await getDocs(collection(db, `splits/${splitId}/circuitos`));
    const sinCerrar = circuitos.docs.filter(d => !(d.data() as any).acta_cerrada);
    const sinEconomia = circuitos.docs.filter(d => !(d.data() as any).economia_procesada);

    await updateDoc(doc(db, "splits", splitId), {
      completado: true,
      activo: false,
      fichajes_abiertos: splitDelMercado === splitId,
    });
    if (splitDelMercado && splitDelMercado !== splitId) {
      await updateDoc(doc(db, "splits", splitDelMercado), { fichajes_abiertos: true, activo: true });
    }

    const pendientes = [
      sinCerrar.length ? `${sinCerrar.length} acta(s) sin cerrar` : "",
      sinEconomia.length ? `${sinEconomia.length} carrera(s) sin economía procesada` : "",
    ].filter(Boolean);

    return {
      ok: true,
      message: `${snap.data()?.nombre || splitId} cerrado`
        + (splitDelMercado ? ` · mercado abierto en ${splitDelMercado}` : "")
        + (pendientes.length ? `. Ojo: ${pendientes.join(" y ")}.` : "."),
    };
  } catch (error: any) {
    return { ok: false, message: `Error al cerrar: ${error.message}` };
  }
}

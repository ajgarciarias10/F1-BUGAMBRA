import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "../services/firebase.js";
import type { Piloto, RosterEntry } from "../types/index.js";

// ─── PILOTOS GLOBALES ─────────────────────────────────────────────────────────

const PILOTOS: Omit<Piloto, "id">[] & { id: string }[] = [
  { id: "piloto_jose",     nombre: "Jose",     rating_piloto: 70 },
  { id: "piloto_moles",    nombre: "Moles",    rating_piloto: 70 },
  { id: "piloto_aparicio", nombre: "Aparicio", rating_piloto: 70 },
  { id: "piloto_mimic",    nombre: "Mimic",    rating_piloto: 70 },
  { id: "piloto_toni",     nombre: "Toni",     rating_piloto: 70 },
  { id: "piloto_pinilla",  nombre: "Pinilla",  rating_piloto: 70 },
  { id: "piloto_fabi",     nombre: "Fabi",     rating_piloto: 70 },
  { id: "piloto_jota",     nombre: "Jota",     rating_piloto: 70 },
  { id: "piloto_samu",     nombre: "Samu",     rating_piloto: 70 },
  { id: "piloto_pabliyo",  nombre: "Pabliyo",  rating_piloto: 70 },
];

// ─── EQUIPOS POR SPLIT ────────────────────────────────────────────────────────

const EQUIPOS = [
  { id: "zenith",      nombre: "Zenith" },
  { id: "alfaromero",  nombre: "Alfa Romero" },
  { id: "roses",       nombre: "Roses" },
];

// ─── ROSTER SPLIT 1 ───────────────────────────────────────────────────────────
// precio_compra determina valoraciones: mantener = precio×3, clausula = precio×2

const ROSTER_SPLIT_1: { pilotoId: string; equipoId: string; precio_compra: number }[] = [
  { pilotoId: "piloto_jose",     equipoId: "zenith",     precio_compra: 40 },
  { pilotoId: "piloto_moles",    equipoId: "zenith",     precio_compra: 25 },
  { pilotoId: "piloto_aparicio", equipoId: "zenith",     precio_compra: 10 },
  { pilotoId: "piloto_mimic",    equipoId: "alfaromero", precio_compra: 52 },
  { pilotoId: "piloto_toni",     equipoId: "alfaromero", precio_compra: 24 },
  { pilotoId: "piloto_pinilla",  equipoId: "alfaromero", precio_compra: 24 },
  { pilotoId: "piloto_fabi",     equipoId: "roses",      precio_compra: 38 },
  { pilotoId: "piloto_jota",     equipoId: "roses",      precio_compra: 28 },
  { pilotoId: "piloto_samu",     equipoId: "roses",      precio_compra: 24 },
  { pilotoId: "piloto_pabliyo",  equipoId: "roses",      precio_compra: 1  },
];

// ─── CIRCUITOS POR SPLIT ──────────────────────────────────────────────────────

const SPLITS_CONFIG = [
  {
    id: "split_1", nombre: "Split 1", orden: 1,
    circuitos: ["Australia", "China", "Japón", "Arabia Saudí", "Miami", "Baréin"],
  },
  {
    id: "split_2", nombre: "Split 2", orden: 2,
    circuitos: ["Canadá", "Mónaco", "Barcelona", "Austria", "Gran Bretaña", "Bélgica"],
  },
  {
    id: "split_3", nombre: "Split 3", orden: 3,
    circuitos: ["Hungría", "Países Bajos", "Italia", "España", "Azerbaiyán", "Singapur"],
  },
  {
    id: "split_4", nombre: "Split 4", orden: 4,
    circuitos: ["Austin", "México", "Brasil", "Las Vegas", "Qatar", "Abu Dabi"],
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function toCircuitId(nombre: string): string {
  return nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

function buildRosterEntry(pilotoId: string, equipoId: string, precio_compra: number): RosterEntry {
  const mantener = r1(precio_compra * 3);
  const clausula = r1(precio_compra * 2);
  return {
    pilotoId,
    equipoId,
    rating_piloto: 70,
    rating_base: 70,
    precio_compra,
    clausula_actual: clausula,
    mantener_actual: mantener,
    clausula_inicial_split: clausula,
    mantener_inicial_split: mantener,
    precio_carrera_anterior: mantener,
    historial_precios: {},
    puntos_piloto: 0,
    victorias: 0,
    podios: 0,
    poles: 0,
    dnfs: 0,
    carreras_limpias: 0,
  };
}

// ─── SEED PRINCIPAL ───────────────────────────────────────────────────────────

export async function seedDatabase() {
  console.log("Iniciando seed de base de datos...");

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASS = process.env.ADMIN_PASS;
  if (!ADMIN_EMAIL || !ADMIN_PASS) {
    throw new Error("ADMIN_EMAIL y ADMIN_PASS son obligatorios.");
  }

  // Admin auth
  let adminUid: string;
  try {
    const uc = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
    adminUid = uc.user.uid;
    console.log("Admin creado:", adminUid);
  } catch (e: any) {
    if (e.code === "auth/email-already-in-use") {
      const uc = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
      adminUid = uc.user.uid;
      console.log("Admin logueado:", adminUid);
    } else {
      throw e;
    }
  }

  // Admin usuario doc
  await setDoc(doc(db, "usuarios", adminUid), {
    uid: adminUid,
    email: ADMIN_EMAIL,
    nombre: "Admin",
    rol: "admin",
    piloto_id: null,
  });

  // ── Pilotos globales ─────────────────────────────────────────────────────────
  {
    const batch = writeBatch(db);
    for (const p of PILOTOS) {
      batch.set(doc(db, "pilotos", p.id), { nombre: p.nombre, rating_piloto: p.rating_piloto });
    }
    await batch.commit();
    console.log(`${PILOTOS.length} pilotos creados.`);
  }

  // ── Splits, circuitos y equipos ──────────────────────────────────────────────
  for (const splitCfg of SPLITS_CONFIG) {
    const batch = writeBatch(db);

    batch.set(doc(db, "splits", splitCfg.id), {
      nombre: splitCfg.nombre,
      orden: splitCfg.orden,
      fichajes_abiertos: false,
    });

    for (const nombre of splitCfg.circuitos) {
      const cId = toCircuitId(nombre);
      batch.set(doc(db, `splits/${splitCfg.id}/circuitos`, cId), {
        nombre,
        completado: false,
        acta_cerrada: false,
        economia_procesada: false,
        resultados: [],
      });
    }

    for (const equipo of EQUIPOS) {
      batch.set(doc(db, `splits/${splitCfg.id}/equipos`, equipo.id), {
        nombre: equipo.nombre,
        presupuesto: 100,
        puntos_constructores: 0,
      });
    }

    await batch.commit();
    console.log(`${splitCfg.nombre}: split, circuitos y equipos creados.`);
  }

  // ── Roster Split 1 ───────────────────────────────────────────────────────────
  {
    const batch = writeBatch(db);
    for (const entry of ROSTER_SPLIT_1) {
      const rosterData = buildRosterEntry(entry.pilotoId, entry.equipoId, entry.precio_compra);
      batch.set(doc(db, "splits/split_1/roster", entry.pilotoId), rosterData);
    }
    await batch.commit();
    console.log(`${ROSTER_SPLIT_1.length} entradas de roster creadas para Split 1.`);
  }

  console.log("Seed completado correctamente.");
}

if (typeof process !== "undefined" && process?.argv?.[1]?.includes("seed.ts")) {
  seedDatabase().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

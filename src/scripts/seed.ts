import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../services/firebase.js";

// Hardcoded mock data based on prompt
const JEQUES = [
  { id: "jeque_zenith", nombre: "Marotez Al-Rafah", type: "jeque", escuderia: "Zenith" },
  { id: "jeque_roses", nombre: "Mohamanuel Bin Rosa", type: "jeque", escuderia: "Roses" },
  { id: "jeque_alfaromero", nombre: "Talibán Romero", type: "jeque", escuderia: "Alfa Romero" }
];

const PILOTOS = [
  // Escudería Index 0: Zenith
  {
    id: "piloto_jose",
    type: "piloto",
    nombre: "Jose (I)", escuderiaIndex: 0,
    precio_compra_split: 40, mantener_actual: 120, clausula_actual: 80, precio_carrera_anterior: 96,
    puntos_piloto: 87, victorias: 3, podios: 6, poles: 2, vueltas_rapidas: 4, participaciones: 6, dnfs: 0
  },
  {
    id: "piloto_moles",
    type: "piloto",
    nombre: "Moles", escuderiaIndex: 0,
    precio_compra_split: 25, mantener_actual: 75, clausula_actual: 50, precio_carrera_anterior: 30.5,
    puntos_piloto: 43, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 6, dnfs: 0
  },
  {
    id: "piloto_aparicio",
    type: "piloto",
    nombre: "Aparicio", escuderiaIndex: 0,
    precio_compra_split: 10, mantener_actual: 15, clausula_actual: 15, precio_carrera_anterior: 10,
    puntos_piloto: 0, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 0, dnfs: 0
  },
  {
    id: "vacante_zenith",
    type: "piloto",
    nombre: "Vacante Zenith", escuderiaIndex: 0,
    precio_compra_split: 10, mantener_actual: 15, clausula_actual: 15, precio_carrera_anterior: 10,
    puntos_piloto: 0, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 0, dnfs: 0
  },

  // Escudería Index 2: Alfa Romero
  {
    id: "piloto_mimic",
    type: "piloto",
    nombre: "Mimic", escuderiaIndex: 2,
    precio_compra_split: 52, mantener_actual: 156, clausula_actual: 104, precio_carrera_anterior: 72.8,
    puntos_piloto: 81, victorias: 1, podios: 6, poles: 1, vueltas_rapidas: 0, participaciones: 6, dnfs: 0
  },
  {
    id: "piloto_toni",
    type: "piloto",
    nombre: "Toni", escuderiaIndex: 2,
    precio_compra_split: 24, mantener_actual: 72, clausula_actual: 48, precio_carrera_anterior: 24,
    puntos_piloto: 33, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 6, dnfs: 0
  },
  {
    id: "piloto_pinilla",
    type: "piloto",
    nombre: "Pinilla", escuderiaIndex: 2,
    precio_compra_split: 24, mantener_actual: 72, clausula_actual: 48, precio_carrera_anterior: 24,
    puntos_piloto: 18, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 6, dnfs: 0
  },
  {
    id: "vacante_alfaromero",
    type: "piloto",
    nombre: "Vacante Alfa Romero", escuderiaIndex: 2,
    precio_compra_split: 10, mantener_actual: 15, clausula_actual: 15, precio_carrera_anterior: 10,
    puntos_piloto: 0, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 0, dnfs: 0
  },

  // Escudería Index 1: Roses
  {
    id: "piloto_fabi",
    type: "piloto",
    nombre: "Fabi (I)", escuderiaIndex: 1,
    precio_compra_split: 38, mantener_actual: 114, clausula_actual: 76, precio_carrera_anterior: 68.4,
    puntos_piloto: 67, victorias: 1, podios: 4, poles: 0, vueltas_rapidas: 1, participaciones: 6, dnfs: 0
  },
  {
    id: "piloto_jota",
    type: "piloto",
    nombre: "Jota", escuderiaIndex: 1,
    precio_compra_split: 28, mantener_actual: 84, clausula_actual: 56, precio_carrera_anterior: 47.1,
    puntos_piloto: 70, victorias: 1, podios: 2, poles: 3, vueltas_rapidas: 1, participaciones: 6, dnfs: 0
  },
  {
    id: "piloto_samu",
    type: "piloto",
    nombre: "Samu", escuderiaIndex: 1,
    precio_compra_split: 24, mantener_actual: 72, clausula_actual: 48, precio_carrera_anterior: 24,
    puntos_piloto: 22, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 6, dnfs: 0
  },
  {
    id: "piloto_pabliyo",
    type: "piloto",
    nombre: "Pabliyo", escuderiaIndex: 1,
    precio_compra_split: 0.5, mantener_actual: 1.5, clausula_actual: 1, precio_carrera_anterior: 1.5,
    puntos_piloto: 26, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 5, dnfs: 0
  }
];
const DEFAULT_FINANCES = {
  puntos_piloto: 0,
  rating_piloto: 70, // Base default
  precio_compra_split: 10, // Mock base value
  precio_carrera_anterior: 10,
  clausula_actual: 15,
  mantener_actual: 15,
  victorias: 0,
  podios: 0,
  poles: 0,
  dnfs: 0,
  carreras_limpias: 0
};

export async function seedDatabase() {
  console.log("Iniciando sembrado de la base de datos...");
  // We use our bootstrap email for admin.
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASS = process.env.ADMIN_PASS;

  if (!ADMIN_EMAIL || !ADMIN_PASS) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASS environment variables must be set to run the seed script.");
  }

  let adminUid;
  
  try {
    const uc = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
    adminUid = uc.user.uid;
    console.log("Admin creado:", adminUid);
  } catch (e: any) {
    if (e.code === 'auth/email-already-in-use') {
      const uc = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
      adminUid = uc.user.uid;
      console.log("Admin logueado:", adminUid);
    } else {
      throw e;
    }
  }

  // Set admin user doc
  await setDoc(doc(db, "usuarios", adminUid), {
    uid: adminUid,
    nombre: "Administrador F1Bugambra",
    email: ADMIN_EMAIL,
    rol: "admin",
    escuderia_id: "",
    foto_url: "",
    ...DEFAULT_FINANCES
  });

  // Escuderias IDs
  const escuderiaIds: string[] = [];

  // Create Escuderias and Jeques (in plantilla)
  for (const j of JEQUES) {
    try {
      const escuderiaId = j.escuderia.toLowerCase().replace(" ", "_");
      escuderiaIds.push(escuderiaId);

      await setDoc(doc(db, "escuderias", escuderiaId), {
        id: escuderiaId,
        nombre: j.escuderia,
        presupuesto: 100, // 100M base
        puntos_constructores: 0,
        poles: 0,
        vueltas_rapidas: 0,
        jeque_id: "" // To be claimed
      });

      // Put Jeque in Plantilla
      await setDoc(doc(db, "plantilla", j.id), {
        id: j.id,
        nombre: j.nombre,
        rol: "jeque",
        escuderia_id: escuderiaId,
        foto_url: "",
        ...DEFAULT_FINANCES
      });

      console.log(`Escuderia ${j.escuderia} y puesto de Jeque creados`);
    } catch(err) {
      console.error(err);
    }
  }

  // Create Pilotos in Plantilla
  for (const p of PILOTOS) {
    try {
      await setDoc(doc(db, "plantilla", p.id), {
        id: p.id,
        nombre: p.nombre,
        rol: "piloto",
        escuderia_id: escuderiaIds[p.escuderiaIndex],
        foto_url: "",
        rating_piloto: 70, // Base default
        precio_compra_split: p.precio_compra_split ?? DEFAULT_FINANCES.precio_compra_split,
        precio_carrera_anterior: p.precio_carrera_anterior ?? DEFAULT_FINANCES.precio_carrera_anterior,
        clausula_actual: p.clausula_actual ?? DEFAULT_FINANCES.clausula_actual,
        mantener_actual: p.mantener_actual ?? DEFAULT_FINANCES.mantener_actual,
        puntos_piloto: p.puntos_piloto ?? DEFAULT_FINANCES.puntos_piloto,
        victorias: p.victorias ?? DEFAULT_FINANCES.victorias,
        podios: p.podios ?? DEFAULT_FINANCES.podios,
        poles: p.poles ?? DEFAULT_FINANCES.poles,
        dnfs: p.dnfs ?? DEFAULT_FINANCES.dnfs,
        carreras_limpias: 0
      });
      console.log(`Piloto ${p.nombre} añadido a la plantilla`);
    } catch(e) {
      console.error(`Error adding piloto ${p.id} a la plantilla`, e);
    }
  }

  // Initialize Splits
  try {
    const splitsStr = [
      { id: "split_1", nombre: "Split 1", circuitos: ["Australia", "China", "Japón", "Arabia Saudí", "Miami", "Barein"] },
      { id: "split_2", nombre: "Split 2", circuitos: ["Canadá", "Mónaco", "Barcelona", "Austria", "Gran Bretaña", "Bélgica"] },
      { id: "split_3", nombre: "Split 3", circuitos: ["Hungría", "Paises Bajos", "Italia", "España", "Azerbayán", "Singapur"] },
      { id: "split_4", nombre: "Split 4", circuitos: ["Austin", "México", "Brasil", "Las Vegas", "Qatar", "Abu Dhabi"] }
    ];

    for (const spl of splitsStr) {
      await setDoc(doc(db, "splits", spl.id), { nombre: spl.nombre });
      for (const c of spl.circuitos) {
        const cId = c.toLowerCase().replace(/[^a-z0-9]/g, "");
        await setDoc(doc(db, `splits/${spl.id}/circuitos`, cId), {
          nombre: c,
          completado: false,
          resultados: []
        });
      }
      console.log(`${spl.nombre} creado`);
    }
  } catch(e) {
    console.error(e);
  }

  console.log("Sembrado inicial exitoso!");
}

// In environment: call directly if executed via TSX
if (typeof process !== "undefined" && process?.argv?.[1]?.includes("seed.ts")) {
  seedDatabase().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

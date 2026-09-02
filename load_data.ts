import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, terminate } from "firebase/firestore";
import config from "./firebase-applet-config.json" assert { type: "json" };

const app = initializeApp(config);
const db = getFirestore(app, (config as any).firestoreDatabaseId);

const DEFAULT_FINANCES = {
  puntos_piloto: 0,
  rating_piloto: 70,
  precio_compra_split: 10,
  precio_carrera_anterior: 10,
  clausula_actual: 15,
  mantener_actual: 15,
  victorias: 0,
  podios: 0,
  poles: 0,
  dnfs: 0,
  carreras_limpias: 0
};

const TEAMS = [
  { id: "zenith", nombre: "Zenith", jeque: "Marotez Al-Rafah" },
  { id: "roses", nombre: "Roses", jeque: "Mohamanuel Bin Rosa" },
  { id: "alfa_romero", nombre: "Alfa Romero", jeque: "Talibán Romero" }
];

const PILOTS = {
  zenith: [
    {
      id: "piloto_jose",
      nombre: "Jose (I)",
      precio_compra_split: 40, mantener_actual: 120, clausula_actual: 80, precio_carrera_anterior: 96,
      puntos_piloto: 87, victorias: 3, podios: 6, poles: 2, vueltas_rapidas: 4, participaciones: 6, dnfs: 0
    },
    {
      id: "piloto_moles",
      nombre: "Moles",
      precio_compra_split: 25, mantener_actual: 75, clausula_actual: 50, precio_carrera_anterior: 30.5,
      puntos_piloto: 43, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 6, dnfs: 0
    },
    {
      id: "piloto_aparicio",
      nombre: "Aparicio",
      precio_compra_split: 10, mantener_actual: 15, clausula_actual: 15, precio_carrera_anterior: 10,
      puntos_piloto: 0, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 0, dnfs: 0
    },
    {
      id: "vacante_zenith",
      nombre: "Vacante Zenith",
      precio_compra_split: 10, mantener_actual: 15, clausula_actual: 15, precio_carrera_anterior: 10,
      puntos_piloto: 0, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 0, dnfs: 0
    }
  ],
  roses: [
    {
      id: "piloto_fabi",
      nombre: "Fabi (I)",
      precio_compra_split: 38, mantener_actual: 114, clausula_actual: 76, precio_carrera_anterior: 68.4,
      puntos_piloto: 67, victorias: 1, podios: 4, poles: 0, vueltas_rapidas: 1, participaciones: 6, dnfs: 0
    },
    {
      id: "piloto_jota",
      nombre: "Jota",
      precio_compra_split: 28, mantener_actual: 84, clausula_actual: 56, precio_carrera_anterior: 47.1,
      puntos_piloto: 70, victorias: 1, podios: 2, poles: 3, vueltas_rapidas: 1, participaciones: 6, dnfs: 0
    },
    {
      id: "piloto_samu",
      nombre: "Samu",
      precio_compra_split: 24, mantener_actual: 72, clausula_actual: 48, precio_carrera_anterior: 24,
      puntos_piloto: 22, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 6, dnfs: 0
    },
    {
      id: "piloto_pabliyo",
      nombre: "Pabliyo",
      precio_compra_split: 0.5, mantener_actual: 1.5, clausula_actual: 1, precio_carrera_anterior: 1.5,
      puntos_piloto: 26, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 5, dnfs: 0
    }
  ],
  alfa_romero: [
    {
      id: "piloto_mimic",
      nombre: "Mimic",
      precio_compra_split: 52, mantener_actual: 156, clausula_actual: 104, precio_carrera_anterior: 72.8,
      puntos_piloto: 81, victorias: 1, podios: 6, poles: 1, vueltas_rapidas: 0, participaciones: 6, dnfs: 0
    },
    {
      id: "piloto_toni",
      nombre: "Toni",
      precio_compra_split: 24, mantener_actual: 72, clausula_actual: 48, precio_carrera_anterior: 24,
      puntos_piloto: 33, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 6, dnfs: 0
    },
    {
      id: "piloto_pinilla",
      nombre: "Pinilla",
      precio_compra_split: 24, mantener_actual: 72, clausula_actual: 48, precio_carrera_anterior: 24,
      puntos_piloto: 18, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 6, dnfs: 0
    },
    {
      id: "vacante_alfaromero",
      nombre: "Vacante Alfa Romero",
      precio_compra_split: 10, mantener_actual: 15, clausula_actual: 15, precio_carrera_anterior: 10,
      puntos_piloto: 0, victorias: 0, podios: 0, poles: 0, vueltas_rapidas: 0, participaciones: 0, dnfs: 0
    }
  ]
};

const SPLITS = [
  { id: "origins", nombre: "Origins", orden: 0, tipo: "individual", activo: false, completado: true, fichajes_abiertos: false, video_intro: "https://youtu.be/5OLFg1W5LzU", circuitos: [] },
  { id: "split_1", nombre: "Split 1", orden: 1, tipo: "equipos", activo: true, completado: false, fichajes_abiertos: true, video_intro: "https://www.youtube.com/watch?v=PCj87_WObys", circuitos: ["Australia", "China", "Japón", "Arabia Saudí", "Miami", "Barein"] },
  { id: "split_2", nombre: "Split 2", orden: 2, tipo: "equipos", activo: false, completado: false, fichajes_abiertos: true, video_intro: "https://www.youtube.com/watch?v=I3Ou8CxbU1I", circuitos: ["Canadá", "Mónaco", "Barcelona", "Austria", "Gran Bretaña", "Bélgica"] },
  { id: "split_3", nombre: "Split 3", orden: 3, tipo: "equipos", activo: false, completado: false, fichajes_abiertos: true, video_intro: "", circuitos: ["Hungría", "Paises Bajos", "Italia", "España", "Azerbayán", "Singapur"] },
  { id: "split_4", nombre: "Split 4", orden: 4, tipo: "equipos", activo: false, completado: false, fichajes_abiertos: true, video_intro: "", circuitos: ["Austin", "México", "Brasil", "Las Vegas", "Qatar", "Abu Dhabi"] }
];

async function load() {
  console.log("🚀 Iniciando carga limpia de Paddock en base de datos: " + (config as any).firestoreDatabaseId);

  const promises: Promise<any>[] = [];

  // 1. Restaurar Admin Principal
  console.log("📋 Cargando usuario Admin...");
  promises.push(setDoc(doc(db, "usuarios", "1y5Jkjq6v9O9HxeNbSPCdUlzDgp2"), {
    uid: "1y5Jkjq6v9O9HxeNbSPCdUlzDgp2",
    nombre: "Administrador F1Bugambra",
    email: "admin@f1bugambra.com",
    rol: "admin",
    escuderia_id: "",
    foto_url: "",
    ...DEFAULT_FINANCES
  }));

  // 2. Cargar Plantilla para el registro
  console.log("📋 Cargando plantilla de Jeques y Pilotos...");
  for (const team of TEAMS) {
    // Jeque
    const jequeId = `jeque_${team.id}`;
    promises.push(setDoc(doc(db, "plantilla", jequeId), {
      id: jequeId,
      nombre: team.jeque,
      rol: "jeque",
      escuderia_id: team.id,
      foto_url: "",
      ...DEFAULT_FINANCES
    }));

    // Pilotos
    const pilots = PILOTS[team.id as keyof typeof PILOTS];
    for (const p of pilots) {
      promises.push(setDoc(doc(db, "plantilla", p.id), {
        id: p.id,
        nombre: p.nombre,
        rol: "piloto",
        escuderia_id: team.id,
        foto_url: "",
        rating_piloto: 70,
        precio_compra_split: p.precio_compra_split,
        precio_carrera_anterior: p.precio_carrera_anterior,
        clausula_actual: p.clausula_actual,
        mantener_actual: p.mantener_actual,
        puntos_piloto: p.puntos_piloto,
        victorias: p.victorias,
        podios: p.podios,
        poles: p.poles,
        dnfs: p.dnfs,
        carreras_limpias: 0
      }));
    }
  }

  // 3. Crear Splits, Circuitos, Equipos y Roster
  console.log("📋 Cargando estructura de Splits, Circuitos, Equipos y Pilotos...");
  for (const s of SPLITS) {
    const splitRef = doc(db, "splits", s.id);
    promises.push(setDoc(splitRef, {
      nombre: s.nombre,
      orden: s.orden,
      tipo: s.tipo,
      activo: s.activo,
      completado: s.completado,
      fichajes_abiertos: s.fichajes_abiertos,
      video_intro: s.video_intro || null
    }));

    // Circuitos de este split
    for (const cName of s.circuitos) {
      const cId = cName.toLowerCase().replace(/[^a-z0-9]/g, "");
      promises.push(setDoc(doc(db, `splits/${s.id}/circuitos`, cId), {
        nombre: cName,
        completado: false,
        resultados: []
      }));
    }

    // Equipos para temporadas que se disputan por escuderías
    if (s.tipo === "equipos") for (const team of TEAMS) {
      promises.push(setDoc(doc(db, `splits/${s.id}/equipos`, team.id), {
        id: team.id,
        nombre: team.nombre,
        presupuesto: 100,
        puntos_constructores: 0,
        jeque_id: ""
      }));

      // Pilotos en el roster para este equipo/split
      const pilots = PILOTS[team.id as keyof typeof PILOTS];
      for (const p of pilots) {
        promises.push(setDoc(doc(db, `splits/${s.id}/equipos/${team.id}/pilotos`, p.id), {
          id: p.id,
          nombre: p.nombre,
          puntos_piloto: p.puntos_piloto,
          victorias: p.victorias,
          podios: p.podios,
          rating_piloto: 70,
          precio_compra_split: p.precio_compra_split,
          precio_carrera_anterior: p.precio_carrera_anterior,
          clausula_actual: p.clausula_actual,
          mantener_actual: p.mantener_actual
        }));
      }
    }
  }

  console.log("⏳ Enviando inserciones a Firestore...");
  await Promise.all(promises);
  console.log("🏁 Carga completada con éxito en Firestore!");
  
  // Terminar la conexión para que tsx finalice de inmediato
  await terminate(db).catch(e => console.error("Error al terminar db", e));
  process.exit(0);
}

load().catch(async (err) => {
  console.error("❌ Error en la carga:", err);
  await terminate(db).catch(() => {});
  process.exit(1);
});

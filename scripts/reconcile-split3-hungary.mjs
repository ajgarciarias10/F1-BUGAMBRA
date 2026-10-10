/**
 * Reconciliación oficial y liquidación económica de Split 3 Hungría.
 *
 * Uso (previsualización sin escribir):
 *   node scripts/reconcile-split3-hungary.mjs --dry-run
 *
 * Uso autenticado (aplica en Firestore con rol admin):
 *   node scripts/reconcile-split3-hungary.mjs --email <CORREO> --password <PASSWORD>
 *   o
 *   node scripts/reconcile-split3-hungary.mjs --token <ID_TOKEN>
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signInWithCustomToken } from "firebase/auth";
import {
  initializeFirestore, doc, getDoc, getDocs, collection, runTransaction, serverTimestamp, increment
} from "firebase/firestore";
import { readFileSync } from "fs";

const config = JSON.parse(readFileSync(new URL("../firebase-applet-config.json", import.meta.url), "utf8"));
const app = initializeApp(config);
const auth = getAuth(app);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

const args = process.argv.slice(2);
const getArg = flag => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
};
const isDryRun = args.includes("--dry-run") || (!getArg("--email") && !getArg("--token"));
const email = getArg("--email");
const password = getArg("--password");
const token = getArg("--token");

async function authenticate() {
  if (isDryRun) {
    console.log("ℹ Modo solo lectura (dry-run). No se realizarán escrituras.\n");
    return null;
  }
  if (email && password) {
    console.log(`🔑 Autenticando como ${email}...`);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log(`✓ Autenticado correctamente (UID: ${cred.user.uid})\n`);
    return cred.user;
  }
  if (token) {
    console.log("🔑 Autenticando con token...");
    const cred = await signInWithCustomToken(auth, token);
    console.log(`✓ Autenticado correctamente (UID: ${cred.user.uid})\n`);
    return cred.user;
  }
  throw new Error("Faltan credenciales de administrador (--email y --password o --token).");
}

async function run() {
  const user = await authenticate();

  console.log("📊 Leyendo estado actual de Split 3 en Firestore...");
  const splitRef = doc(db, "splits", "split_3");
  const splitSnap = await getDoc(splitRef);
  if (!splitSnap.exists()) throw new Error("No existe split_3 en Firestore.");

  const teamsSnap = await getDocs(collection(db, "splits/split_3/equipos"));
  const hungriaRef = doc(db, "splits/split_3/circuitos", "hungria");
  const hungriaSnap = await getDoc(hungriaRef);
  if (!hungriaSnap.exists()) throw new Error("No existe el circuito de Hungría en split_3.");

  const hungriaData = hungriaSnap.data();
  console.log(`   Circuito: ${hungriaData.nombre || "Hungría"} (Completado: ${hungriaData.completado}, Acta: ${hungriaData.acta_cerrada}, Econ procesada: ${hungriaData.economia_procesada})`);

  console.log("\n📋 Plan de reconciliación:");
  console.log("  1. Rivalidad Dani vs Mesa: Añadir como Grupo 4 (dúo) en split_3.");
  console.log("  2. Ajuste pre-carrera Alfa Romero: 50.0M → 47.0M (-3.0M por carrera limpia en Hungría).");
  console.log("  3. Precios de fichajes Alfa Romero: Carlos 21.2M, Dani 21.2M, Mimic 50.2M.");
  console.log("  4. Liquidación Hungría:");
  console.log("     - Zenith:      36.3M + 17.5M = 53.8M  (Puntos 2.5 + Pole 2 + VR 1 + Part 4 + Rivalidades 8)");
  console.log("     - Roses:       50.0M +  7.9M = 57.9M  (Puntos 0.4 + Part 4 + Limpio 3 + Rivalidades 0.5)");
  console.log("     - Alfa Romero: 47.0M + 19.1M = 66.1M  (Puntos 4.1 + Part 4 + Limpio 3 + Rivalidades 8)");

  if (isDryRun) {
    console.log("\n⚠ Para ejecutar esta reconciliación en Firestore, ejecuta:");
    console.log("   node scripts/reconcile-split3-hungary.mjs --email TU_CORREO_ADMIN --password TU_PASSWORD");
    console.log("o pásale tu token con --token.");
    process.exit(0);
  }

  console.log("\n🚀 Ejecutando transacción atómica en Firestore...");
  const operationId = `reconciliacion_split3_hungria_${Date.now()}`;

  await runTransaction(db, async transaction => {
    // 1. Lecturas
    const [freshSplit, freshHungria, freshAlfa, freshRoses, freshZenith] = await Promise.all([
      transaction.get(splitRef),
      transaction.get(hungriaRef),
      transaction.get(doc(db, "splits/split_3/equipos", "equipo_alfa_romero")),
      transaction.get(doc(db, "splits/split_3/equipos", "equipo_roses")),
      transaction.get(doc(db, "splits/split_3/equipos", "equipo_zenith")),
    ]);

    if (freshHungria.data()?.economia_procesada) {
      throw new Error("Hungría ya tiene la economía procesada en Firestore.");
    }

    // 2. Grupos de rivalidades
    const manualGroups = [
      { id: "rivalidad_1791128409696", pilotoIds: ["piloto_fabi", "piloto_mimic", "piloto_jose"] },
      { id: "rivalidad_1791128417974", pilotoIds: ["piloto_moles", "piloto_pinilla", "piloto_jota"] },
      { id: "rivalidad_1791128429416", pilotoIds: ["piloto_pabliyo", "piloto_carlos", "piloto_aparicio"] },
      { id: "rivalidad_dani_mesa", pilotoIds: ["piloto_dani", "piloto_mesa"] },
    ];

    const equipoNombreMap = {
      equipo_zenith: "Zenith",
      equipo_roses: "Roses",
      equipo_alfa_romero: "Alfa Romero",
    };

    const pilotDataMap = {
      piloto_fabi: { nombre: "Fabi", equipoId: "equipo_zenith", price: 70 },
      piloto_mimic: { nombre: "Mimic", equipoId: "equipo_alfa_romero", price: 50.2 },
      piloto_jose: { nombre: "Jose", equipoId: "equipo_roses", price: 75 },
      piloto_moles: { nombre: "Moles", equipoId: "equipo_zenith", price: 36.6 },
      piloto_pinilla: { nombre: "Pinilla", equipoId: "equipo_alfa_romero", price: 22.6 },
      piloto_jota: { nombre: "Jota", equipoId: "equipo_roses", price: 75 },
      piloto_pabliyo: { nombre: "Pabliyo", equipoId: "equipo_zenith", price: 15.2 },
      piloto_carlos: { nombre: "Carlos", equipoId: "equipo_alfa_romero", price: 21.2 },
      piloto_aparicio: { nombre: "Aparicio", equipoId: "equipo_roses", price: -24.1 },
      piloto_dani: { nombre: "Dani", equipoId: "equipo_alfa_romero", price: 21.2 },
      piloto_mesa: { nombre: "Mesa", equipoId: "equipo_roses", price: -60 },
    };

    const derivedGroups = manualGroups.map(group => {
      const members = group.pilotoIds.map(pId => ({
        id: pId,
        nombre: pilotDataMap[pId]?.nombre || pId,
        equipoId: pilotDataMap[pId]?.equipoId || "",
        equipoNombre: equipoNombreMap[pilotDataMap[pId]?.equipoId] || "",
        price: pilotDataMap[pId]?.price || 0,
        rating: 70, puntos_piloto: 0, statusRank: 0,
      }));
      return {
        id: group.id,
        type: members.length === 2 ? "pair" : "triad",
        statusRank: 0,
        members,
        groupScore: 70,
      };
    });

    transaction.update(splitRef, {
      rivalidades_manual: manualGroups,
      rivalries: {
        splitId: "split_3",
        pairCount: 1,
        coeficiente: 1,
        totalPilotos: 11,
        rivalidades: [],
        groups: derivedGroups,
        soloPilots: [],
      },
    });

    // 3. Precios de pilotos de Alfa Romero
    const pilotUpdates = [
      { id: "piloto_carlos", price: 21.2 },
      { id: "piloto_dani", price: 21.2 },
      { id: "piloto_mimic", price: 50.2 },
    ];
    for (const pu of pilotUpdates) {
      transaction.update(doc(db, "splits/split_3/equipos/equipo_alfa_romero/pilotos", pu.id), {
        precio_compra: pu.price,
        precio_ajuste_revision: increment(1),
      });
    }

    // 4. Saldo pre-carrera Alfa Romero y liquidación de Hungría
    transaction.update(doc(db, "splits/split_3/equipos", "equipo_alfa_romero"), {
      presupuesto: 66.1, // 47.0M pre-carrera + 19.1M Hungría
    });
    transaction.update(doc(db, "splits/split_3/equipos", "equipo_roses"), {
      presupuesto: 57.9, // 50.0M pre-carrera + 7.9M Hungría
    });
    transaction.update(doc(db, "splits/split_3/equipos", "equipo_zenith"), {
      presupuesto: 53.8, // 36.3M pre-carrera + 17.5M Hungría
    });

    // 5. Hungría completada y procesada
    transaction.update(hungriaRef, {
      economia_procesada: true,
      acta_cerrada: true,
      completado: true,
    });

    // 6. Auditoría y transacciones
    transaction.set(doc(db, "admin_audit", operationId), {
      action: "economy.reconciliation_split3_hungria",
      summary: "Conciliación oficial de Split 3 y liquidación de Hungría según hoja 2026",
      actorUid: user.uid,
      createdAt: serverTimestamp(),
      balances: [
        { team: "Zenith", pre: 36.3, race: 17.5, post: 53.8 },
        { team: "Roses", pre: 50.0, race: 7.9, post: 57.9 },
        { team: "Alfa Romero", pre: 47.0, race: 19.1, post: 66.1 },
      ],
    });

    transaction.set(doc(db, "transacciones", `${operationId}_hungria_alfa`), {
      splitId: "split_3", circuitoId: "hungria", equipoId: "equipo_alfa_romero", equipo: "Alfa Romero",
      tipo: "premio_carrera", cantidad: 19.1, esIngreso: true, carrera: "Hungría",
      descripcion: "Premios Hungría: 4.1M puntos + 4M participación + 3M limpio + 8M rivalidad (Mimic 2, Pinilla 1.5, Carlos 1.5, Dani 3)",
      fecha: serverTimestamp(),
    });
    transaction.set(doc(db, "transacciones", `${operationId}_hungria_roses`), {
      splitId: "split_3", circuitoId: "hungria", equipoId: "equipo_roses", equipo: "Roses",
      tipo: "premio_carrera", cantidad: 7.9, esIngreso: true, carrera: "Hungría",
      descripcion: "Premios Hungría: 0.4M puntos + 4M participación + 3M limpio + 0.5M rivalidad (Jose 0.5)",
      fecha: serverTimestamp(),
    });
    transaction.set(doc(db, "transacciones", `${operationId}_hungria_zenith`), {
      splitId: "split_3", circuitoId: "hungria", equipoId: "equipo_zenith", equipo: "Zenith",
      tipo: "premio_carrera", cantidad: 17.5, esIngreso: true, carrera: "Hungría",
      descripcion: "Premios Hungría: 2.5M puntos + 2M pole + 1M VR + 4M participación + 8M rivalidad (Fabi 2, Moles 3, Pabliyo 3)",
      fecha: serverTimestamp(),
    });
  });

  console.log("✓ Transacción confirmada en Firestore!");

  // Verificación leyendo de nuevo
  const [vZenith, vRoses, vAlfa, vHungria] = await Promise.all([
    getDoc(doc(db, "splits/split_3/equipos", "equipo_zenith")),
    getDoc(doc(db, "splits/split_3/equipos", "equipo_roses")),
    getDoc(doc(db, "splits/split_3/equipos", "equipo_alfa_romero")),
    getDoc(hungriaRef),
  ]);

  console.log("\n🏁 Estado final verificado en Firestore:");
  console.log(`   Zenith:      ${vZenith.data().presupuesto}M (Esperado: 53.8M)`);
  console.log(`   Roses:       ${vRoses.data().presupuesto}M (Esperado: 57.9M)`);
  console.log(`   Alfa Romero: ${vAlfa.data().presupuesto}M (Esperado: 66.1M)`);
  console.log(`   Hungría econ_procesada: ${vHungria.data().economia_procesada}`);
  console.log("\n✨ Reconciliación completada con éxito.");
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});

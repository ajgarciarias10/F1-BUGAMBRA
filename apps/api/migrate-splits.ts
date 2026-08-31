import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, writeBatch } from "firebase/firestore";
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";

const config = JSON.parse(await readFile("/home/tonipuccino/Documentos/F1-BUGAMBRA/firebase-applet-config.json", "utf8"));
const db = getFirestore(initializeApp(config), config.firestoreDatabaseId);

const wb = new ExcelJS.Workbook();
await wb.xlsx.load(await readFile("/tmp/opencode/f1-bugambra-control-latest.xlsx") as never);
const ws = wb.getWorksheet("2026")!;

function cellVal(row: number, col: string) {
  const v = ws.getCell(`${col}${row}`).value;
  if (typeof v === "object" && v && "result" in v) return v.result;
  return v;
}

function cellFormula(row: number, col: string) {
  const v = ws.getCell(`${col}${row}`).value;
  if (typeof v === "object" && v && "formula" in v) return v.formula;
  return null;
}

const split1Races = ["Australia", "China", "Japón", "Arabia Saudí", "Miami", "Barein"];
const split2Races = ["Canadá", "Mónaco", "Barcelona", "Austria", "Gran Bretaña", "Bélgica"];
const split3Races = ["Hungría", "Paises Bajos", "Italia", "España", "Azerbayán", "Singapur"];

const driverRows = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

interface DriverExcelData {
  name: string;
  split1: Record<string, number>;
  split1Total: number;
  split1Team: string;
  split2: Record<string, number>;
  split2Total: number;
  split2Team: string;
  split3Team: string;
}

const driversData: DriverExcelData[] = [];

for (const row of driverRows) {
  const name = String(cellVal(row, "C") || "").trim();
  if (!name || name === "Dani") continue;

  const s1Team = String(cellVal(row, "D") || "").trim();
  const s1Points: Record<string, number> = {};
  ["E", "F", "G", "H", "I", "J"].forEach((col, i) => {
    const v = cellVal(row, col);
    s1Points[split1Races[i]] = typeof v === "number" ? v : 0;
  });
  const s1Total = cellVal(row, "K");
  
  const s2Team = String(cellVal(row, "M") || "").trim();
  const s2Points: Record<string, number> = {};
  ["N", "O", "P", "Q", "R", "S"].forEach((col, i) => {
    const v = cellVal(row, col);
    s2Points[split2Races[i]] = typeof v === "number" ? v : 0;
  });
  const s2Total = cellVal(row, "T");
  
  const s3Team = String(cellVal(row, "W") || "").trim();

  driversData.push({
    name,
    split1: s1Points,
    split1Total: typeof s1Total === "number" ? s1Total : 0,
    split1Team: s1Team,
    split2: s2Points,
    split2Total: typeof s2Total === "number" ? s2Total : 0,
    split2Team: s2Team,
    split3Team: s3Team,
  });
}

console.log("=== DRIVERS EXCEL DATA ===");
driversData.forEach(d => {
  console.log(`${d.name}: S1=${d.split1Total} (${d.split1Team}) | S2=${d.split2Total} (${d.split2Team}) | S3=${d.split3Team}`);
});

const teamRows = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

interface TeamExcelData {
  name: string;
  split1Points: Record<string, number>;
  split1Total: number;
  split2Points: Record<string, number>;
  split2Total: number;
}

const teamsData: TeamExcelData[] = [];

for (const row of teamRows) {
  const name = String(cellVal(row, "C") || "").trim();
  if (!name || name === "Escudería" || name === "RIVALIDADES") continue;

  const s1Points: Record<string, number> = {};
  ["D", "E", "F", "G", "H", "I"].forEach((col, i) => {
    const v = cellVal(row, col);
    s1Points[split1Races[i]] = typeof v === "number" ? v : 0;
  });
  const s1Total = cellVal(row, "J");

  const s2Points: Record<string, number> = {};
  ["K", "L", "M", "N", "O", "P"].forEach((col, i) => {
    const v = cellVal(row, col);
    s2Points[split2Races[i]] = typeof v === "number" ? v : 0;
  });
  const s2Total = cellVal(row, "Q");

  teamsData.push({
    name,
    split1Points: s1Points,
    split1Total: typeof s1Total === "number" ? s1Total : 0,
    split2Points: s2Points,
    split2Total: typeof s2Total === "number" ? s2Total : 0,
  });
}

console.log("\n=== TEAMS EXCEL DATA ===");
teamsData.forEach(t => {
  console.log(`${t.name}: S1=${t.split1Total} | S2=${t.split2Total}`);
});

function mapTeamName(excelName: string): string {
  if (excelName.includes("Zenith")) return "zenith";
  if (excelName.includes("Alfa")) return "alfa_romero";
  if (excelName.includes("Roses")) return "roses";
  return excelName.toLowerCase().replace(/\s+/g, "_");
}

function mapDriverName(excelName: string): string {
  const clean = excelName.replace(/★★?/, "").trim();
  const map: Record<string, string> = {
    "Jose": "piloto_jose",
    "Mimic": "piloto_mimic",
    "Jota": "piloto_jota",
    "Carlos": "LQ5zKvxBVwe1ms4NQSQvwrXv9D82",
    "Moles": "piloto_moles",
    "Pabliyo": "piloto_pabliyo",
    "Fabi": "piloto_fabi",
    "Toni": "piloto_toni",
    "Pinilla": "piloto_pinilla",
    "Samu": "piloto_samu",
    "Aparicio": "piloto_aparicio",
    "Mesa": "SqjSNT3enYfDHYlRguzHvHS9qqU2",
  };
  return map[clean] || clean.toLowerCase().replace(/\s+/g, "_");
}

const batch = writeBatch(db);

console.log("\n=== UPDATING SPLIT 1 ===");
for (const d of driversData) {
  const driverId = mapDriverName(d.name);
  const teamId = mapTeamName(d.split1Team);
  const ref = doc(db, `splits/split_1/equipos/${teamId}/pilotos`, driverId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const existing = snap.data();
    batch.update(ref, {
      puntos_piloto: d.split1Total,
      victorias: Object.values(d.split1).filter(v => v === 25).length,
      podios: Object.values(d.split1).filter(v => v >= 15 && v <= 18).length,
      poles: Object.values(d.split1).filter(v => v === 2).length,
    });
    console.log(`  ${d.name} (${teamId}): ${d.split1Total} pts`);
  }
}

for (const t of teamsData) {
  const teamId = mapTeamName(t.name);
  const ref = doc(db, `splits/split_1/equipos`, teamId);
  batch.update(ref, { puntos_constructores: t.split1Total });
  console.log(`  Team ${t.name}: ${t.split1Total} pts`);
}

const split1Ref = doc(db, "splits/split_1");
batch.update(split1Ref, { activo: false, completado: true, fichajes_abiertos: false });

console.log("\n=== UPDATING SPLIT 2 ===");
for (const d of driversData) {
  const driverId = mapDriverName(d.name);
  const teamId = mapTeamName(d.split2Team);
  const ref = doc(db, `splits/split_2/equipos/${teamId}/pilotos`, driverId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    batch.update(ref, {
      puntos_piloto: d.split2Total,
      victorias: Object.values(d.split2).filter(v => v === 25).length,
      podios: Object.values(d.split2).filter(v => v >= 15 && v <= 18).length,
      poles: Object.values(d.split2).filter(v => v === 2).length,
    });
    console.log(`  ${d.name} (${teamId}): ${d.split2Total} pts`);
  }
}

for (const t of teamsData) {
  const teamId = mapTeamName(t.name);
  const ref = doc(db, `splits/split_2/equipos`, teamId);
  batch.update(ref, { puntos_constructores: t.split2Total });
  console.log(`  Team ${t.name}: ${t.split2Total} pts`);
}

const split2Ref = doc(db, "splits/split_2");
batch.update(split2Ref, { 
  activo: false, 
  completado: true, 
  fichajes_abiertos: false,
  circuitos: {
    Belgica: { completado: true, acta_cerrada: true, economia_procesada: true }
  }
});

console.log("\n=== SETTING UP SPLIT 3 ===");
const split3TeamDrivers: Record<string, DriverExcelData[]> = {};
for (const d of driversData) {
  if (!d.split3Team || d.split3Team === "null") continue;
  const teamId = mapTeamName(d.split3Team);
  if (!split3TeamDrivers[teamId]) split3TeamDrivers[teamId] = [];
  split3TeamDrivers[teamId].push(d);
}

for (const [teamId, drivers] of Object.entries(split3TeamDrivers)) {
  const teamRef = doc(db, `splits/split_3/equipos`, teamId);
  batch.set(teamRef, {
    nombre: teamId === "zenith" ? "Zenith" : teamId === "alfa_romero" ? "Alfa Romero" : "Roses",
    presupuesto: 0,
    puntos_constructores: 0,
    jeque_id: "",
  }, { merge: true });

  for (const d of drivers) {
    const driverId = mapDriverName(d.name);
    const pilotRef = doc(db, `splits/split_3/equipos/${teamId}/pilotos`, driverId);
    batch.set(pilotRef, {
      pilotoId: driverId,
      nombre: d.name,
      equipoId: teamId,
      puntos_piloto: 0,
      rating_piloto: d.name === "Jose" ? 95 : d.name === "Mimic" ? 95 : d.name === "Jota" ? 96 : 
                     d.name === "Carlos" ? 70 : d.name === "Moles" ? 84 : d.name === "Pabliyo" ? 67 :
                     d.name === "Fabi" ? 96 : d.name === "Toni" ? 82 : d.name === "Pinilla" ? 65 :
                     d.name === "Samu" ? 71 : d.name === "Aparicio" ? 50 : d.name === "Mesa" ? 70 : 70,
      victorias: 0,
      podios: 0,
      poles: 0,
      dnfs: 0,
      carreras_limpias: 0,
      precio_compra_split: 0,
      mantener_actual: 0,
      clausula_actual: 0,
      precio_carrera_anterior: 0,
      tipo_fichaje: "mantener",
      congelado: false,
    });
    console.log(`  ${d.name} -> ${teamId}`);
  }
}

const split3Ref = doc(db, "splits/split_3");
batch.update(split3Ref, { 
  activo: true, 
  completado: false, 
  fichajes_abiertos: true 
});

for (const race of split3Races) {
  const raceId = race.toLowerCase().replace(/[^a-z0-9]/g, "");
  const raceRef = doc(db, `splits/split_3/circuitos`, raceId);
  batch.set(raceRef, {
    nombre: race,
    completado: false,
    acta_cerrada: false,
    economia_procesada: false,
    resultados: [],
    numero_carrera: split1Races.length + split2Races.length + split3Races.indexOf(race) + 1,
  });
}

console.log("\n=== COMMITTING ===");
await batch.commit();
console.log("✅ Migración completada");
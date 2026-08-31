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
  let s1Total = 0;
  ["E", "F", "G", "H", "I", "J"].forEach((col, i) => {
    const v = cellVal(row, col);
    const pts = typeof v === "number" ? v : 0;
    s1Points[split1Races[i]] = pts;
    s1Total += pts;
  });
  
  const s2Team = String(cellVal(row, "L") || "").trim();
  const s2Points: Record<string, number> = {};
  let s2Total = 0;
  ["N", "O", "P", "Q", "R", "S"].forEach((col, i) => {
    const v = cellVal(row, col);
    const pts = typeof v === "number" ? v : 0;
    s2Points[split2Races[i]] = pts;
    s2Total += pts;
  });
  
  const s3Team = String(cellVal(row, "U") || "").trim();

  driversData.push({
    name,
    split1: s1Points,
    split1Total: s1Total,
    split1Team: s1Team,
    split2: s2Points,
    split2Total: s2Total,
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
  let s1Total = 0;
  // Split 1 races: E=Australia, F=China, G=Japón, H=Arabia Saudí, I=Miami, J=Barein (not shown, use total)
  ["E", "F", "G", "H", "I"].forEach((col, i) => {
    const v = cellVal(row, col);
    const pts = typeof v === "number" ? v : 0;
    s1Points[split1Races[i]] = pts;
    s1Total += pts;
  });
  // Split 1 total is in column K
  const s1TotalFromExcel = cellVal(row, "K");
  s1Total = typeof s1TotalFromExcel === "number" ? s1TotalFromExcel : s1Total;

  const s2Points: Record<string, number> = {};
  let s2Total = 0;
  // Split 2 races: N=Canadá, O=Mónaco, P=Barcelona, Q=Austria, R=Gran Bretaña, S=Bélgica (not shown, use total)
  ["N", "O", "P", "Q", "R"].forEach((col, i) => {
    const v = cellVal(row, col);
    const pts = typeof v === "number" ? v : 0;
    s2Points[split2Races[i]] = pts;
    s2Total += pts;
  });
  // Split 2 total is in column S
  const s2TotalFromExcel = cellVal(row, "S");
  s2Total = typeof s2TotalFromExcel === "number" ? s2TotalFromExcel : s2Total;

  teamsData.push({
    name,
    split1Points: s1Points,
    split1Total: s1Total,
    split2Points: s2Points,
    split2Total: s2Total,
  });
}

console.log("\n=== TEAMS EXCEL DATA ===");
const teamTotals: Record<string, { split1: number; split2: number }> = {};

for (const t of teamsData) {
  const baseName = mapTeamName(t.name);
  if (!teamTotals[baseName]) teamTotals[baseName] = { split1: 0, split2: 0 };
  teamTotals[baseName].split1 += t.split1Total;
  teamTotals[baseName].split2 += t.split2Total;
}

const teamsDataAggregated = Object.entries(teamTotals).map(([name, totals]) => ({
  name,
  split1Total: totals.split1,
  split2Total: totals.split2,
}));

teamsDataAggregated.forEach(t => {
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

function computeRacePositions(pointsByDriver: Record<string, number>): Record<string, number> {
  const entries = Object.entries(pointsByDriver)
    .filter(([, pts]) => pts > 0)
    .sort((a, b) => b[1] - a[1]);
  const positions: Record<string, number> = {};
  let pos = 1;
  for (const [driverId, pts] of entries) {
    positions[driverId] = pos;
    pos++;
  }
  return positions;
}

async function updateCircuitResults(splitId: string, raceName: string, driversPoints: DriverExcelData[], splitKey: "split1" | "split2", raceIndex: number) {
  const raceId = raceName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const circuitRef = doc(db, `splits/${splitId}/circuitos`, raceId);
  const circuitSnap = await getDoc(circuitRef);
  
  const pointsByDriver: Record<string, number> = {};
  const teamByDriver: Record<string, string> = {};
  const driverNames: Record<string, string> = {};
  
  for (const d of driversPoints) {
    const driverId = mapDriverName(d.name);
    const pts = d[splitKey][raceName];
    if (pts && pts > 0) {
      pointsByDriver[driverId] = pts;
      teamByDriver[driverId] = mapTeamName(d[splitKey + "Team"]);
      driverNames[driverId] = d.name;
    }
  }
  
  const positions = computeRacePositions(pointsByDriver);
  
  const resultados = Object.entries(pointsByDriver).map(([driverId, pts]) => ({
    pilotoId: driverId,
    pilotoNombre: driverNames[driverId],
    equipoId: teamByDriver[driverId],
    racePos: positions[driverId],
    qualyPos: 99,
    isDnfOwnError: false,
    isClean: true,
    overtakesBoost: false,
    isDotd: false,
    isMvp: false,
    fastestLap: false,
    points: pts,
  })).sort((a, b) => a.racePos - b.racePos);
  
  const baseRaceNum = splitId === "split_1" ? 0 : 6;
  
  if (circuitSnap.exists()) {
    batch.update(circuitRef, { 
      completado: true, 
      acta_cerrada: true, 
      economia_procesada: true,
      resultados 
    });
  } else {
    batch.set(circuitRef, {
      nombre: raceName,
      completado: true,
      acta_cerrada: true,
      economia_procesada: true,
      resultados,
      numero_carrera: baseRaceNum + raceIndex + 1,
    });
  }
  console.log(`  Circuito ${raceName}: ${resultados.length} resultados`);
}

console.log("\n=== UPDATING SPLIT 1 ===");
for (const d of driversData) {
  const driverId = mapDriverName(d.name);
  const teamId = mapTeamName(d.split1Team);
  const ref = doc(db, `splits/split_1/equipos/${teamId}/pilotos`, driverId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    batch.update(ref, {
      puntos_piloto: d.split1Total,
      victorias: Object.values(d.split1).filter(v => v === 25).length,
      podios: Object.values(d.split1).filter(v => v >= 15 && v <= 18).length,
      poles: Object.values(d.split1).filter(v => v === 2).length,
    });
    console.log(`  ${d.name} (${teamId}): ${d.split1Total} pts`);
  }
}

for (const t of teamsDataAggregated) {
  const teamId = t.name;
  const ref = doc(db, `splits/split_1/equipos`, teamId);
  batch.update(ref, { puntos_constructores: t.split1Total });
  console.log(`  Team ${t.name}: ${t.split1Total} pts`);
}

for (let i = 0; i < split1Races.length; i++) {
  await updateCircuitResults("split_1", split1Races[i], driversData, "split1", i);
}

const split1Ref = doc(db, "splits/split_1");
batch.update(split1Ref, { activo: false, completado: true, fichajes_abiertos: false });

console.log("\n=== UPDATING SPLIT 2 ===");
for (const d of driversData) {
  if (!d.split2Team) continue; // Skip drivers without team in split 2
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

for (const t of teamsDataAggregated) {
  const teamId = t.name;
  const ref = doc(db, `splits/split_2/equipos`, teamId);
  batch.update(ref, { puntos_constructores: t.split2Total });
  console.log(`  Team ${t.name}: ${t.split2Total} pts`);
}

for (let i = 0; i < split2Races.length; i++) {
  await updateCircuitResults("split_2", split2Races[i], driversData.filter(d => d.split2Team), "split2", i);
}

const split2Ref = doc(db, "splits/split_2");
batch.update(split2Ref, { 
  activo: false, 
  completado: true, 
  fichajes_abiertos: false 
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
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, writeBatch } from "firebase/firestore";
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

const split1Races = ["Australia", "China", "Japón", "Arabia Saudí", "Miami", "Barein"];
const split2Races = ["Canadá", "Mónaco", "Barcelona", "Austria", "Gran Bretaña", "Bélgica"];
const split3Races = ["Hungría", "Paises Bajos", "Italia", "España", "Azerbayán", "Singapur"];

interface DriverData {
  name: string;
  s1Team: string;
  s1Points: Record<string, number>;
  s1Total: number;
  s2Team: string;
  s2Points: Record<string, number>;
  s2Total: number;
  s3Team: string;
}

const drivers: DriverData[] = [];

// Pilotos rows 2-14 (C2:C14)
for (let row = 2; row <= 14; row++) {
  const name = String(cellVal(row, "C") || "").trim().replace(/★★?/, "");
  if (!name || name === "Dani") continue;

  // Split 1: E=equipo, G-L=puntos por carrera, M=total
  const s1TeamRaw = String(cellVal(row, "E") || "").trim();
  const s1Points: Record<string, number> = {};
  let s1Total = 0;
  ["G", "H", "I", "J", "K", "L"].forEach((col, i) => {
    const v = cellVal(row, col);
    const pts = typeof v === "number" ? v : 0;
    s1Points[split1Races[i]] = pts;
    s1Total += pts;
  });
  const mVal = cellVal(row, "M");
  if (typeof mVal === "number") s1Total = mVal;

  // Split 2: N=equipo, P-U=puntos por carrera, V=total
  const s2TeamRaw = String(cellVal(row, "N") || "").trim();
  const s2Points: Record<string, number> = {};
  let s2Total = 0;
  ["P", "Q", "R", "S", "T", "U"].forEach((col, i) => {
    const v = cellVal(row, col);
    const pts = typeof v === "number" ? v : 0;
    s2Points[split2Races[i]] = pts;
    s2Total += pts;
  });
  const vVal = cellVal(row, "V");
  if (typeof vVal === "number") s2Total = vVal;

  // Split 3: W=equipo (no points yet)
  const s3TeamRaw = String(cellVal(row, "W") || "").trim();

  drivers.push({
    name,
    s1Team: s1TeamRaw,
    s1Points,
    s1Total,
    s2Team: s2TeamRaw,
    s2Points,
    s2Total,
    s3Team: s3TeamRaw,
  });
}

console.log("=== DRIVERS ===");
drivers.forEach(d => console.log(`${d.name}: S1=${d.s1Total}(${d.s1Team}) S2=${d.s2Total}(${d.s2Team}) S3=${d.s3Team}`));

// Equipos: rows 21-32 (4 per team)
// Split 1: M=total, G-L=por carrera
// Split 2: V=total, P-U=por carrera  
// Split 3: AE=total, Y-AD=por carrera

interface TeamTotals {
  split1: number;
  split2: number;
  split3: number;
}

const teamTotals: Record<string, TeamTotals> = { zenith: {split1: 0, split2: 0, split3: 0}, alfa_romero: {split1: 0, split2: 0, split3: 0}, roses: {split1: 0, split2: 0, split3: 0} };
const teamSeen: Record<string, boolean> = { zenith: false, alfa_romero: false, roses: false };

for (let row = 21; row <= 32; row++) {
  const nameRaw = String(cellVal(row, "C") || "").trim();
  if (!nameRaw || nameRaw === "Escudería" || nameRaw === "RIVALIDADES") continue;
  
  let teamKey = "";
  if (nameRaw.includes("Zenith")) teamKey = "zenith";
  else if (nameRaw.includes("Alfa")) teamKey = "alfa_romero";
  else if (nameRaw.includes("Roses")) teamKey = "roses";
  if (!teamKey) continue;

  // Solo tomar la primera fila de cada equipo (evitar duplicar x4)
  if (teamSeen[teamKey]) continue;
  teamSeen[teamKey] = true;

  const mVal = cellVal(row, "M");
  if (typeof mVal === "number") teamTotals[teamKey].split1 = mVal;

  const vVal = cellVal(row, "V");
  if (typeof vVal === "number") teamTotals[teamKey].split2 = vVal;

  const aeVal = cellVal(row, "AE");
  if (typeof aeVal === "number") teamTotals[teamKey].split3 = aeVal;
}

console.log("\n=== TEAM TOTALS ===");
Object.entries(teamTotals).forEach(([k, v]) => console.log(`${k}: S1=${v.split1} S2=${v.split2} S3=${v.split3}`));

function mapDriverId(name: string): string {
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
  return map[name] || name.toLowerCase().replace(/\s+/g, "_");
}

function mapTeamName(raw: string): string {
  if (raw.includes("Zenith")) return "zenith";
  if (raw.includes("Alfa")) return "alfa_romero";
  if (raw.includes("Roses")) return "roses";
  return raw.toLowerCase().replace(/\s+/g, "_");
}

function computePositions(pointsByDriver: Record<string, number>): Record<string, number> {
  const entries = Object.entries(pointsByDriver)
    .filter(([, pts]) => pts > 0)
    .sort((a, b) => b[1] - a[1]);
  const positions: Record<string, number> = {};
  let pos = 1;
  for (const [driverId, pts] of entries) {
    positions[driverId] = pos++;
  }
  return positions;
}

async function updateCircuitResults(splitId: string, raceName: string, drivers: DriverData[], splitKey: "s1" | "s2" | "s3", raceIndex: number) {
  const raceId = raceName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const circuitRef = doc(db, `splits/${splitId}/circuitos`, raceId);
  const circuitSnap = await getDoc(circuitRef);
  
  const pointsByDriver: Record<string, number> = {};
  const teamByDriver: Record<string, string> = {};
  const driverNames: Record<string, string> = {};
  
  for (const d of drivers) {
    const driverId = mapDriverId(d.name);
    const pts = d[splitKey + "Points"][raceName];
    if (pts && pts > 0) {
      pointsByDriver[driverId] = pts;
      teamByDriver[driverId] = mapTeamName(d[splitKey + "Team"]);
      driverNames[driverId] = d.name;
    }
  }
  
  const positions = computePositions(pointsByDriver);
  
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
  
  const baseRaceNum = splitId === "split_1" ? 0 : splitId === "split_2" ? 6 : 12;
  
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

const batch = writeBatch(db);

console.log("\n=== UPDATING SPLIT 1 ===");
for (const d of drivers) {
  const driverId = mapDriverId(d.name);
  const teamId = mapTeamName(d.s1Team);
  if (!teamId) continue;
  const ref = doc(db, `splits/split_1/equipos/${teamId}/pilotos`, driverId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    batch.update(ref, {
      puntos_piloto: d.s1Total,
      victorias: Object.values(d.s1Points).filter(v => v === 25).length,
      podios: Object.values(d.s1Points).filter(v => v >= 15 && v <= 18).length,
      poles: Object.values(d.s1Points).filter(v => v === 2).length,
    });
    console.log(`  ${d.name} (${teamId}): ${d.s1Total} pts`);
  }
}

for (const [teamId, totals] of Object.entries(teamTotals)) {
  const ref = doc(db, `splits/split_1/equipos`, teamId);
  batch.update(ref, { puntos_constructores: totals.split1 });
  console.log(`  Team ${teamId}: ${totals.split1} pts`);
}

for (let i = 0; i < split1Races.length; i++) {
  await updateCircuitResults("split_1", split1Races[i], drivers, "s1", i);
}

batch.update(doc(db, "splits/split_1"), { activo: false, completado: true, fichajes_abiertos: false });

console.log("\n=== UPDATING SPLIT 2 ===");
for (const d of drivers) {
  if (!d.s2Team) continue;
  const driverId = mapDriverId(d.name);
  const teamId = mapTeamName(d.s2Team);
  const ref = doc(db, `splits/split_2/equipos/${teamId}/pilotos`, driverId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    batch.update(ref, {
      puntos_piloto: d.s2Total,
      victorias: Object.values(d.s2Points).filter(v => v === 25).length,
      podios: Object.values(d.s2Points).filter(v => v >= 15 && v <= 18).length,
      poles: Object.values(d.s2Points).filter(v => v === 2).length,
    });
    console.log(`  ${d.name} (${teamId}): ${d.s2Total} pts`);
  }
}

for (const [teamId, totals] of Object.entries(teamTotals)) {
  const ref = doc(db, `splits/split_2/equipos`, teamId);
  batch.update(ref, { puntos_constructores: totals.split2 });
  console.log(`  Team ${teamId}: ${totals.split2} pts`);
}

for (let i = 0; i < split2Races.length; i++) {
  await updateCircuitResults("split_2", split2Races[i], drivers.filter(d => d.s2Team), "s2", i);
}

batch.update(doc(db, "splits/split_2"), { 
  activo: false, 
  completado: true, 
  fichajes_abiertos: false 
});

console.log("\n=== SETTING UP SPLIT 3 ===");
const s3DriversByTeam: Record<string, DriverData[]> = {};
for (const d of drivers) {
  if (!d.s3Team) continue;
  const teamId = mapTeamName(d.s3Team);
  if (!s3DriversByTeam[teamId]) s3DriversByTeam[teamId] = [];
  s3DriversByTeam[teamId].push(d);
}

for (const [teamId, teamDrivers] of Object.entries(s3DriversByTeam)) {
  const teamRef = doc(db, `splits/split_3/equipos`, teamId);
  batch.set(teamRef, {
    nombre: teamId === "zenith" ? "Zenith" : teamId === "alfa_romero" ? "Alfa Romero" : "Roses",
    presupuesto: 0,
    puntos_constructores: teamTotals[teamId]?.split3 || 0,
    jeque_id: "",
  }, { merge: true });

  for (const d of teamDrivers) {
    const driverId = mapDriverId(d.name);
    batch.set(doc(db, `splits/split_3/equipos/${teamId}/pilotos`, driverId), {
      pilotoId: driverId,
      nombre: d.name,
      equipoId: teamId,
      puntos_piloto: 0,
      rating_piloto: d.name === "Jose" ? 95 : d.name === "Mimic" ? 95 : d.name === "Jota" ? 96 : 
                     d.name === "Carlos" ? 70 : d.name === "Moles" ? 84 : d.name === "Pabliyo" ? 67 :
                     d.name === "Fabi" ? 96 : d.name === "Toni" ? 82 : d.name === "Pinilla" ? 65 :
                     d.name === "Samu" ? 71 : d.name === "Aparicio" ? 50 : d.name === "Mesa" ? 70 : 70,
      victorias: 0, podios: 0, poles: 0, dnfs: 0, carreras_limpias: 0,
      precio_compra_split: 0, mantener_actual: 0, clausula_actual: 0, precio_carrera_anterior: 0,
      tipo_fichaje: "mantener", congelado: false,
    });
    console.log(`  ${d.name} -> ${teamId}`);
  }
}

for (const [teamId, totals] of Object.entries(teamTotals)) {
  const ref = doc(db, `splits/split_3/equipos`, teamId);
  batch.update(ref, { puntos_constructores: totals.split3 || 0 });
}

batch.update(doc(db, "splits/split_3"), { 
  activo: true, 
  completado: false, 
  fichajes_abiertos: true 
});

for (let i = 0; i < split3Races.length; i++) {
  const raceName = split3Races[i];
  const raceId = raceName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const raceRef = doc(db, `splits/split_3/circuitos`, raceId);
  batch.set(raceRef, {
    nombre: raceName,
    completado: false,
    acta_cerrada: false,
    economia_procesada: false,
    resultados: [],
    numero_carrera: 12 + i + 1,
  });
}

console.log("\n=== COMMITTING ===");
await batch.commit();
console.log("✅ Migración completada correctamente");
import { useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Database, Loader2 } from "lucide-react";
import { db } from "../services/firebase";
import { collection, doc, writeBatch, getDoc, getDocs } from "firebase/firestore";
import { fetchOriginsWorkbook, normalizeOriginsName } from "../services/originsImporter";

export function AdminControlPanel() {
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState("");
  const [originsSheetUrl, setOriginsSheetUrl] = useState("");
  const [importingOrigins, setImportingOrigins] = useState(false);
  const [originsMsg, setOriginsMsg] = useState("");

  const importOrigins = async () => {
    if (!originsSheetUrl.trim()) {
      setOriginsMsg("Introduce la URL del Excel de Origins.");
      return;
    }

    setImportingOrigins(true);
    setOriginsMsg("Leyendo y validando los rangos del Excel...");
    try {
      const data = await fetchOriginsWorkbook(originsSheetUrl);
      const [pilotsSnap, currentRosterSnap, currentRacesSnap] = await Promise.all([
        getDocs(collection(db, "pilotos")),
        getDocs(collection(db, "splits/origins/roster")),
        getDocs(collection(db, "splits/origins/circuitos")),
      ]);
      const pilotIdByName = new Map<string, string>();
      pilotsSnap.docs.forEach(pilotDoc => {
        const name = String(pilotDoc.data().nombre || "");
        if (name) pilotIdByName.set(normalizeOriginsName(name), pilotDoc.id);
      });

      const resolvedPilots = data.pilots.map(pilot => {
        const normalizedName = normalizeOriginsName(pilot.name);
        const pilotId = pilotIdByName.get(normalizedName) || `piloto_${normalizedName.replace(/\s+/g, "_")}`;
        return { ...pilot, pilotId };
      });
      const nextPilotIds = new Set(resolvedPilots.map(pilot => pilot.pilotId));
      const raceIds = data.races.map(name => normalizeOriginsName(name).replace(/\s+/g, "_"));
      const nextRaceIds = new Set(raceIds);
      const batch = writeBatch(db);

      currentRosterSnap.docs.forEach(rosterDoc => {
        if (!nextPilotIds.has(rosterDoc.id)) batch.delete(rosterDoc.ref);
      });
      currentRacesSnap.docs.forEach(raceDoc => {
        if (!nextRaceIds.has(raceDoc.id)) batch.delete(raceDoc.ref);
      });

      resolvedPilots.forEach(pilot => {
        batch.set(doc(db, "pilotos", pilot.pilotId), { nombre: pilot.name }, { merge: true });
        batch.set(doc(db, "splits/origins/roster", pilot.pilotId), {
          pilotoId: pilot.pilotId,
          nombre: pilot.name,
          equipoId: "individual",
          puntos_piloto: pilot.total,
        });
      });

      data.races.forEach((raceName, raceIndex) => {
        batch.set(doc(db, "splits/origins/circuitos", raceIds[raceIndex]), {
          nombre: raceName,
          numero_carrera: raceIndex + 1,
          completado: true,
          acta_cerrada: true,
          economia_procesada: false,
          resultados: resolvedPilots.map(pilot => ({
            pilotoId: pilot.pilotId,
            pilotoNombre: pilot.name,
            puntos: pilot.racePoints[raceIndex],
          })),
          puntos_duos: data.duos.map(duo => ({ nombre: duo.name, puntos: duo.racePoints[raceIndex] })),
        });
      });

      batch.set(doc(db, "splits", "origins"), {
        nombre: "Origins",
        orden: 0,
        tipo: "individual",
        activo: false,
        completado: true,
        fichajes_abiertos: false,
        video_intro: "https://youtu.be/5OLFg1W5LzU",
        source_url: originsSheetUrl.trim(),
        imported_at: new Date().toISOString(),
        duos: data.duos.map((duo, index) => ({
          id: `duo_${index + 1}`,
          nombre: duo.name,
          puntos: duo.total,
          puntos_carreras: duo.racePoints,
        })),
      }, { merge: true });

      await batch.commit();
      setOriginsMsg(`Origins importado: ${data.pilots.length} pilotos, ${data.duos.length} dúos y ${data.races.length} carreras.`);
    } catch (err: any) {
      setOriginsMsg("Error: " + err.message);
    } finally {
      setImportingOrigins(false);
    }
  };

  const runMigration = async () => {
    if (!confirm("¿Ejecutar migración de splits? Esto actualizará:\n- split_1: puntos finales del Excel (Zenith 130, Alfa 132, Roses 185)\n- split_2: puntos finales incluyendo Bélgica (Zenith 189, Alfa 130, Roses 118)\n- split_3: activar con nuevos fichajes del Excel (Moles/Pabliyo→Zenith, Jota/Aparicio→Roses, Pinilla→Alfa)\n\n¿Continuar?")) return;

    setMigrating(true);
    setMigrateMsg("Preparando migración...");

    try {
      // Datos exactos del Excel 2026 (columnas: E=S1 team, N=S2 team, W=S3 team; M=S1 total, V=S2 total, AE=S3 total)
      const driversData = [
        { name: "Jose", s1: 87, s1Team: "zenith", s2: 68, s2Team: "zenith", s3Team: "" },
        { name: "Mimic", s1: 81, s1Team: "alfa_romero", s2: 64, s2Team: "zenith", s3Team: "" },
        { name: "Jota", s1: 70, s1Team: "roses", s2: 62, s2Team: "alfa_romero", s3Team: "roses" },
        { name: "Carlos", s1: 0, s1Team: "", s2: 54, s2Team: "zenith", s3Team: "" },
        { name: "Moles", s1: 43, s1Team: "zenith", s2: 52, s2Team: "alfa_romero", s3Team: "zenith" },
        { name: "Pabliyo", s1: 26, s1Team: "roses", s2: 49, s2Team: "roses", s3Team: "zenith" },
        { name: "Fabi", s1: 67, s1Team: "roses", s2: 43, s2Team: "roses", s3Team: "" },
        { name: "Toni", s1: 33, s1Team: "alfa_romero", s2: 16, s2Team: "roses", s3Team: "" },
        { name: "Pinilla", s1: 18, s1Team: "alfa_romero", s2: 13, s2Team: "alfa_romero", s3Team: "alfa_romero" },
        { name: "Samu", s1: 22, s1Team: "roses", s2: 10, s2Team: "roses", s3Team: "" },
        { name: "Aparicio", s1: 0, s1Team: "zenith", s2: 3, s2Team: "alfa_romero", s3Team: "roses" },
        { name: "Mesa", s1: 0, s1Team: "", s2: 3, s2Team: "zenith", s3Team: "" },
      ];

      const teamsData = [
        { name: "zenith", s1: 130, s2: 189 },
        { name: "alfa_romero", s1: 132, s2: 130 },
        { name: "roses", s1: 185, s2: 118 },
      ];

      const split1Races = ["Australia", "China", "Japón", "Arabia Saudí", "Miami", "Barein"];
      const split2Races = ["Canadá", "Mónaco", "Barcelona", "Austria", "Gran Bretaña", "Bélgica"];
      const split3Races = ["Hungría", "Paises Bajos", "Italia", "España", "Azerbayán", "Singapur"];

      const batch = writeBatch(db);

      setMigrateMsg("Actualizando split_1...");
      for (const d of driversData) {
        if (!d.s1Team) continue;
        const ref = doc(db, `splits/split_1/equipos/${d.s1Team}/pilotos`, `piloto_${d.name.toLowerCase()}`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          batch.update(ref, { puntos_piloto: d.s1 });
        }
      }
      for (const t of teamsData) {
        const ref = doc(db, `splits/split_1/equipos`, t.name);
        batch.update(ref, { puntos_constructores: t.s1 });
      }
      batch.update(doc(db, "splits/split_1"), { activo: false, completado: true, fichajes_abiertos: false });

      setMigrateMsg("Actualizando split_2...");
      for (const d of driversData) {
        if (!d.s2Team) continue;
        const ref = doc(db, `splits/split_2/equipos/${d.s2Team}/pilotos`, `piloto_${d.name.toLowerCase()}`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          batch.update(ref, { puntos_piloto: d.s2 });
        }
      }
      for (const t of teamsData) {
        const ref = doc(db, `splits/split_2/equipos`, t.name);
        batch.update(ref, { puntos_constructores: t.s2 });
      }
      batch.update(doc(db, "splits/split_2"), { 
        activo: false, 
        completado: true, 
        fichajes_abiertos: false 
      });

      setMigrateMsg("Configurando split_3...");
      const s3TeamDrivers: Record<string, typeof driversData> = {};
      for (const d of driversData) {
        if (!d.s3Team) continue;
        if (!s3TeamDrivers[d.s3Team]) s3TeamDrivers[d.s3Team] = [];
        s3TeamDrivers[d.s3Team].push(d);
      }

      for (const [teamId, drivers] of Object.entries(s3TeamDrivers)) {
        batch.set(doc(db, `splits/split_3/equipos`, teamId), {
          nombre: teamId === "zenith" ? "Zenith" : teamId === "alfa_romero" ? "Alfa Romero" : "Roses",
          presupuesto: 0,
          puntos_constructores: 0,
          jeque_id: "",
        }, { merge: true });

        for (const d of drivers) {
          batch.set(doc(db, `splits/split_3/equipos/${teamId}/pilotos`, `piloto_${d.name.toLowerCase()}`), {
            pilotoId: `piloto_${d.name.toLowerCase()}`,
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
        }
      }

      batch.update(doc(db, "splits/split_3"), { 
        activo: true, 
        completado: false, 
        fichajes_abiertos: true 
      });

      for (const race of split3Races) {
        const raceId = race.toLowerCase().replace(/[^a-z0-9]/g, "");
        batch.set(doc(db, `splits/split_3/circuitos`, raceId), {
          nombre: race,
          completado: false,
          acta_cerrada: false,
          economia_procesada: false,
          resultados: [],
          numero_carrera: split1Races.length + split2Races.length + split3Races.indexOf(race) + 1,
        });
      }

      setMigrateMsg("Escribiendo en Firestore...");
      await batch.commit();
      setMigrateMsg("✅ Migración completada correctamente");
    } catch (err: any) {
      setMigrateMsg("❌ Error: " + err.message);
      console.error(err);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <section className="bg-white/[0.03] border border-white/10 p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
      <div className="relative z-10 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-300">Control oficial</p>
              <h2 className="text-xl font-black italic tracking-tighter uppercase text-white">Excel vs PostgreSQL</h2>
            </div>
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 border border-white/10 px-3 py-2 rounded-sm">
            Solo lectura hasta confirmar diferencias
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <StatusCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            title="Referencia"
            text="El Excel conserva puntuación y economía histórica. No se modifica desde la app."
          />
          <StatusCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            title="Fuente viva"
            text="PostgreSQL debe guardar actas, revisiones y standings reconstruibles."
          />
          <StatusCard
            icon={<AlertCircle className="w-4 h-4" />}
            title="Pendiente"
            text="Conectar aquí el endpoint de conciliación para subir XLSX y ver diferencias en tabla."
          />
        </div>

        <div className="bg-black/30 border border-white/10 rounded-sm p-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-white mb-3">Flujo objetivo</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px] font-mono text-white/60">
            <Step label="1" text="Subir Excel" />
            <Step label="2" text="Comparar reglas, puntos y economía" />
            <Step label="3" text="Previsualizar diferencias" />
            <Step label="4" text="Corregir Postgres con revisión" />
          </div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-sm p-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-emerald-300 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" /> Migración automática splits 1→2→3
          </h3>
          <p className="text-xs text-emerald-300/70 mb-4">
            Cierra split_1 y split_2 con puntos finales del Excel, activa split_3 con nuevos fichajes.
            Requiere sesión de administrador.
          </p>
          <button
            onClick={runMigration}
            disabled={migrating}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-black text-[10px] uppercase tracking-widest rounded-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {migrating && <Loader2 className="w-4 h-4 animate-spin" />}
            {migrating ? "Ejecutando..." : "Ejecutar migración splits"}
          </button>
          {migrateMsg && (
            <p className={`mt-3 text-xs font-mono ${migrateMsg.includes("Error") ? "text-red-400" : "text-emerald-300"}`}>
              {migrateMsg}
            </p>
          )}
        </div>

        <div className="bg-sky-500/10 border border-sky-400/25 rounded-sm p-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-sky-200 mb-2">Importar Origins desde Google Sheets</h3>
          <p className="text-xs text-sky-100/55 mb-4">
            Lee los pilotos, puntos, dúos y seis carreras directamente desde los rangos configurados. Los totales se validan antes de escribir.
          </p>
          <div className="flex flex-col lg:flex-row gap-2">
            <input
              type="url"
              value={originsSheetUrl}
              onChange={event => setOriginsSheetUrl(event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 min-w-0 bg-black/30 border border-white/10 px-3 py-2.5 text-xs text-white outline-none focus:border-sky-400/60 font-mono"
            />
            <button
              onClick={importOrigins}
              disabled={importingOrigins || !originsSheetUrl.trim()}
              className="px-4 py-2.5 bg-sky-400/15 hover:bg-sky-400/25 border border-sky-300/30 text-sky-100 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {importingOrigins && <Loader2 className="w-4 h-4 animate-spin" />}
              {importingOrigins ? "Importando" : "Importar Excel"}
            </button>
          </div>
          {originsMsg && <p className={`mt-3 text-xs font-mono ${originsMsg.startsWith("Error") ? "text-red-300" : "text-sky-200"}`}>{originsMsg}</p>}
        </div>
      </div>
    </section>
  );
}

function StatusCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="bg-black/30 border border-white/10 rounded-sm p-4">
      <div className="flex items-center gap-2 text-emerald-300 mb-2">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest text-white">{title}</span>
      </div>
      <p className="text-xs text-white/50 leading-relaxed">{text}</p>
    </div>
  );
}

function Step({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-center gap-3 border border-white/10 bg-white/[0.02] px-3 py-3 rounded-sm">
      <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center text-[10px] font-black">
        {label}
      </span>
      <span>{text}</span>
    </div>
  );
}

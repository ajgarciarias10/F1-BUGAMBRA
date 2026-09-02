import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { db } from "../services/firebase";
import { collection, doc, writeBatch, getDocs } from "firebase/firestore";
import { fetchOriginsWorkbook, normalizeOriginsName } from "../services/originsImporter";

export function AdminControlPanel() {
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

  return (
    <section className="bg-white/[0.03] border border-white/10 p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
      <div className="relative z-10 space-y-5">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
            <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-300">Importación</p>
            <h2 className="text-xl font-black italic tracking-tighter uppercase text-white">Origins</h2>
          </div>
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



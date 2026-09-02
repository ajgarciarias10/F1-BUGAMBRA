import { useState } from "react";
import { ImageIcon, Loader2, Search } from "lucide-react";
import { getApp } from "firebase/app";
import { collection, doc, getDocs, getFirestore, writeBatch } from "firebase/firestore";
import { db } from "../services/firebase";

// Las fotos de piloto y los escudos de escudería viven en otra base de datos del mismo
// proyecto de Firebase (la de antes de la migración). Esta herramienta las trae a la base
// actual: la foto baja al catálogo global de pilotos y el escudo se replica a todos los
// splits, porque una escudería no cambia de escudo de una temporada a otra.

const BASES_CONOCIDAS = ["ai-studio-4147307b-9726-4502-a41f-213e9107e179", "(default)"];

const key = (value: string) => String(value).normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]/g, "");

const esImagen = (valor: unknown): valor is string =>
  typeof valor === "string" && valor.trim().length > 0;

type Hallazgo = { fotos: Map<string, string>; escudos: Map<string, string>; detalle: string[] };

export function MediaSyncPanel({ splits }: { splits: any[] }) {
  const [origen, setOrigen] = useState(BASES_CONOCIDAS[0]);
  const [running, setRunning] = useState(false);
  const [hallazgo, setHallazgo] = useState<Hallazgo | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const add = (line: string) => setLog(current => [...current, line]);

  // ── Lectura de la base de origen ──────────────────────────────────────────

  async function explorar(): Promise<Hallazgo> {
    const fuente = getFirestore(getApp(), origen);
    const detalle: string[] = [];
    const fotos = new Map<string, string>();
    const escudos = new Map<string, string>();

    // Las fotos pueden estar en `usuarios` (las sube cada uno en su perfil) o en `pilotos`.
    for (const coleccion of ["usuarios", "pilotos"]) {
      const snap = await getDocs(collection(fuente, coleccion));
      let encontradas = 0;
      snap.docs.forEach(docSnap => {
        const data = docSnap.data() as any;
        const foto = [data.foto_url, data.fotoUrl, data.photoURL, data.avatar_url].find(esImagen);
        if (!foto) return;
        encontradas++;
        [docSnap.id, data.piloto_id, data.uid, data.nombre, data.displayName]
          .filter(esImagen)
          .forEach(valor => { if (!fotos.has(key(valor))) fotos.set(key(valor), foto); });
      });
      detalle.push(`${coleccion}: ${snap.docs.length} documentos, ${encontradas} con foto.`);
    }

    // Los escudos están por split, así que hay que recorrer los splits de la otra base.
    const splitsSnap = await getDocs(collection(fuente, "splits"));
    let equiposConEscudo = 0;
    for (const splitDoc of splitsSnap.docs) {
      const equiposSnap = await getDocs(collection(fuente, `splits/${splitDoc.id}/equipos`));
      equiposSnap.docs.forEach(equipoDoc => {
        const data = equipoDoc.data() as any;
        const escudo = [data.logo_url, data.logoUrl, data.escudo_url].find(esImagen);
        if (!escudo) return;
        equiposConEscudo++;
        [equipoDoc.id, data.nombre]
          .filter(esImagen)
          .forEach(valor => { if (!escudos.has(key(valor))) escudos.set(key(valor), escudo); });
      });
    }
    detalle.push(`splits: ${splitsSnap.docs.length} splits, ${equiposConEscudo} equipos con escudo.`);

    return { fotos, escudos, detalle };
  }

  const buscar = async () => {
    setRunning(true);
    setLog([]);
    setHallazgo(null);
    try {
      add(`Leyendo la base «${origen}»…`);
      const encontrado = await explorar();
      encontrado.detalle.forEach(add);
      setHallazgo(encontrado);
      if (!encontrado.fotos.size && !encontrado.escudos.size) {
        add("⚠ No hay ni fotos ni escudos ahí. Prueba con la otra base del desplegable.");
      } else {
        add(`✓ ${encontrado.fotos.size} claves de foto y ${encontrado.escudos.size} de escudo. Revisa y pulsa Traer.`);
      }
    } catch (error: any) {
      add(`Error: ${error.message}`);
      add("Si es un error de permisos, esa base no deja leer con tu sesión actual.");
    } finally {
      setRunning(false);
    }
  };

  // ── Escritura en la base actual ───────────────────────────────────────────

  const traer = async () => {
    if (!hallazgo) return;
    setRunning(true);
    try {
      const batch = writeBatch(db);
      let escrituras = 0;

      const pilotosSnap = await getDocs(collection(db, "pilotos"));
      let fotosPuestas = 0;
      const sinFoto: string[] = [];

      pilotosSnap.docs.forEach(pilotoDoc => {
        const piloto = pilotoDoc.data() as any;
        const foto = hallazgo.fotos.get(key(pilotoDoc.id))
          ?? hallazgo.fotos.get(key(piloto.nombre || ""))
          // El Excel llama Alex a Mimic.
          ?? (key(piloto.nombre || "") === "mimic" ? hallazgo.fotos.get("alex") : undefined);
        if (!foto) {
          if (!esImagen(piloto.foto_url)) sinFoto.push(piloto.nombre || pilotoDoc.id);
          return;
        }
        if (piloto.foto_url === foto) return;
        batch.set(pilotoDoc.ref, { foto_url: foto }, { merge: true });
        escrituras++;
        fotosPuestas++;
      });

      add(`Fotos de piloto: ${fotosPuestas} traídas.`);
      if (sinFoto.length) add(`⚠ Siguen sin foto: ${sinFoto.join(", ")}.`);

      const splitsDestino = [...splits]
        .filter(split => split.id !== "global" && split.tipo !== "individual")
        .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0));

      let escudosPuestos = 0;
      const sinEscudo = new Set<string>();

      for (const split of splitsDestino) {
        const equiposSnap = await getDocs(collection(db, `splits/${split.id}/equipos`));
        equiposSnap.docs.forEach(equipoDoc => {
          if (equipoDoc.id === "agente_libre") return;
          const equipo = equipoDoc.data() as any;
          const nombre = equipo.nombre || equipoDoc.id;
          const escudo = hallazgo.escudos.get(key(equipoDoc.id)) ?? hallazgo.escudos.get(key(nombre));
          if (!escudo) { if (!esImagen(equipo.logo_url)) sinEscudo.add(nombre); return; }
          if (equipo.logo_url === escudo) return;
          batch.set(doc(db, `splits/${split.id}/equipos`, equipoDoc.id), { logo_url: escudo }, { merge: true });
          escrituras++;
          escudosPuestos++;
        });
      }

      add(`Escudos: ${escudosPuestos} puestos, repartidos por ${splitsDestino.length} splits.`);
      if (sinEscudo.size) add(`⚠ Siguen sin escudo: ${[...sinEscudo].join(", ")}.`);

      if (escrituras === 0) {
        add("✓ Nada que cambiar: ya estaba todo al día.");
        return;
      }

      await batch.commit();
      add(`✓ ${escrituras} documentos actualizados.`);
      setTimeout(() => window.location.reload(), 3000);
    } catch (error: any) {
      add(`Error: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="border border-white/10 bg-white/[0.03] p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-sky-500/10 text-sky-300"><ImageIcon className="w-5 h-5" /></div>
        <div>
          <h2 className="font-black uppercase tracking-tight text-lg">Fotos y escudos</h2>
          <p className="text-xs text-white/45 mt-1 max-w-2xl">
            Trae las fotos de piloto y los escudos de escudería desde la otra base de datos del
            proyecto. Primero mira qué hay, y solo escribe cuando le das a Traer. No borra nada:
            rellena lo que falta y respeta lo que ya esté puesto.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">Base de origen</span>
        <input value={origen} onChange={event => setOrigen(event.target.value)} spellCheck={false}
          list="bases-firestore"
          className="flex-1 min-w-[18rem] bg-black/40 border border-white/10 px-3 py-2 text-[11px] font-mono text-white outline-none focus:border-sky-400" />
        <datalist id="bases-firestore">
          {BASES_CONOCIDAS.map(base => <option key={base} value={base} />)}
        </datalist>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={buscar} disabled={running || !origen.trim()}
          className="inline-flex items-center gap-2 border border-white/20 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white/70 disabled:opacity-40">
          {running && !hallazgo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Ver qué hay
        </button>
        <button onClick={traer} disabled={running || !hallazgo}
          className="inline-flex items-center gap-2 border border-sky-500/40 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-sky-300 disabled:opacity-40">
          {running && hallazgo ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          Traer fotos y escudos
        </button>
      </div>

      {log.length > 0 && (
        <div className="border border-white/[0.06] bg-black/30 px-4 py-3 space-y-0.5 max-h-72 overflow-y-auto">
          {log.map((line, index) => (
            <p key={index} className={`text-[10px] font-mono ${
              line.startsWith("Error") ? "text-[#e10600]"
              : line.startsWith("⚠") ? "text-amber-300"
              : line.startsWith("✓") ? "text-emerald-400/80"
              : "text-white/45"
            }`}>{line}</p>
          ))}
        </div>
      )}
    </section>
  );
}

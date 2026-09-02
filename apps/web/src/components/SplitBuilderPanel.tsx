import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Loader2, Lock } from "lucide-react";
import {
  cerrarSplitYAbrirMercado, contarCarrerasPrevias, crearSplit, leerCierreDeSplit, slug,
  type ConfigNuevoSplit, type Destino, type EquipoAnterior, type FichaAnterior,
} from "../services/splitBuilder";
import type { TipoFichaje } from "../types";

// Cierra un bloque, abre el mercado y levanta el siguiente. Todo por configuración: antes
// cada split tenía su propio panel con los nombres a fuego y el siguiente pedía otro.

type Modo = "siguiente" | "temporada";

export function SplitBuilderPanel({ splits }: { splits: any[] }) {
  const bloques = useMemo(() => [...splits]
    .filter((s: any) => s.id !== "global" && s.tipo !== "individual")
    .sort((a: any, b: any) => Number(a.orden ?? 999) - Number(b.orden ?? 999)), [splits]);

  const ultimo = bloques[bloques.length - 1];

  const [modo, setModo] = useState<Modo>("siguiente");
  const [anteriorId, setAnteriorId] = useState(ultimo?.id ?? "");
  const [splitId, setSplitId] = useState("");
  const [nombre, setNombre] = useState("");
  const [orden, setOrden] = useState(1);
  const [temporadaId, setTemporadaId] = useState("temporada_1");
  const [circuitos, setCircuitos] = useState("");
  const [primeraCarrera, setPrimeraCarrera] = useState(1);
  const [rookies, setRookies] = useState("");
  const [presupuestoArranque, setPresupuestoArranque] = useState("100");
  const [activo, setActivo] = useState(true);
  const [fichajesAbiertos, setFichajesAbiertos] = useState(true);
  const [cerrarAnterior, setCerrarAnterior] = useState(true);

  const [equipos, setEquipos] = useState<EquipoAnterior[]>([]);
  const [fichas, setFichas] = useState<FichaAnterior[]>([]);
  const [destinos, setDestinos] = useState<Record<string, Destino>>({});
  const [aperturas, setAperturas] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const add = (linea: string) => setLog(actual => [...actual, linea]);

  // ── Propuesta automática a partir del último bloque ────────────────────────

  useEffect(() => {
    if (!ultimo) return;
    const siguienteOrden = Number(ultimo.orden ?? 0) + 1;
    if (modo === "siguiente") {
      setSplitId(`split_${siguienteOrden}`);
      setNombre(`Split ${siguienteOrden}`);
      setOrden(siguienteOrden);
      setTemporadaId(ultimo.temporadaId || "temporada_1");
    } else {
      // Temporada nueva: el contador de bloques vuelve a empezar.
      const numero = Number(String(ultimo.temporadaId || "temporada_1").replace(/\D/g, "") || 1) + 1;
      setSplitId(`t${numero}_split_1`);
      setNombre(`Split 1 · Temporada ${numero}`);
      setOrden(siguienteOrden);
      setTemporadaId(`temporada_${numero}`);
    }
  }, [ultimo, modo]);

  // Las carreras se numeran seguidas dentro de una temporada y vuelven a 1 en una nueva.
  useEffect(() => {
    if (!anteriorId) return;
    if (modo === "temporada") { setPrimeraCarrera(1); return; }
    const previos = bloques.filter((s: any) => Number(s.orden ?? 0) <= Number(bloques.find((b: any) => b.id === anteriorId)?.orden ?? 0));
    contarCarrerasPrevias(previos.map((s: any) => s.id))
      .then(total => setPrimeraCarrera(total + 1))
      .catch(() => undefined);
  }, [anteriorId, modo, bloques]);

  // ── Roster del bloque anterior ─────────────────────────────────────────────

  const cargarAnterior = async (id: string) => {
    if (!id) return;
    setCargando(true);
    try {
      const { equipos: eq, fichas: fi } = await leerCierreDeSplit(id);
      setEquipos(eq);
      setFichas(fi);
      // Por defecto todos a la puja: nadie continúa sin fichar.
      setDestinos(Object.fromEntries(fi.map(f => [f.pilotoId, { estado: "pendiente" } as Destino])));
      setAperturas(Object.fromEntries(eq.map(e => [e.id, ""])));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarAnterior(anteriorId); }, [anteriorId]);

  const cambiarDestino = (pilotoId: string, destino: Destino) =>
    setDestinos(actual => ({ ...actual, [pilotoId]: destino }));

  // ── Acciones ───────────────────────────────────────────────────────────────

  const crear = async () => {
    const listaCircuitos = circuitos.split(/[\n,]/).map(c => c.trim()).filter(Boolean);
    if (listaCircuitos.length === 0) { add("⚠ Escribe al menos un circuito."); return; }

    const repetidos = listaCircuitos.map(slug).filter((s, i, a) => a.indexOf(s) !== i);
    if (repetidos.length) { add(`⚠ Circuitos repetidos: ${repetidos.join(", ")}.`); return; }

    if (!confirm(
      `Se va a crear ${nombre} (${splitId}) con ${listaCircuitos.length} carreras.\n\n` +
      `REEMPLAZA por completo lo que haya ahora en ${splitId}.\n` +
      (cerrarAnterior && anteriorId ? `Además cierra ${anteriorId}.\n` : "") +
      "\n¿Continuar?"
    )) return;

    setTrabajando(true);
    setLog([]);
    const config: ConfigNuevoSplit = {
      splitAnteriorId: anteriorId || null,
      splitId, nombre, orden, temporadaId,
      circuitos: listaCircuitos,
      primeraCarrera,
      destinos,
      rookies: rookies.split(/[\n,]/).map(r => r.trim()).filter(Boolean),
      aperturas: Object.fromEntries(Object.entries(aperturas).map(([id, valor]) => [id, valor.trim() === "" ? null : Number(valor)])),
      presupuestoDeArranque: modo === "temporada" ? Number(presupuestoArranque) || 0 : null,
      activo, fichajesAbiertos, cerrarAnterior,
    };
    await crearSplit(config, add);
    setTrabajando(false);
  };

  const soloCerrar = async () => {
    if (!anteriorId) return;
    if (!confirm(`Cerrar ${anteriorId} y abrir su mercado de fichajes. ¿Continuar?`)) return;
    setTrabajando(true);
    const resultado = await cerrarSplitYAbrirMercado(anteriorId, anteriorId);
    setLog([resultado.message]);
    setTrabajando(false);
  };

  const campo = "bg-black border border-white/15 px-2 py-1.5 text-[10px] font-mono text-white outline-none focus:border-[#e10600]";
  const etiqueta = "block text-[8px] font-mono uppercase tracking-[0.2em] text-white/30 mb-1";

  return (
    <section className="border border-white/10 bg-white/[0.03] p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-500/10 text-emerald-300"><CalendarPlus className="w-5 h-5" /></div>
        <div>
          <h2 className="font-black uppercase tracking-tight text-lg">Cerrar bloque y abrir el siguiente</h2>
          <p className="text-xs text-white/45 mt-1 max-w-2xl">
            Hereda saldos y overall del bloque anterior, coloca las operaciones de mercado ya
            cerradas y manda al resto a la puja. Sirve igual para el split siguiente o para
            arrancar temporada nueva. Nadie continúa por defecto: un equipo pierde al piloto que
            no fiche.
          </p>
        </div>
      </div>

      {/* ── Qué se va a crear ── */}
      <div className="border border-white/[0.06] bg-black/30 p-4 space-y-3">
        <div className="flex gap-0.5">
          {([["siguiente", "Siguiente split"], ["temporada", "Temporada nueva"]] as const).map(([id, texto]) => (
            <button key={id} onClick={() => setModo(id)}
              className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                modo === id ? "bg-white/10 text-white" : "text-white/25 hover:text-white/50"
              }`}>
              {texto}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label><span className={etiqueta}>Parte de</span>
            <select value={anteriorId} onChange={e => setAnteriorId(e.target.value)} className={`w-full ${campo}`}>
              <option value="">— ninguno —</option>
              {bloques.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </label>
          <label><span className={etiqueta}>Identificador</span>
            <input value={splitId} onChange={e => setSplitId(e.target.value)} className={`w-full ${campo}`} />
          </label>
          <label><span className={etiqueta}>Nombre</span>
            <input value={nombre} onChange={e => setNombre(e.target.value)} className={`w-full ${campo}`} />
          </label>
          <label><span className={etiqueta}>Temporada</span>
            <input value={temporadaId} onChange={e => setTemporadaId(e.target.value)} className={`w-full ${campo}`} />
          </label>
          <label><span className={etiqueta}>Orden</span>
            <input type="number" value={orden} onChange={e => setOrden(Number(e.target.value) || 1)} className={`w-full ${campo}`} />
          </label>
          <label><span className={etiqueta}>Primera carrera</span>
            <input type="number" value={primeraCarrera} onChange={e => setPrimeraCarrera(Number(e.target.value) || 1)} className={`w-full ${campo}`} />
          </label>
          {modo === "temporada" && (
            <label><span className={etiqueta}>Saldo de arranque</span>
              <input type="number" step="0.1" value={presupuestoArranque} onChange={e => setPresupuestoArranque(e.target.value)} className={`w-full ${campo}`} />
            </label>
          )}
          <label><span className={etiqueta}>Debutantes (coma)</span>
            <input value={rookies} onChange={e => setRookies(e.target.value)} placeholder="Dani, ..." className={`w-full ${campo}`} />
          </label>
        </div>

        <label className="block"><span className={etiqueta}>Circuitos, uno por línea o separados por comas</span>
          <textarea value={circuitos} onChange={e => setCircuitos(e.target.value)} rows={3}
            placeholder="Hungría, Países Bajos, Italia, España, Azerbayán, Singapur"
            className={`w-full ${campo} resize-y`} />
        </label>

        <div className="flex flex-wrap gap-4 text-[10px] font-mono text-white/50">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} className="accent-[#e10600]" /> Visible en la web</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={fichajesAbiertos} onChange={e => setFichajesAbiertos(e.target.checked)} className="accent-[#e10600]" /> Mercado abierto</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={cerrarAnterior} onChange={e => setCerrarAnterior(e.target.checked)} className="accent-[#e10600]" /> Cerrar el bloque anterior</label>
        </div>
      </div>

      {/* ── Saldos de apertura ── */}
      {equipos.length > 0 && modo === "siguiente" && (
        <div className="border border-white/[0.06] bg-black/30 p-4 space-y-2">
          <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/25">
            Apertura por escudería · en blanco = la que salga de las operaciones
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {equipos.map(equipo => (
              <label key={equipo.id} className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/45 flex-1 truncate">{equipo.nombre}</span>
                <span className="text-[9px] font-mono text-white/20 tabular-nums">{equipo.saldoCierre}M →</span>
                <input value={aperturas[equipo.id] ?? ""} placeholder="auto" type="number" step="0.1"
                  onChange={e => setAperturas(actual => ({ ...actual, [equipo.id]: e.target.value }))}
                  className={`w-20 ${campo}`} />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Destino de cada piloto ── */}
      {cargando ? (
        <p className="text-[10px] font-mono text-white/30 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Leyendo el bloque anterior…</p>
      ) : fichas.length > 0 && (
        <div className="border border-white/[0.06] overflow-x-auto">
          <table className="text-[10px] font-mono min-w-full border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-[9px] uppercase tracking-[0.2em] text-white/25">
                <th className="py-2 px-3 text-left font-normal">Piloto</th>
                <th className="py-2 px-3 text-left font-normal">Venía de</th>
                <th className="py-2 px-3 text-right font-normal">Valía</th>
                <th className="py-2 px-3 text-left font-normal">Destino</th>
                <th className="py-2 px-3 text-left font-normal">Equipo</th>
                <th className="py-2 px-3 text-left font-normal">Operación</th>
                <th className="py-2 px-3 text-right font-normal">Precio</th>
              </tr>
            </thead>
            <tbody>
              {fichas.map(ficha => {
                const destino = destinos[ficha.pilotoId] ?? { estado: "pendiente" as const };
                const fichado = destino.estado === "fichado";
                return (
                  <tr key={ficha.pilotoId} className="border-b border-white/[0.04]">
                    <td className="py-1.5 px-3 font-bold text-white/85">{ficha.nombre}</td>
                    <td className="py-1.5 px-3 text-white/35">{ficha.equipoNombre}</td>
                    <td className="py-1.5 px-3 text-right text-white/30 tabular-nums">{ficha.mantenerCierre}M</td>
                    <td className="py-1.5 px-3">
                      <select value={destino.estado}
                        onChange={e => {
                          const estado = e.target.value as Destino["estado"];
                          cambiarDestino(ficha.pilotoId, estado === "fichado"
                            ? { estado, equipoId: equipos[0]?.id ?? "", tipo: "subasta", precio: null }
                            : { estado } as Destino);
                        }}
                        className={campo}>
                        <option value="pendiente">A la puja</option>
                        <option value="fichado">Ya fichado</option>
                        <option value="se_va">Deja la liga</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-3">
                      {fichado && (
                        <select value={destino.equipoId}
                          onChange={e => cambiarDestino(ficha.pilotoId, { ...destino, equipoId: e.target.value })}
                          className={campo}>
                          {equipos.map(equipo => <option key={equipo.id} value={equipo.id}>{equipo.nombre}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="py-1.5 px-3">
                      {fichado && (
                        <select value={destino.tipo}
                          onChange={e => cambiarDestino(ficha.pilotoId, { ...destino, tipo: e.target.value as TipoFichaje })}
                          className={campo}>
                          <option value="subasta">Subasta</option>
                          <option value="clausula">Cláusula</option>
                          <option value="mantener">Mantener</option>
                        </select>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      {fichado && (
                        <input type="number" step="0.1" placeholder="pend."
                          value={destino.precio ?? ""}
                          onChange={e => cambiarDestino(ficha.pilotoId, { ...destino, precio: e.target.value === "" ? null : Number(e.target.value) })}
                          className={`w-20 text-right ${campo}`} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={crear} disabled={trabajando || !splitId}
          className="inline-flex items-center gap-2 border border-emerald-400/40 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-300 disabled:opacity-30">
          {trabajando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />}
          Crear {nombre || "el split"}
        </button>
        <button onClick={soloCerrar} disabled={trabajando || !anteriorId}
          className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white/50 disabled:opacity-30">
          <Lock className="w-3.5 h-3.5" />
          Solo cerrar y abrir mercado
        </button>
      </div>

      {log.length > 0 && (
        <div className="border border-white/[0.06] bg-black/30 px-4 py-3 space-y-0.5 max-h-72 overflow-y-auto">
          {log.map((linea, indice) => (
            <p key={indice} className={`text-[10px] font-mono ${
              linea.startsWith("Error") || linea.includes("⚠") ? "text-amber-300"
              : linea.includes("✓") ? "text-emerald-400/80"
              : "text-white/45"
            }`}>{linea}</p>
          ))}
        </div>
      )}
    </section>
  );
}

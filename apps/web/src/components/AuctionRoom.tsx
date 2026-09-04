import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  SALA_VACIA, adjudicarSubasta, cerrarSala, comenzarTemporada, configurarSala,
  deshacerAdjudicacionSimulada, leerEquiposDeSubasta, prorrogarSubasta, pujar,
  sacarPilotoASubasta, puedePujar,
  type EquipoEnSubasta, type SalaSubasta, type TipoOperacion,
} from "../services/auctionService";
import { ChevronLeft, ChevronRight, Gavel, Loader2, Timer, Trophy, Users } from "lucide-react";
import { PilotCardF1 } from "./PilotCardF1";

// La sala de subasta en vivo. El reloj vive en la sala (`termina_en`), así que todos los
// que miran ven el mismo tiempo restante aunque entren a destiempo.

interface Puja {
  id: string;
  equipoId: string;
  equipoNombre: string;
  importe: number;
  apertura?: boolean;
  prorroga?: boolean;
  instante: number;
}

const ANIMACIONES = `
@keyframes subasta-latido { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes subasta-flash  { 0% { opacity: 0; transform: translateY(-6px); } 15% { opacity: 1; transform: none; } 85% { opacity: 1; } 100% { opacity: 0; } }
@keyframes subasta-golpe  { 0% { opacity: 0; transform: scale(1.6) rotate(-4deg); } 55% { opacity: 1; transform: scale(0.96) rotate(1deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes subasta-entra  { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
@keyframes subasta-barrido { from { background-position: 0% 50%; } to { background-position: 200% 50%; } }
@keyframes subasta-carta  { 0% { opacity: 0; transform: translateY(18px) rotate(-3deg) scale(0.94); } 60% { transform: translateY(-4px) rotate(1deg) scale(1.02); } 100% { opacity: 1; transform: none; } }
@keyframes subasta-fila   { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: none; } }
@keyframes subasta-velo   { from { opacity: 0; } to { opacity: 1; } }
@keyframes subasta-panel  { 0% { opacity: 0; transform: translateY(26px) scale(0.9) rotate(-1.5deg); } 65% { transform: translateY(-5px) scale(1.015) rotate(0.4deg); } 100% { opacity: 1; transform: none; } }
@keyframes subasta-cifra  { 0% { transform: scale(1); } 35% { transform: scale(1.22); } 100% { transform: scale(1); } }
`;

function segundosRestantes(terminaEn: number | null): number {
  if (terminaEn == null) return 0;
  return Math.max(0, (terminaEn - Date.now()) / 1000);
}

function parsearImporte(value: string): number {
  return Number(value.replace(",", "."));
}

function formatearNumero(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

function formatearMillones(value: number): string {
  return `${formatearNumero(value)}M`;
}

// Cuenta atrás hasta la apertura, partida en bloques para que se lea de un vistazo.
function desglosarEspera(milisegundos: number) {
  const total = Math.max(0, Math.floor(milisegundos / 1000));
  return {
    dias:     Math.floor(total / 86400),
    horas:    Math.floor((total % 86400) / 3600),
    minutos:  Math.floor((total % 3600) / 60),
    segundos: total % 60,
  };
}

// `datetime-local` trabaja en hora local y sin zona: hay que quitarle el desfase.
function paraInputLocal(epoch: number | null): string {
  if (epoch == null) return "";
  const fecha = new Date(epoch - new Date(epoch).getTimezoneOffset() * 60000);
  return fecha.toISOString().slice(0, 16);
}

export function AuctionRoom({ splits, splitId }: { splits: any[]; splitId: string }) {
  const { userData } = useAuth();
  const esAdmin = userData?.rol === "admin";
  // Pujar es cosa de jeques. Un piloto de plantilla también lleva `escuderia_id`, así que
  // sin mirar el rol le saldrían los botones de puja y las reglas se la rechazarían.
  const puedeOperar = userData?.rol === "jeque" || esAdmin;
  const miEquipoId = puedeOperar ? (userData?.escuderia_id || "") : "";

  const [sala, setSala] = useState<SalaSubasta>(SALA_VACIA);
  const [pujas, setPujas] = useState<Puja[]>([]);
  const [equipos, setEquipos] = useState<EquipoEnSubasta[]>([]);
  const [restante, setRestante] = useState(0);
  const [techo, setTecho] = useState(0);
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [pilotoElegido, setPilotoElegido] = useState("");
  const [tipoElegido, setTipoElegido] = useState<TipoOperacion>("subasta");
  const prorrogasVistas = useRef(0);
  const [flashProrroga, setFlashProrroga] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [oferta, setOferta] = useState("0.0");
  const [latidoCifra, setLatidoCifra] = useState(0);

  const split = useMemo(() => splits.find((s: any) => s.id === splitId), [splits, splitId]);

  // ── Suscripciones ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!splitId) return;
    const unsub = onSnapshot(doc(db, `splits/${splitId}/subasta`, "sala"), snap => {
      setSala(snap.exists() ? { ...SALA_VACIA, ...(snap.data() as Partial<SalaSubasta>) } : SALA_VACIA);
    });
    return unsub;
  }, [splitId]);

  useEffect(() => {
    if (!splitId) return;
    const unsub = onSnapshot(
      query(collection(db, `splits/${splitId}/subasta/sala/pujas`), orderBy("instante", "desc")),
      snap => setPujas(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Puja[]),
    );
    return unsub;
  }, [splitId]);

  // El saldo y las plazas cambian con cada adjudicación: se releen al cerrar cada puja.
  useEffect(() => {
    if (!splitId) return;
    let vivo = true;
    leerEquiposDeSubasta(splitId, sala.plazas_por_equipo)
      .then(lista => { if (vivo) setEquipos(lista); })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, [splitId, sala.plazas_por_equipo, sala.estado, sala.adjudicacion?.precio]);

  // ── Reloj ──────────────────────────────────────────────────────────────────

  // Un tic por segundo mientras el mercado no haya abierto: al llegar la hora la sala se
  // destapa sola, sin que nadie tenga que recargar.
  useEffect(() => {
    if (sala.modo === "simulacro" || sala.apertura_programada == null || Date.now() >= sala.apertura_programada) return;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sala.modo, sala.apertura_programada]);

  useEffect(() => {
    if (sala.estado !== "en_curso") { setRestante(0); setTecho(0); return; }
    const inicial = segundosRestantes(sala.termina_en);
    setRestante(inicial);
    // El techo de la barra sube con cada prórroga y no baja mientras corre el reloj: si se
    // recalculara con el tiempo restante, la barra se quedaría clavada al 100%.
    setTecho(actual => Math.max(actual, inicial, sala.duracion_segundos));
    const id = setInterval(() => setRestante(segundosRestantes(sala.termina_en)), 100);
    return () => clearInterval(id);
  }, [sala.estado, sala.termina_en, sala.duracion_segundos]);

  // Al agotarse el tiempo adjudica el admin, que es quien tiene permisos para mover dinero.
  useEffect(() => {
    if (!esAdmin || sala.estado !== "en_curso" || sala.termina_en == null || sala.termina_en > Date.now()) return;
    setOcupado(true);
    adjudicarSubasta(splitId)
      .then(resultado => setAviso(resultado.message))
      .finally(() => setOcupado(false));
  }, [esAdmin, sala.estado, restante, sala.termina_en, splitId]);

  // La oferta del panel arranca siempre justo por encima de lo que hay sobre la mesa.
  useEffect(() => {
    setOferta(formatearNumero(sala.puja_actual != null ? Math.round((sala.puja_actual + 0.5) * 10) / 10 : 1));
    if (sala.puja_actual != null) setLatidoCifra(n => n + 1);
  }, [sala.puja_actual, sala.pilotoId]);

  // Aviso de prórroga: la suma cada puja, y también el admin a mano.
  useEffect(() => {
    const prorrogas = sala.prorrogada ?? 0;
    if (prorrogas > prorrogasVistas.current) {
      prorrogasVistas.current = prorrogas;
      setFlashProrroga(true);
      const id = setTimeout(() => setFlashProrroga(false), 1800);
      return () => clearTimeout(id);
    }
    prorrogasVistas.current = prorrogas;
  }, [sala.prorrogada]);

  // ── Datos derivados ────────────────────────────────────────────────────────

  const faltaParaAbrir = sala.apertura_programada != null ? sala.apertura_programada - ahora : 0;
  // La cuenta atrás es del mercado de verdad: en simulacro la sala está siempre abierta.
  const mercadoAbierto = sala.modo === "simulacro" || sala.apertura_programada == null || faltaParaAbrir <= 0;
  const espera = desglosarEspera(faltaParaAbrir);
  const inminente = !mercadoAbierto && faltaParaAbrir <= 60_000;

  const miEquipo = miEquipoId ? equipos.find(equipo => equipo.id === miEquipoId) || null : null;
  const puedoAbrir = !!miEquipo && !miEquipo.completo && sala.estado === "esperando_apertura";
  const puedoPujar = !!miEquipo && !miEquipo.completo && sala.estado === "en_curso";
  const soyPujadorMax = !!miEquipoId && sala.puja_equipo_id === miEquipoId;

  const duracionTotal = Math.max(1, sala.duracion_segundos);
  // Las prórrogas se acumulan, así que la barra se mide contra el reloj más largo visto.
  const referencia = Math.max(1, techo, duracionTotal);
  const porcentaje = Math.max(0, Math.min(100, (restante / referencia) * 100));
  const agonia = sala.estado === "en_curso" && restante <= 10;

  const candidatos = useMemo(() => {
    const roster = (split?.roster || []) as any[];
    return [...roster]
      .filter(p => !!p.pilotoId)
      .sort((a, b) => (Number(b.rating_piloto ?? 0) - Number(a.rating_piloto ?? 0)) || String(a.nombre).localeCompare(String(b.nombre)))
      .map(p => {
        const equipo = (split?.equipos || []).find((e: any) => e.id === p.equipoId);
        return {
          id: p.pilotoId,
          nombre: p.nombre || p.pilotoId,
          ovr: Number(p.rating_piloto ?? 0) || null,
          equipoAnteriorId: p.equipoId === "agente_libre" ? null : p.equipoId,
          equipoAnteriorNombre: p.equipoId === "agente_libre" ? null : (equipo?.nombre || p.equipoId),
          fichado: Number(p.precio_compra ?? 0) !== 0,
        };
      });
  }, [split]);

  // ── Acciones ───────────────────────────────────────────────────────────────

  const lanzarPuja = async (cifra: number) => {
    if (!miEquipo) { setAviso("No tienes escudería asignada."); return; }
    const permiso = puedePujar(miEquipo, cifra);
    if (!permiso.ok) { setAviso(permiso.motivo!); return; }
    setOcupado(true);
    const resultado = await pujar(splitId, { id: miEquipo.id, nombre: miEquipo.nombre }, cifra);
    setAviso(resultado.message);
    setOcupado(false);
  };

  const sacarPiloto = async () => {
    const piloto = candidatos.find(c => c.id === pilotoElegido);
    if (!piloto) { setAviso("Elige un piloto."); return; }
    setOcupado(true);
    const resultado = await sacarPilotoASubasta(splitId, piloto, tipoElegido);
    setAviso(resultado.message);
    setOcupado(false);
  };

  const subidaRapida = (paso: number) => {
    const base = sala.puja_actual ?? 0;
    lanzarPuja(Math.round((base + paso) * 10) / 10);
  };

  const concederProrroga = async () => {
    setOcupado(true);
    try {
      const resultado = await prorrogarSubasta(splitId);
      setAviso(resultado.message);
    } finally {
      setOcupado(false);
    }
  };

  const adjudicarAhora = async () => {
    const detalle = sala.estado === "en_curso" && restante > 0
      ? ` Quedan ${restante.toFixed(1)} segundos.`
      : "";
    if (!window.confirm(`¿Adjudicar la subasta ahora?${detalle}`)) return;
    setOcupado(true);
    try {
      const resultado = await adjudicarSubasta(splitId, true);
      setAviso(resultado.message);
    } finally {
      setOcupado(false);
    }
  };

  const deshacerSimulacion = async () => {
    setOcupado(true);
    try {
      const resultado = await deshacerAdjudicacionSimulada(splitId);
      setAviso(resultado.message);
    } finally {
      setOcupado(false);
    }
  };

  const iniciarTemporada = async () => {
    if (!window.confirm(`¿Comenzar ${split?.nombre || splitId}? Se cerrará el mercado y se desactivarán los demás splits.`)) return;
    setOcupado(true);
    try {
      const resultado = await comenzarTemporada(splitId);
      setAviso(resultado.message);
    } finally {
      setOcupado(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const adjudicacion = sala.adjudicacion;
  const enAtril = sala.estado === "esperando_apertura" || sala.estado === "en_curso";
  const puedoOfertar = puedoAbrir || puedoPujar;
  const minimo = sala.puja_actual != null ? Math.round((sala.puja_actual + 0.1) * 10) / 10 : null;
  const saldo = miEquipo?.presupuesto ?? 0;
  const ofertaNumero = parsearImporte(oferta);
  const ofertaValida = oferta.trim() !== "" && oferta !== "-" && Number.isFinite(ofertaNumero)
    && (minimo == null || ofertaNumero >= minimo) && ofertaNumero <= saldo;

  const ajustarOferta = (paso: number) => setOferta(actual => {
    const actualNumero = parsearImporte(actual);
    const siguiente = Math.round(((Number.isFinite(actualNumero) ? actualNumero : 0) + paso) * 10) / 10;
    return formatearNumero(minimo == null ? siguiente : Math.max(minimo, siguiente));
  });

  const confirmarOferta = async () => {
    await lanzarPuja(ofertaNumero);
    setPanelAbierto(false);
  };

  const pasarAlSiguiente = async () => {
    setOcupado(true);
    try {
      await cerrarSala(splitId, false);
      setPilotoElegido("");
      setAviso("Sala preparada para el siguiente piloto.");
    } finally {
      setOcupado(false);
    }
  };

  // Ficha del roster para pintar la carta con sus stats reales.
  const pilotoEnAtril = (split?.roster || []).find((p: any) => p.pilotoId === sala.pilotoId);
  const equipoDeLaCarta = (split?.equipos || []).find((e: any) => e.id === sala.equipo_anterior_id);
  const fotoDelPiloto = (pilotoId: string) =>
    (split?.roster || []).find((p: any) => p.pilotoId === pilotoId)?.foto_url || "";

  const filaOpcion = "w-full min-h-14 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.05] text-left transition-colors";

  return (
    <section className="border border-white/10 bg-white/[0.03] p-5 space-y-5">
      <style>{ANIMACIONES}</style>

      <div className="flex items-start gap-3">
        <div className="p-2 bg-[#e10600]/10 text-[#e10600]"><Gavel className="w-5 h-5" /></div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-black uppercase tracking-tight text-lg">Sala de subasta</h2>
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 ${
              sala.modo === "real" ? "bg-[#e10600]/20 text-[#e10600]" : "bg-sky-500/20 text-sky-300"
            }`}>
              {sala.modo === "real" ? "En vivo · mueve dinero" : "Simulacro"}
            </span>
          </div>
          <p className="text-xs text-white/45 mt-1 max-w-2xl">
            No hay precio de salida ni turnos: cualquier jeque puede poner la primera cifra y activar el
            reloj. Desde ahí todos pueden seguir pujando, incluso quien lleve la máxima, y cada
            puja suma {sala.prorroga_segundos}s al reloj.
          </p>
        </div>
      </div>

      {/* ── Controles de admin ── */}
      {esAdmin && (
        <div className="border border-white/[0.06] bg-black/30 p-4 space-y-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/25">Mesa de control</p>
            {sala.apertura_programada != null && (
              <p className="text-[9px] font-mono text-white/30">
                Cita: {new Date(sala.apertura_programada).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                {sala.modo === "simulacro" && <span className="text-sky-300/60"> · el simulacro no espera</span>}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1">
              <span className="block text-[8px] font-mono uppercase tracking-[0.2em] text-white/30">Modo</span>
              <select value={sala.modo} disabled={sala.simulacion_reversiones.length > 0}
                onChange={e => configurarSala(splitId, { modo: e.target.value as any })}
                className="min-h-11 rounded-lg border border-white/15 bg-black px-2 text-white outline-none focus:border-[#e10600] md:min-h-0 md:rounded-none md:py-1.5 md:font-mono md:text-[10px]">
                <option value="simulacro">Simulacro</option>
                <option value="real">Real</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="block text-[8px] font-mono uppercase tracking-[0.2em] text-white/30">Tiempo (s)</span>
              <input type="number" min={10} max={600} defaultValue={sala.duracion_segundos} key={`d-${sala.duracion_segundos}`}
                onBlur={e => configurarSala(splitId, { duracion_segundos: Math.max(10, Number(e.target.value) || 60) })}
                className="min-h-11 w-20 rounded-lg border border-white/15 bg-black px-2 text-white outline-none focus:border-[#e10600] md:min-h-0 md:rounded-none md:py-1.5 md:font-mono md:text-[10px]" />
            </label>
            <label className="space-y-1">
              <span className="block text-[8px] font-mono uppercase tracking-[0.2em] text-white/30">Prórroga (s)</span>
              <input type="number" min={0} max={120} defaultValue={sala.prorroga_segundos} key={`p-${sala.prorroga_segundos}`}
                onBlur={e => configurarSala(splitId, { prorroga_segundos: Math.max(0, Number(e.target.value) || 0) })}
                className="min-h-11 w-20 rounded-lg border border-white/15 bg-black px-2 text-white outline-none focus:border-[#e10600] md:min-h-0 md:rounded-none md:py-1.5 md:font-mono md:text-[10px]" />
            </label>
            <label className="space-y-1">
              <span className="block text-[8px] font-mono uppercase tracking-[0.2em] text-white/30">Abre el mercado</span>
              <input type="datetime-local" defaultValue={paraInputLocal(sala.apertura_programada)}
                key={`a-${sala.apertura_programada}`}
                onBlur={e => configurarSala(splitId, {
                  apertura_programada: e.target.value ? new Date(e.target.value).getTime() : null,
                })}
                className="min-h-11 rounded-lg border border-white/15 bg-black px-2 text-white outline-none focus:border-[#e10600] md:min-h-0 md:rounded-none md:py-1.5 md:font-mono md:text-[10px]" />
            </label>
            <label className="space-y-1">
              <span className="block text-[8px] font-mono uppercase tracking-[0.2em] text-white/30">Plazas</span>
              <input type="number" min={1} max={8} defaultValue={sala.plazas_por_equipo} key={`z-${sala.plazas_por_equipo}`}
                onBlur={e => configurarSala(splitId, { plazas_por_equipo: Math.max(1, Number(e.target.value) || 4) })}
                className="min-h-11 w-16 rounded-lg border border-white/15 bg-black px-2 text-white outline-none focus:border-[#e10600] md:min-h-0 md:rounded-none md:py-1.5 md:font-mono md:text-[10px]" />
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 flex-1 min-w-[180px]">
              <span className="block text-[8px] font-mono uppercase tracking-[0.2em] text-white/30">Piloto</span>
              <select value={pilotoElegido} onChange={e => setPilotoElegido(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-white/15 bg-black px-2 text-white outline-none focus:border-[#e10600] md:min-h-0 md:rounded-none md:py-1.5 md:font-mono md:text-[10px]">
                <option value="">— elige —</option>
                {candidatos.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}{c.ovr ? ` · ${c.ovr} OVR` : ""}{c.equipoAnteriorNombre ? ` · ${c.equipoAnteriorNombre}` : " · libre"}{c.fichado ? " · ya fichado" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="block text-[8px] font-mono uppercase tracking-[0.2em] text-white/30">Operación</span>
              <select value={tipoElegido} onChange={e => setTipoElegido(e.target.value as TipoOperacion)}
                className="min-h-11 rounded-lg border border-white/15 bg-black px-2 text-white outline-none focus:border-[#e10600] md:min-h-0 md:rounded-none md:py-1.5 md:font-mono md:text-[10px]">
                <option value="subasta">Subasta</option>
                <option value="clausula">Cláusula</option>
                <option value="mantener">Mantener</option>
              </select>
            </label>
            <button onClick={sacarPiloto} disabled={ocupado || !pilotoElegido}
              className="inline-flex items-center gap-2 border border-[#e10600]/50 min-h-11 rounded-lg px-3 md:min-h-0 md:rounded-none md:py-1.5 text-[10px] font-black uppercase tracking-wider text-[#e10600] disabled:opacity-30">
              {ocupado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gavel className="w-3.5 h-3.5" />}
              Sacar a subasta
            </button>
            <button onClick={adjudicarAhora}
              disabled={ocupado || sala.estado === "inactiva" || sala.estado === "adjudicada"}
              className="border border-emerald-400/40 min-h-11 rounded-lg px-3 md:min-h-0 md:rounded-none md:py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 disabled:opacity-30">
              Adjudicar ya
            </button>
            <button onClick={concederProrroga}
              disabled={ocupado || sala.estado !== "en_curso" || sala.prorroga_segundos <= 0}
              className="border border-amber-300/40 min-h-11 rounded-lg px-3 md:min-h-0 md:rounded-none md:py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300 disabled:opacity-30">
              Dar prórroga +{sala.prorroga_segundos}s
            </button>
            <button onClick={iniciarTemporada}
              disabled={ocupado || !!split?.temporada_iniciada || sala.estado === "en_curso" || sala.estado === "esperando_apertura" || sala.simulacion_reversiones.length > 0}
              className="border border-sky-300/40 min-h-11 rounded-lg px-3 md:min-h-0 md:rounded-none md:py-1.5 text-[10px] font-black uppercase tracking-wider text-sky-300 disabled:opacity-30">
              {split?.temporada_iniciada ? "Temporada iniciada" : `Comenzar ${split?.nombre || "temporada"}`}
            </button>
            {sala.simulacion_reversiones.length > 0 && (
              <button onClick={deshacerSimulacion} disabled={ocupado}
                className="border border-sky-300/40 min-h-11 rounded-lg px-3 md:min-h-0 md:rounded-none md:py-1.5 text-[10px] font-black uppercase tracking-wider text-sky-300 disabled:opacity-30">
                Deshacer simulacro ({sala.simulacion_reversiones.length})
              </button>
            )}
            <button onClick={async () => { setOcupado(true); await cerrarSala(splitId); setAviso("Sala vaciada."); setOcupado(false); }}
              disabled={ocupado}
              className="border border-white/15 min-h-11 rounded-lg px-3 md:min-h-0 md:rounded-none md:py-1.5 text-[10px] font-black uppercase tracking-wider text-white/40 disabled:opacity-30">
              Vaciar sala
            </button>
          </div>
        </div>
      )}

      {/* ── Cuenta atrás hasta la apertura ── */}
      {!mercadoAbierto && (
        <div className="border border-white/[0.06] bg-black/40 py-10 px-5 text-center">
          <p className="text-[9px] font-mono uppercase tracking-[0.35em] text-white/30">El mercado abre en</p>
          <div className="mt-4 flex items-end justify-center gap-3 sm:gap-6"
            style={inminente ? { animation: "subasta-latido 1s ease-in-out infinite" } : undefined}>
            {([["días", espera.dias], ["horas", espera.horas], ["min", espera.minutos], ["seg", espera.segundos]] as const)
              .map(([etiqueta, valor], indice) => (
                (indice > 0 || espera.dias > 0) && (
                  <div key={etiqueta}>
                    <span className={`block text-4xl sm:text-6xl font-black tabular-nums leading-none ${
                      inminente ? "text-[#e10600]" : "text-white"
                    }`}>
                      {String(valor).padStart(2, "0")}
                    </span>
                    <span className="block mt-1 text-[8px] font-mono uppercase tracking-[0.3em] text-white/25">{etiqueta}</span>
                  </div>
                )
              ))}
          </div>
          <p className="mt-5 text-[10px] font-mono text-white/35">
            {new Date(sala.apertura_programada!).toLocaleString("es-ES", {
              weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
            })}
          </p>
          <p className="mt-1 text-[9px] font-mono uppercase tracking-[0.25em] text-white/20">
            La sala se abre sola · no hace falta recargar
          </p>
        </div>
      )}

      {/* ── El atril ── */}
      {!mercadoAbierto ? null : sala.estado === "inactiva" ? (
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-white/15 text-center py-12">
          No hay ningún piloto en el atril
        </p>
      ) : (
        <div className="m-card border border-white/[0.06] bg-black/40">
          <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,190px)_1fr] md:gap-5 md:p-5">

            {/* Carta del piloto */}
            <div className="mx-auto w-full max-w-[190px] md:max-w-none" style={{ animation: "subasta-carta 0.6s cubic-bezier(.2,1.3,.4,1)" }} key={sala.pilotoId ?? "vacio"}>
              {pilotoEnAtril ? (
                <PilotCardF1
                  pilot={pilotoEnAtril}
                  team={equipoDeLaCarta}
                  getPilotPhoto={fotoDelPiloto}
                  featured
                  size="sm"
                  showPrice={false}
                />
              ) : (
                <div className="border border-white/10 bg-[#090909] grid place-items-center text-white/15 font-black text-2xl"
                  style={{ aspectRatio: "2/3" }}>
                  {(sala.pilotoNombre || "?").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Opciones de puja */}
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-3 bg-white/[0.06] px-4 py-2">
                <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/50">Opciones de puja</span>
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#e10600]">
                  {sala.tipo_operacion === "clausula" ? "Cláusula" : sala.tipo_operacion === "mantener" ? "Mantener" : "Subasta"}
                </span>
              </div>

              <div className="border-x border-b border-white/[0.05]">
                {/* Fila destacada: pujar */}
                <button
                  onClick={() => setPanelAbierto(true)}
                  disabled={!puedoOfertar || ocupado}
                  style={{ animation: "subasta-fila 0.35s ease-out both" }}
                  className={`${filaOpcion} ${
                    puedoOfertar
                      ? "bg-[#e10600] text-white hover:bg-[#ff1a09]"
                      : "bg-white/[0.02] text-white/25 cursor-default"
                  }`}>
                  <span className="text-[11px] font-black uppercase tracking-[0.15em]">
                    {puedoAbrir ? "Abrir la puja" : "Pujar"}
                  </span>
                  <span className="flex items-center gap-2 font-black tabular-nums text-lg">
                    <ChevronLeft className="w-4 h-4 opacity-60" />
                    {puedoOfertar && ofertaValida ? formatearMillones(ofertaNumero) : "—"}
                    <ChevronRight className="w-4 h-4 opacity-60" />
                  </span>
                </button>

                {/* Subidas rápidas */}
                {puedoPujar && [0.5, 1, 5].map((paso, indice) => (
                  <button key={paso} onClick={() => subidaRapida(paso)} disabled={ocupado}
                    style={{ animation: `subasta-fila 0.35s ease-out ${0.06 * (indice + 1)}s both` }}
                    className={`${filaOpcion} bg-white/[0.02] hover:bg-white/[0.06] disabled:opacity-30`}>
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60">Subir {formatearMillones(paso)}</span>
                    <span className="font-black tabular-nums text-white/80">
                      {formatearMillones(Math.round(((sala.puja_actual ?? 0) + paso) * 10) / 10)}
                    </span>
                  </button>
                ))}

                {soyPujadorMax && (
                  <div className={`${filaOpcion} bg-emerald-500/10`}>
                    <span className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-400">Vas ganando</span>
                    <span className="font-black tabular-nums text-emerald-400">{formatearMillones(sala.puja_actual!)}</span>
                  </div>
                )}

                {!miEquipo && (
                  <div className={`${filaOpcion} bg-white/[0.02]`}>
                    <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/25">
                      Estás viendo la puja · solo pujan los jeques
                    </span>
                  </div>
                )}
              </div>

              {/* Datos de la subasta */}
              <div className="mt-4 border border-white/[0.05]">
                {([
                  ["Piloto", sala.pilotoNombre ?? "—"],
                  ["Venía de", sala.equipo_anterior_nombre ?? "agente libre"],
                  ["Oferta actual", sala.puja_actual == null ? "—" : formatearMillones(sala.puja_actual)],
                  ["Máxima puja de", sala.puja_equipo_nombre ?? "—"],
                  ["Tu saldo", miEquipo ? formatearMillones(saldo) : "—"],
                  ["Tiempo restante", sala.estado === "en_curso" ? `${restante.toFixed(1)}s` : "—"],
                ] as const).map(([etiqueta, valor], indice) => (
                  <div key={etiqueta}
                    className={`flex items-center justify-between px-4 py-1.5 text-[10px] font-mono ${
                      indice % 2 === 0 ? "bg-white/[0.015]" : ""
                    }`}>
                    <span className="text-white/30 uppercase tracking-[0.14em]">{etiqueta}</span>
                    <span className={`tabular-nums ${
                      etiqueta === "Oferta actual" ? "text-white font-black text-sm" : "text-white/70"
                    }`}
                      style={etiqueta === "Oferta actual" && latidoCifra > 0
                        ? { animation: "subasta-cifra 0.45s ease-out" } : undefined}
                      key={etiqueta === "Oferta actual" ? `oferta-${latidoCifra}` : etiqueta}>
                      {valor}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Reloj ── */}
          {sala.estado === "en_curso" && (
            <div className="px-5 pb-5 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/25 flex items-center gap-1.5">
                  <Timer className="w-3 h-3" /> Se agota el mercado
                </span>
                <span className={`font-black tabular-nums ${agonia ? "text-[#e10600] text-2xl" : "text-white/70 text-lg"}`}
                  style={agonia ? { animation: "subasta-latido 0.5s ease-in-out infinite" } : undefined}>
                  {restante.toFixed(1)}s
                </span>
              </div>
              <div className="h-2 bg-white/[0.06] overflow-hidden">
                <div
                  className={agonia ? "h-full bg-[#e10600]" : "h-full bg-emerald-400/70"}
                  style={{
                    width: `${porcentaje}%`,
                    transition: "width 120ms linear",
                    ...(agonia ? {
                      backgroundImage: "linear-gradient(90deg,#e10600,#ff6a00,#e10600)",
                      backgroundSize: "200% 100%",
                      animation: "subasta-barrido 0.8s linear infinite",
                    } : {}),
                  }}
                />
              </div>
              {flashProrroga && (
                <p className="text-center text-[11px] font-black uppercase tracking-[0.3em] text-amber-300"
                  style={{ animation: "subasta-flash 1.8s ease-out" }}>
                  ¡Prórroga! +{sala.prorroga_segundos}s al reloj
                </p>
              )}
            </div>
          )}

          {/* ── Adjudicación ── */}
          {sala.estado === "adjudicada" && adjudicacion && (
            <div className="border-t border-white/[0.06] py-8 px-5 text-center"
              style={{ animation: "subasta-golpe 0.7s cubic-bezier(.2,1.4,.4,1)" }}>
              {adjudicacion.desierta ? (
                <>
                  <p className="text-[9px] font-mono uppercase tracking-[0.35em] text-white/30">Subasta desierta</p>
                  <p className="mt-2 text-2xl font-black uppercase">{sala.pilotoNombre} se queda libre</p>
                </>
              ) : (
                <>
                  <Trophy className="w-7 h-7 mx-auto text-amber-300" />
                  <p className="mt-3 text-[9px] font-mono uppercase tracking-[0.35em] text-white/30">Adjudicado a</p>
                  <p className="mt-1 text-4xl md:text-5xl font-black uppercase tracking-[-0.03em] text-amber-300">
                    {adjudicacion.equipoNombre}
                  </p>
                  <p className="mt-2 text-lg font-black tabular-nums">{formatearMillones(adjudicacion.precio)}</p>
                  {adjudicacion.modo === "simulacro" && (
                    <p className="mt-3 text-[9px] font-mono uppercase tracking-[0.25em] text-sky-300/70">
                      Simulacro aplicado · piloto y presupuesto temporales
                    </p>
                  )}
                </>
              )}
              {esAdmin && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {sala.simulacion_reversiones.length > 0 && (
                    <button onClick={deshacerSimulacion} disabled={ocupado}
                      className="inline-flex items-center gap-2 border border-sky-300/40 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-sky-300 hover:border-sky-300 disabled:opacity-30">
                      {ocupado && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Deshacer adjudicación
                    </button>
                  )}
                  <button onClick={pasarAlSiguiente} disabled={ocupado}
                    className="inline-flex items-center gap-2 border border-white/20 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/65 hover:border-white/50 hover:text-white disabled:opacity-30">
                    {ocupado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Siguiente piloto
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Historial de pujas ── */}
          {pujas.length > 0 && (
            <div className="border-t border-white/[0.06] max-h-44 overflow-y-auto">
              {pujas.map((puja, indice) => (
                <div key={puja.id}
                  className="flex items-center justify-between px-5 py-1.5 border-b border-white/[0.03] text-[10px] font-mono"
                  style={indice === 0 ? { animation: "subasta-entra 0.35s ease-out" } : undefined}>
                  <span className="text-white/50">
                    {puja.apertura && <span className="text-amber-300/70 mr-1.5">abre</span>}
                    {puja.prorroga && <span className="text-amber-300/50 mr-1.5">+{sala.prorroga_segundos}s</span>}
                    {puja.equipoNombre}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={indice === 0 ? "text-white font-black tabular-nums" : "text-white/40 tabular-nums"}>
                      {formatearMillones(puja.importe)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Panel de puja ── */}
      {panelAbierto && miEquipo && enAtril && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          style={{ animation: "subasta-velo 0.2s ease-out" }}
          onClick={() => setPanelAbierto(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ animation: "subasta-panel 0.45s cubic-bezier(.2,1.35,.4,1)" }}
            className="w-full max-w-sm rounded-t-2xl border border-white/15 bg-[#0c0c0c] pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-black/70 sm:rounded-none sm:pb-0">

            <div className="flex items-center justify-between bg-[#e10600] px-4 py-2.5">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white">
                {puedoAbrir ? "Abres la puja" : "Tu puja"}
              </span>
              <button aria-label="Cerrar" onClick={() => setPanelAbierto(false)} className="-mr-2 grid h-10 w-10 place-items-center text-white/70 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-5">
              <div className="text-center">
                <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">{sala.pilotoNombre}</p>
                <p className="mt-1 text-[10px] font-mono text-white/25">
                  {sala.puja_actual == null ? "Nadie ha pujado todavía" : `Va ganando ${sala.puja_equipo_nombre} con ${formatearMillones(sala.puja_actual)}`}
                </p>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button onClick={() => ajustarOferta(-0.5)}
                  className="w-11 h-11 border border-white/15 grid place-items-center text-white/60 hover:border-[#e10600] hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center min-w-[7rem]">
                  <input type="text" inputMode="decimal" value={oferta}
                    onChange={e => {
                      if (/^-?\d*(?:[.,]\d?)?$/.test(e.target.value)) setOferta(e.target.value);
                    }}
                    onBlur={() => {
                      if (Number.isFinite(ofertaNumero)) setOferta(formatearNumero(ofertaNumero));
                    }}
                    className={`block w-28 bg-transparent text-center text-4xl font-black tabular-nums leading-none outline-none ${ofertaValida ? "text-white" : "text-[#e10600]"}`} />
                  <span className="block mt-1 text-[8px] font-mono uppercase tracking-[0.3em] text-white/25">millones</span>
                </div>
                <button onClick={() => ajustarOferta(0.5)}
                  className="w-11 h-11 border border-white/15 grid place-items-center text-white/60 hover:border-[#e10600] hover:text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex justify-center gap-2">
                {[1, 5, 10].map(paso => (
                  <button key={paso} onClick={() => ajustarOferta(paso)}
                    className="min-h-11 min-w-14 rounded-xl border border-white/10 px-3 text-[13px] font-black tabular-nums text-white/70 transition-colors hover:border-white/40 hover:text-white sm:min-h-0 sm:min-w-0 sm:rounded-none sm:py-1.5 sm:text-[10px]">
                    +{paso}
                  </button>
                ))}
              </div>

              <div className="border-t border-white/[0.06] pt-4 space-y-1.5 text-[10px] font-mono">
                <div className="flex justify-between"><span className="text-white/30 uppercase tracking-[0.14em]">Mínimo</span><span className="text-white/60 tabular-nums">{minimo == null ? "Libre" : formatearMillones(minimo)}</span></div>
                <div className="flex justify-between"><span className="text-white/30 uppercase tracking-[0.14em]">Tu saldo</span><span className="text-white/60 tabular-nums">{formatearMillones(saldo)}</span></div>
                <div className="flex justify-between">
                  <span className="text-white/30 uppercase tracking-[0.14em]">Te quedarían</span>
                  <span className={`tabular-nums font-black ${saldo - ofertaNumero < 0 ? "text-[#e10600]" : "text-emerald-400"}`}>
                    {Number.isFinite(ofertaNumero) ? formatearMillones(saldo - ofertaNumero) : "—"}
                  </span>
                </div>
              </div>

              {!ofertaValida && (
                <p className="text-[10px] font-mono text-[#e10600] text-center">
                  {minimo != null && ofertaNumero < minimo ? `Hay que superar los ${formatearMillones(sala.puja_actual!)}.` : "Introduce una oferta válida dentro de tu presupuesto."}
                </p>
              )}

              <button onClick={confirmarOferta} disabled={!ofertaValida || ocupado}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] text-sm font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#ff1a09] disabled:cursor-not-allowed disabled:opacity-30 sm:min-h-0 sm:rounded-none sm:py-3 sm:text-[11px] sm:tracking-[0.2em]">
                {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
                Confirmar {ofertaValida ? formatearMillones(ofertaNumero) : "oferta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {aviso && <p className="text-[10px] font-mono text-amber-300/80">{aviso}</p>}

      {/* ── Quién puede pujar ── */}
      {mercadoAbierto && equipos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {equipos.map(equipo => (
            <div key={equipo.id}
              className={`border px-3 py-1.5 text-[9px] font-mono ${
                equipo.id === sala.puja_equipo_id ? "border-amber-300/50 text-amber-300"
                : equipo.completo ? "border-white/[0.06] text-white/20"
                : "border-white/[0.08] text-white/45"
              }`}>
              <span className="font-bold uppercase tracking-wider">{equipo.nombre}</span>
              <span className="ml-2 tabular-nums">{formatearMillones(equipo.presupuesto)}</span>
              <span className="ml-2 inline-flex items-center gap-1 text-white/25">
                <Users className="w-2.5 h-2.5" />{equipo.plantilla}/{sala.plazas_por_equipo}
              </span>
              {equipo.completo && <span className="ml-2 text-[#e10600]/70 uppercase">completa</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

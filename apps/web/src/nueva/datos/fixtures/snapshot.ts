// Solo para los tests: convierte la copia de la lectura pública de Firestore que usó el prototipo
// (forma de docs/redesign/prototipo-gemini/generador/liga-live.js) a los `SplitView` que entrega
// `useSplits()`, deshaciendo lo que liga-live.js simplificó (slugs, ids de escudería, posiciones).
import type { Circuito, Equipo, PilotInRoster, RaceResult, RivalryGroup, SplitView } from "../../../types";
import snapshot from "./liga-22oct.json";

interface ResSnap { pos: number | string; pts: number; q: number | null; vr: boolean; limpio?: boolean; equipo: string | null }
interface GpSnap { id: string; economiaProcesada: boolean; n: number; pais: string; fecha: string | null; hora: string | null; disputada: boolean; res: Record<string, ResSnap> }
interface EquipoSnap {
  id: string; pts: number; pilotos: string[]; saldoInicial: number | null; saldoCierre: number | null; saldoActual: number | null;
  desglose?: Record<string, number | boolean | null> | null;
}
interface TemporadaSnap {
  id: string; nombre: string; tipo: string; enCurso: boolean; gps: GpSnap[]; equipos: EquipoSnap[];
  pilotos: Record<string, { nombre: string; equipo: string | null; pts: number; ovr: number | null }>;
  duos: Array<{ nombre: string; pts: number; porGp: number[] }>;
  rivalidades?: Array<{ id: string; pilotos: string[] }>;
}

export const EQUIPO_ID: Record<string, string> = { alfa: "equipo_alfa_romero", zenith: "equipo_zenith", roses: "equipo_roses" };
const EQUIPO_NOMBRE: Record<string, string> = { alfa: "Alfa Romero", zenith: "Zenith", roses: "Roses" };
export const pid = (slug: string) => `piloto_${slug}`;

function ficha(slug: string, equipoId: string, p: TemporadaSnap["pilotos"][string]): PilotInRoster {
  return {
    pilotoId: pid(slug), equipoId, nombre: p.nombre, rating_piloto: p.ovr ?? 0,
    precio_compra: 0, clausula_actual: 0, mantener_actual: 0, clausula_inicial_split: 0, mantener_inicial_split: 0,
    precio_carrera_anterior: 0, historial_precios: {},
    puntos_piloto: p.pts, victorias: 0, podios: 0, poles: 0, dnfs: 0, carreras_limpias: 0,
  };
}

function resultado(slug: string, r: ResSnap): RaceResult {
  return {
    pilotoId: pid(slug), puntos: r.pts, ...(r.equipo ? { equipoId: EQUIPO_ID[r.equipo] } : {}),
    qualyPos: typeof r.q === "number" && r.q > 0 ? r.q : 99,
    racePos: typeof r.pos === "number" ? r.pos : 99,
    isDnf: r.pos === "DNF",
    ...(typeof r.limpio === "boolean" ? { isClean: r.limpio } : {}),
    fastestLap: r.vr === true, overtakesBoost: false, isDotd: false, isMvp: false,
  };
}

export function snapshotASplits(): SplitView[] {
  return (snapshot.temporadas as unknown as TemporadaSnap[]).map((t, orden) => {
    const individual = t.tipo === "individual";
    const circuitos: Circuito[] = t.gps.map(g => ({
      id: g.id, nombre: g.pais, numero_carrera: g.n, ...(g.fecha ? { fecha: g.fecha } : {}), ...(g.hora ? { hora: g.hora } : {}),
      completado: g.disputada, acta_cerrada: g.disputada, economia_procesada: g.economiaProcesada,
      resultados: Object.entries(g.res).map(([slug, r]) => resultado(slug, r)),
    }));
    const equipos: Equipo[] = t.equipos.map(e => ({
      id: EQUIPO_ID[e.id], nombre: EQUIPO_NOMBRE[e.id], presupuesto: e.saldoActual, puntos_constructores: e.pts,
      presupuesto_inicial: e.saldoInicial,
      ...(e.saldoCierre !== null ? {
        economia_historica: {
          presupuesto_cierre: e.saldoCierre, ajuste_fichajes: e.desglose?.mercado, ingresos_puntos: e.desglose?.puntos,
          ingresos_poles: e.desglose?.pole, ingresos_vueltas_rapidas: e.desglose?.vr, ingresos_participacion: e.desglose?.participacion,
          ingresos_carreras_limpias: e.desglose?.limpias, ingresos_rivalidades_carreras: e.desglose?.rivalidad,
          ajuste_premios: e.desglose?.premio, conciliado: e.desglose?.conciliado === true,
        },
      } : {}),
    }) as Equipo);
    const roster = Object.entries(t.pilotos).map(([slug, p]) =>
      ficha(slug, individual ? "individual" : EQUIPO_ID[p.equipo!], p));
    const groups: RivalryGroup[] = (t.rivalidades ?? []).map(g => ({
      id: g.id, statusRank: 0, type: g.pilotos.length === 2 ? "pair" : "triad", groupScore: 0,
      members: g.pilotos.map(slug => ({
        id: pid(slug), nombre: t.pilotos[slug]?.nombre ?? slug, equipoId: "", equipoNombre: "", rating: 0, puntos_piloto: 0, statusRank: 0, price: 0,
      })),
    }));
    return {
      id: t.id, nombre: t.nombre, orden, fichajes_abiertos: false, activo: t.enCurso, tipo: individual ? "individual" : "equipos",
      duos: t.duos.map(d => ({ id: d.nombre, nombre: d.nombre, puntos: d.pts, puntos_carreras: d.porGp })),
      ...(individual ? {} : { rivalries: { groups, soloPilots: [] } }),
      circuitos, equipos, roster, isStarted: circuitos.some(c => c.completado),
    };
  });
}

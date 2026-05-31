import { useMemo, useState, useEffect } from "react";
import { Trophy, TrendingUp, ShieldAlert, ArrowRight, Sparkles, Users, ChartBar, Loader2 } from "lucide-react";
import { db } from "../services/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { buildRivalryTable, computePilotDynamicOVR } from "../utils/splitResolver";
import { rivalryStyles as s } from "./rivalryStyles";

const formatMillions = (value: number) => `${value.toFixed(1)}M`;
const getPilotValue = (pilot: any): number => {
  if (pilot.precio_compra_split != null) return pilot.precio_compra_split;
  if (pilot.clausula_actual != null) return pilot.clausula_actual;
  return (pilot.rating_piloto || 70) * 0.5;
};
const getStatusLabel = (rank: number) => `Piloto ${rank}`;

function getWeaknessHints(pilot: any): string[] {
  const rating = computePilotDynamicOVR(pilot);
  const points = pilot.puntos_piloto || 0;
  const wins = pilot.victorias || 0;
  const podiums = pilot.podios || 0;
  const dnfs = pilot.dnfs || 0;
  const poles = pilot.poles || 0;
  const races = Math.max(1, (wins + podiums + (pilot.carreras_limpias || 0) + dnfs));
  const hints: string[] = [];

  // DNF es la señal más crítica — siempre priorizar
  if (dnfs >= 2) hints.push(`${dnfs} abandonos penalizan tu OVR y tu posición de mercado. Cero errores propios es la prioridad del split.`);
  else if (dnfs === 1) hints.push("Un abandono ya pesa en tu rating. Cuida los neumáticos en los primeros sectores para no repetirlo.");

  // Eficiencia de puntos: pocos puntos por carrera
  const avgPts = points / races;
  if (avgPts < 5 && points < 40) hints.push("Promedio bajo por GP. En una carrera corta al 35%, cada vuelta de posición en la salida vale más que en F1 real.");

  // Sin victorias pero con podios: muy cerca
  if (wins === 0 && podiums >= 2) hints.push("Dos podios sin victoria: la brecha es mental. Arriesga más en la frenada del sector 3 cuando ruedas 2º.");
  else if (wins === 0 && podiums === 1) hints.push("Un podio en el casillero. La regularidad puntúa más que buscar la victoria a toda costa en estas carreras cortas.");

  // Sin poles con buena puntuación
  if (poles === 0 && points >= 30) hints.push("Buena carrera, clasificación mejorable. La vuelta de pole en sesión libre de tiempo es todo o nada: usa los neumáticos blandos al límite en el intento final.");

  // Rendimiento alto — amenaza para el rival
  if (rating >= 83) hints.push(`OVR ${rating} — rival peligroso. Su fuerte es la consistencia; busca presionarle en clasificación donde el margen es mínimo.`);
  else if (rating >= 75 && wins >= 1) hints.push("Perfil ganador consolidado. La amenaza real viene si encadena otra victoria: actúa antes de que gane confianza.");

  // Muy pocos puntos — principiante o split nuevo
  if (points === 0) hints.push("Sin puntos registrados aún. Imposible estimar su nivel real; trátalo como incógnita y cúbrete en salida.");

  // Fallback genérico si no hay señales claras
  if (hints.length === 0) hints.push("Perfil equilibrado sin puntos débiles evidentes. Monitoriza su ritmo en clasificación para encontrar la ventana de ataque.");

  return hints.slice(0, 3);
}

async function fetchAiAdviceFromApi(pilot: any): Promise<string[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    return getWeaknessHints(pilot);
  }

  const ovr = computePilotDynamicOVR(pilot);
  const races = Math.max(1, (pilot.victorias || 0) + (pilot.podios || 0) + (pilot.carreras_limpias || 0) + (pilot.dnfs || 0));
  const avgPts = ((pilot.puntos_piloto || 0) / races).toFixed(1);

  const prompt = `Eres el ingeniero de pista de F1 Bugambra, una liga virtual entre amigos con formato diferente al F1 real:
- Clasificación: sesión única de vuelta rápida (no Q1/Q2/Q3). Un intento perfecto al final lo decide todo.
- Carrera: 35% de vueltas del GP real. Las salidas y la gestión de neumáticos en los primeros sectores son determinantes.
- Sistema de puntos: 16-13-11-9-8-7-6-5-4-3-2-1 para los 12 primeros. Pole bonus: +2 pts.
- Rating: OVR dinámico que mezcla base del piloto con rendimiento acumulado.

Datos de ${pilot.nombre}:
- OVR actual: ${ovr}
- Puntos: ${pilot.puntos_piloto || 0} (media ${avgPts} por GP)
- Victorias: ${pilot.victorias || 0} | Podios: ${pilot.podios || 0} | Poles: ${pilot.poles || 0}
- Abandonos propios: ${pilot.dnfs || 0} | Carreras limpias: ${pilot.carreras_limpias || 0}

Escribe 3 consejos concretos para batir a este rival en el próximo GP de Bugambra. Sé específico con el formato de la liga. Máximo 20 palabras por consejo. Sin viñetas ni numeración. Un consejo por línea.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Eres un ingeniero de pista experto en ligas virtuales de Fórmula 1 con formato de carrera corta. Conoces las diferencias entre el formato Bugambra y el F1 real." },
          { role: "user", content: prompt }
        ],
        temperature: 0.65
      })
    });
    if (!response.ok) throw new Error("Error API OpenAI");
    const data = await response.json();
    return data.choices[0].message.content
      .split('\n')
      .map((l: string) => l.trim().replace(/^[-*•\d.]\s*/, ''))
      .filter((l: string) => l.length > 0)
      .slice(0, 3);
  } catch (error) {
    console.error("AI Fetch Error:", error);
    return getWeaknessHints(pilot);
  }
}

export function PilotRivalryPanel({ split, miEscuderia, userPilotId }: { split: any; miEscuderia: any; userPilotId?: string }) {
  const pilot = useMemo(() => {
    if (!miEscuderia || !userPilotId) return null;
    return (miEscuderia.pilotos || []).find((p: any) => p.id === userPilotId || p.id === miEscuderia.pilotos?.find((x: any) => x.id === userPilotId)?.id);
  }, [miEscuderia, userPilotId]);

  const resolvedRivalries = useMemo(() => {
    if (split?.rivalries?.groups && Array.isArray(split.rivalries.groups)) return split.rivalries;
    return buildRivalryTable(split);
  }, [split]);

  const pilotGroup = useMemo(() => {
    if (!resolvedRivalries?.groups || !pilot) return null;
    return resolvedRivalries.groups.find((group: any) => group.members.some((member: any) => member.id === pilot.id));
  }, [resolvedRivalries, pilot]);

  if (!pilot || !pilotGroup) {
    return (
      <section className="mt-8 bg-zinc-900/60 border border-white/10 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert className="w-5 h-5 text-[#e10600]" />
          <h2 className="text-lg font-bold uppercase tracking-[0.18em] text-white">Tus Rivalidades</h2>
        </div>
        <p className="text-sm text-white/50">No hay rivalidades definidas para tu piloto en el split actual. Revisa la configuración de tu escudería o espera el inicio del próximo split.</p>
      </section>
    );
  }

  const rivals = pilotGroup.members.filter((member: any) => member.id !== pilot.id);
  const ownStats = {
    rating: computePilotDynamicOVR(pilot),
    points: pilot.puntos_piloto || 0,
    price: getPilotValue(pilot),
    statusLabel: getStatusLabel(pilotGroup.statusRank)
  };

  const [aiAdvices, setAiAdvices] = useState<Record<string, string[]>>({});
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    if (!split || !pilot || !pilotGroup) return;
    let isMounted = true;

    const loadAdvices = async () => {
      setIsGeneratingAi(true);
      const newAdvices = { ...aiAdvices };
      const pilotsToProcess = [pilot, ...rivals];
      let hasChanges = false;

      for (const p of pilotsToProcess) {
        if (newAdvices[p.id]) continue;
        if (p.ai_advice && Array.isArray(p.ai_advice) && p.ai_advice.length > 0) {
          newAdvices[p.id] = p.ai_advice;
          hasChanges = true;
        } else {
          const hints = await fetchAiAdviceFromApi(p);
          if (!isMounted) return;
          newAdvices[p.id] = hints;
          hasChanges = true;
          try {
            const teamId = p.id === pilot.id ? miEscuderia.id : p.equipoId;
            if (teamId) {
              const pilotRef = doc(db, `splits/${split.id}/equipos/${teamId}/pilotos`, p.id);
              await updateDoc(pilotRef, { ai_advice: hints });
            }
          } catch (e) { console.error("Error guardando AI en Firestore:", e); }
        }
      }
      if (hasChanges && isMounted) setAiAdvices(newAdvices);
      if (isMounted) setIsGeneratingAi(false);
    };
    loadAdvices();
    return () => { isMounted = false; };
  }, [split?.id, pilot?.id, rivals.length]);

  return (
    <section className={s.panel}>
      <div className={s.glowTop} />
      <div className={s.headerBlock}>
        <div className={s.headerTitleRow}>
          <ShieldAlert className={s.headerIcon} />
          <h2 className={s.headerTitle}>Tus Rivalidades</h2>
        </div>
        <p className={s.headerDesc}>Comparte estatus con rivales directos del split actual y analiza sus debilidades para atacar con precisión estratégica.</p>
      </div>

      <div className={s.gridTop}>
        <div className={s.cardSelf}>
          <div className={s.glowRight} />
          <div className={s.cardHeader}>
            <div>
              <p className={s.pilotLabel}>Piloto</p>
              <h3 className={s.pilotName}>{pilot.nombre}</h3>
              <p className={s.pilotTeam}>{miEscuderia?.nombre || "Tu Escudería"} · {ownStats.statusLabel}</p>
            </div>
            <div className={s.ovrBadge} title="Estado de forma actual calculado por tus puntos, victorias y restando abandonos.">
              <span className={s.ovrLabel}>OVR</span>
              <span className={s.ovrValue}>{ownStats.rating}</span>
            </div>
          </div>

          <div className={s.statsGridMain}>
            <div className={s.statBox}>
              <p className={s.statTitle}>Puntos</p>
              <p className={s.statVal}>{ownStats.points}</p>
            </div>
            <div className={s.statBox}>
              <p className={s.statTitle}>Valor</p>
              <p className={s.statValRed}>{formatMillions(ownStats.price)}</p>
            </div>
            <div className={s.statBox}>
              <p className={s.statTitle}>Grupo</p>
              <p className={s.statVal}>{pilotGroup.type === "solo" ? "Sin rival" : pilotGroup.type === "triad" ? "Trío" : "Dúo"}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {rivals.map((rival: any) => {
            return (
              <div key={rival.id} className={s.cardRival}>
                <div className={s.glowLeft} />
                <div className={s.cardHeader}>
                  <div>
                    <p className={s.pilotLabel}>Rival directo</p>
                    <h4 className="text-xl font-bold text-white">{rival.nombre}</h4>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-white/60 border border-white/10">{rival.equipoNombre}</span>
                </div>
                <div className={s.statsGridRival}>
                  <div className={s.statBox}>
                    <p className={`${s.statTitle} cursor-help`} title="Estado de forma actual del rival.">NIVEL OVR</p>
                    <p className={s.statVal}>{rival.rating}</p>
                  </div>
                  <div className={s.statBox}>
                    <p className={s.statTitle}>Valor</p>
                    <p className={s.statValRed}>{formatMillions(rival.price)}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {pilotGroup.type === "solo" && (
            <div className="bg-[#131315] border border-[#e10600]/20 rounded-3xl p-5 text-sm text-white/80">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[#e10600]" />
                <p className="font-semibold uppercase tracking-[0.24em] text-[#e10600]">Piloto sin rival</p>
              </div>
              <p>Recibes un bono fijo de <span className="font-bold text-white">1.5M</span> por carrera mientras el split se mantiene sin emparejar un rival directo.</p>
            </div>
          )}
        </div>
      </div>

      <div className={s.gridBottom}>
        <div className={s.aiPanel}>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-3 font-bold">Análisis de Oponentes</p>
          <div className="space-y-3">
            {rivals.map((rival: any) => (
              <div key={`weakness-${rival.id}`} className="rounded-2xl bg-white/5 p-4">
                <p className="font-bold text-sm text-white">{rival.nombre}</p>
                <ul className="mt-2 pl-4 text-[11px] text-white/60 list-disc space-y-1">
                  {(aiAdvices[rival.id] || getWeaknessHints(rival)).map((hint, idx) => (
                    <li key={idx}>{hint}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className={s.aiPanel}>
          <div className={s.aiHeaderRow}>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Áreas de Mejora</p>
              <p className="text-xs text-white/50 mt-1">Consejos creados por el asistente de rivalidad para este piloto.</p>
            </div>
            <span className={s.aiBadge}>
              Asistente AI
              {isGeneratingAi && <Loader2 className="w-3 h-3 animate-spin" />}
            </span>
          </div>
          <div className="space-y-3">
            {["Consejos generados por nuestra IA de pista:", ...(aiAdvices[pilot.id] || getWeaknessHints(pilot))].map((tip, idx) => (
              <div key={idx} className={idx === 0 ? s.aiHintBoxActive : s.aiHintBoxNormal}>
                <p className={idx === 0 ? s.aiHintTextActive : s.aiHintTextNormal}>{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function getPilotTacticalPlan(pilot: any, circuitWeather: string) {
  const rating = pilot.rating_piloto || 70;
  const dnfs = pilot.dnfs || 0;
  const poles = pilot.poles || 0;
  const wins = pilot.victorias || 0;
  const points = pilot.puntos_piloto || 0;

  let agressive = "Media";
  let focus = "Consistencia";
  let plan = "Seguir el delta de tiempo y parar en ventana óptima.";

  if (dnfs >= 2 || circuitWeather.includes("lluvia") || circuitWeather === "tormenta") {
    agressive = "Muy Baja";
    focus = "Sobrevivir";
    plan = "Priorizar llegar a la meta. Levantar el pie en curvas rápidas. No asumir riesgos en adelantamientos.";
  } else if (poles > wins) {
    agressive = "Alta";
    focus = "Aire Limpio";
    plan = "Sufre en tráfico. Intentar un undercut agresivo temprano para salir con aire limpio y tirar.";
  } else if (rating >= 85) {
    agressive = "Muy Alta";
    focus = "Ritmo de Carrera";
    plan = "Confiar en el ritmo puro. Alargar el primer stint y atacar a final de carrera con gomas más frescas.";
  } else if (points < 20) {
    agressive = "Alta";
    focus = "Agresividad Inicial";
    plan = "Ganar posiciones en la salida cueste lo que cueste. Salir con el neumático más blando posible.";
  }

  return { agressive, focus, plan };
}

export function JequeStrategyPanel({ split, miEscuderia, recommendedPilots }: { split: any; miEscuderia: any; recommendedPilots: any[] }) {
  const projections = useMemo(() => {
    if (!miEscuderia) return [];
    return (miEscuderia.pilotos || []).map((pilot: any) => {
      const current = getPilotValue(pilot);
      const prev = pilot.precio_carrera_anterior ?? current;
      const change = current - prev;
      const projected = current + Math.min(Math.max(change * 0.35, -4), 8);
      return {
        id: pilot.id,
        nombre: pilot.nombre,
        team: miEscuderia.nombre,
        current,
        projected: Math.max(0, projected),
        delta: change
      };
    }).sort((a: any, b: any) => b.delta - a.delta);
  }, [miEscuderia]);

  const marketOpportunities = useMemo(() => {
    return recommendedPilots.slice(0, 3).map((pilot) => ({
      ...pilot,
      score: pilot.recoScore
    }));
  }, [recommendedPilots]);

  // Get the next or current active circuit for tactical analysis
  const nextCircuit = split?.circuitos?.filter((c: any) => !c.completado)[0] || split?.circuitos?.[split?.circuitos?.length - 1];
  const weatherType = nextCircuit?.clima_tipo || "despejado";

  return (
    <section className={s.jequePanel}>
      <div className={s.jequeHeader}>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-[#e10600]" />
            <h2 className={s.headerTitle}>Visión de Futuro</h2>
          </div>
          <p className={s.headerDesc}>Proyecciones de rivalidades y precio circuito a circuito para anticipar el siguiente split.</p>
        </div>
        <span className={s.jequeBadge}>Estatus estratégico</span>
      </div>

      <div className={s.jequeGrid}>
        <div className={s.jequeBox}>
          <p className={s.jequeBoxTitle}>Estimación de precios</p>
          <div className="space-y-3">
            {projections.map((pilot: any) => (
              <div key={pilot.id} className={s.jequeItem}>
                <div className="flex items-center justify-between gap-3 text-sm text-white">
                  <span className="font-semibold">{pilot.nombre}</span>
                  <span className="text-xs uppercase tracking-[0.2em] text-white/40">{getStatusLabel(1)}</span>
                </div>
                <div className={s.jequeSubGrid}>
                  <div className={s.jequeSubBox}>
                    <p>Actual</p>
                    <p className="font-semibold text-white mt-1">{formatMillions(pilot.current)}</p>
                  </div>
                  <div className={s.jequeSubBox}>
                    <p>Proyección</p>
                    <p className="font-semibold text-white mt-1">{formatMillions(pilot.projected)}</p>
                  </div>
                </div>
                <p className="mt-3 text-[12px] text-white/60">Variación de precio: {pilot.delta >= 0 ? "+" : ""}{pilot.delta.toFixed(1)}M</p>
              </div>
            ))}
          </div>
        </div>

        <div className={s.jequeBox}>
          <div className={s.jequeBoxTitle}>
            <Trophy className="w-5 h-5 text-[#e10600]" />
            <p>Consultor Estratégico</p>
          </div>
          <div className="space-y-3">
            {marketOpportunities.map((pilot: any) => (
              <div key={pilot.id} className={s.jequeItem}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-white">{pilot.nombre}</span>
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/40">{formatMillions(pilot.coste)}</span>
                </div>
                <p className="text-[12px] text-white/60 mt-3">{pilot.justification || "Buena oportunidad de mercado con equilibrio entre rendimiento y valor."}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NUEVO PANEL: PIZARRA TÁCTICA DEL GP */}
      <div className="mt-6 rounded-3xl bg-black/40 border border-white/10 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e10600]/5 blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-3">
          <ShieldAlert className="w-5 h-5 text-[#e10600]" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">Pizarra Táctica del Gran Premio</h3>
            <p className="text-[10px] text-white/40 uppercase font-mono mt-0.5 tracking-wider">Órdenes de mánager para {nextCircuit?.nombre || "el próximo evento"} ({weatherType.replace('_', ' ')})</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(miEscuderia?.pilotos || []).map((pilot: any) => {
            const tactic = getPilotTacticalPlan(pilot, weatherType);
            return (
              <div key={`tactical-${pilot.id}`} className={s.tacticalCard}>
                <div className={s.tacticalGlow} />
                <div className={s.tacticalHeader}>
                  <span className={s.tacticalName}>{pilot.nombre}</span>
                  <span className={s.tacticalRating}>{pilot.rating_piloto || 70} OVR</span>
                </div>
                <div className={s.tacticalRow}><span className={s.tacticalLabel}>Agresividad Mínima:</span><span className={s.tacticalValue}>{tactic.agressive}</span></div>
                <div className={s.tacticalRow}><span className={s.tacticalLabel}>Enfoque Principal:</span><span className={s.tacticalValue}>{tactic.focus}</span></div>
                <div className="mt-3 pt-3 border-t border-white/5">
                  <span className="text-[9px] uppercase tracking-widest text-[#e10600] font-bold block mb-1">Orden Estratégica:</span>
                  <p className="text-[11px] text-white/70 italic leading-relaxed">"{tactic.plan}"</p>
                </div>
              </div>
            );
          })}
          {(!miEscuderia?.pilotos || miEscuderia.pilotos.length === 0) && (
            <p className="text-xs text-white/30 italic font-mono p-4">Sin pilotos contratados para establecer órdenes de equipo.</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-white/5 border border-white/10 p-5">
        <div className="flex items-center gap-3 mb-3">
          <ChartBar className="w-4 h-4 text-[#e10600]" />
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Indicadores clave</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-white/70">
          <div className="rounded-3xl bg-black/50 p-4">
            <p className="uppercase tracking-[0.22em] text-white/40">Pilotos por estatus</p>
            <p className="mt-3 text-xl font-semibold text-white">{split?.rivalries?.groups?.length || 0}</p>
            <p className="mt-1 text-white/50">Grupos definidos esta fase</p>
          </div>
          <div className="rounded-3xl bg-black/50 p-4">
            <p className="uppercase tracking-[0.22em] text-white/40">Solos estratégicos</p>
            <p className="mt-3 text-xl font-semibold text-white">{split?.rivalries?.soloPilots?.length || 0}</p>
            <p className="mt-1 text-white/50">Pilotos que generan bonus de rivalidad</p>
          </div>
          <div className="rounded-3xl bg-black/50 p-4">
            <p className="uppercase tracking-[0.22em] text-white/40">Recomendaciones</p>
            <p className="mt-3 text-xl font-semibold text-white">{marketOpportunities.length}</p>
            <p className="mt-1 text-white/50">Oportunidades de mercado detectadas</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AdminRivalryControlPanel({ split }: { split: any }) {
  const teamsByPilotId = useMemo(() => {
    const map: Record<string, any> = {};
    split?.equipos?.forEach((team: any) => {
      (team.pilotos || []).forEach((pilot: any) => {
        map[pilot.id] = { teamId: team.id, teamName: team.nombre };
      });
    });
    return map;
  }, [split]);

  const currentRivalries = useMemo(() => {
    if (split?.rivalries && Array.isArray(split.rivalries.groups) && Array.isArray(split.rivalries.soloPilots)) {
      return split.rivalries;
    }
    return buildRivalryTable(split);
  }, [split]);

  const financials = useMemo(() => {
    const data: Record<string, { teamName: string; classification: number; race: number; total: number }> = {};
    if (!split) return [];

    split.equipos?.forEach((team: any) => {
      data[team.id] = { teamName: team.nombre, classification: 0, race: 0, total: 0 };
    });

    const assignTeam = (pilotId: string) => teamsByPilotId[pilotId]?.teamId || "sin_equipo";
    const classificationRewards = [1.0, 0.5, 0];
    const raceRewards = [2.0, 1.0, 0];

    (split.circuitos || []).filter((c: any) => c.completado && c.resultados).forEach((c: any) => {
      (c.resultados || []).forEach((result: any) => {
        const teamId = assignTeam(result.pilotoId);
        if (!data[teamId]) {
          data[teamId] = { teamName: teamsByPilotId[result.pilotoId]?.teamName || "Sin Escudería", classification: 0, race: 0, total: 0 };
        }
        if (result.qualyPos >= 1 && result.qualyPos <= 2) {
          data[teamId].classification += classificationRewards[result.qualyPos - 1];
        }
        if (result.racePos >= 1 && result.racePos <= 2) {
          data[teamId].race += raceRewards[result.racePos - 1];
        }
        data[teamId].total = data[teamId].classification + data[teamId].race;
      });
    });

    return Object.values(data).sort((a, b) => b.total - a.total);
  }, [split, teamsByPilotId]);

  return (
    <section className={s.jequePanel}>
      <div className={s.jequeHeader}>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-[#e10600]" />
            <h2 className={s.headerTitle}>Panel de Control de Rivalidades</h2>
          </div>
          <p className={s.headerDesc}>Rivalidades generadas automáticamente por el algoritmo de emparejamiento. Vigila el flujo financiero de cada grupo.</p>
        </div>
        <span className={s.jequeBadge}>Modo Administrador</span>
      </div>

      <div className={s.adminGrid}>
        <div className={s.adminBox}>
          <p className={s.adminBoxTitle}>Emparejamientos del split</p>
          <div className="space-y-3">
            {(currentRivalries.groups || []).map((group: any) => (
              <div key={group.id} className={s.adminItem}>
                <div className={s.adminItemHeader}>
                  <span className="font-semibold">{group.type === "triad" ? "Grupo de 3" : group.type === "pair" ? "Dúo" : "Solo"}</span>
                  <span className="text-xs text-white/40">Estatus {getStatusLabel(group.statusRank)}</span>
                </div>
                <div className="grid gap-2 text-[12px] text-white/70">
                  {group.members.map((member: any) => (
                    <div key={member.id} className={s.adminSubItem}>
                      <div className="flex justify-between items-center gap-3">
                        <span>{member.nombre}</span>
                        <span className="text-xs uppercase text-white/40">{member.equipoNombre}</span>
                      </div>
                      <div className="mt-2 text-[11px] text-white/50">Valor {formatMillions(member.price)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={s.adminBox}>
          <div className={s.adminBoxTitle}>
            <ArrowRight className="w-4 h-4 text-[#e10600]" />
            <p>Monitor Financiero</p>
          </div>
          <div className="space-y-3">
            {financials.length === 0 ? (
              <div className="rounded-3xl bg-white/5 p-4 text-sm text-white/50">No hay resultados de clasificación o carrera procesados todavía.</div>
            ) : financials.map((team: any) => (
              <div key={team.teamName} className="rounded-3xl bg-black/70 p-4 border border-white/5">
                <div className="flex items-center justify-between gap-3 text-white">
                  <span className="font-semibold">{team.teamName}</span>
                  <span className="font-bold text-[#e10600]">{formatMillions(team.total)}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[12px] text-white/60">
                  <div className="rounded-2xl bg-white/5 p-3">
                    <p className="uppercase tracking-[0.22em]">Clasificación</p>
                    <p className="mt-2 font-semibold text-white">{formatMillions(team.classification)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3">
                    <p className="uppercase tracking-[0.22em]">Carrera</p>
                    <p className="mt-2 font-semibold text-white">{formatMillions(team.race)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

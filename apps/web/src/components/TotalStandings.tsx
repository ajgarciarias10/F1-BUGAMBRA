import { useMemo } from "react";

export function TotalStandings({
  splits,
  getPilotPhoto,
}: {
  splits: any[];
  getPilotPhoto?: (id: string) => string;
}) {
  const activeSplits = useMemo(
    () => splits.filter(s => s.id !== "global" && s.tipo !== "individual" && (s.roster?.length > 0 || s.equipos?.length > 0) && s.completado),
    [splits]
  );

  const { pilotRanking, teamRanking } = useMemo(() => {
    const pilotMap: Record<string, { nombre: string; total: number; bySplit: Record<string, number> }> = {};
    const teamMap: Record<string, { nombre: string; total: number; logo?: string; bySplit: Record<string, number> }> = {};

    for (const split of activeSplits) {
      for (const p of (split.roster || [])) {
        if (p.equipoId === "agente_libre") continue;
        if (!pilotMap[p.pilotoId]) pilotMap[p.pilotoId] = { nombre: p.nombre, total: 0, bySplit: {} };
        const pts = p.puntos_piloto || 0;
        pilotMap[p.pilotoId].total += pts;
        pilotMap[p.pilotoId].bySplit[split.id] = pts;
      }
      for (const eq of (split.equipos || [])) {
        if (!teamMap[eq.id]) teamMap[eq.id] = { nombre: eq.nombre, total: 0, logo: eq.logo_url, bySplit: {} };
        const pts = eq.puntos_constructores || 0;
        teamMap[eq.id].total += pts;
        teamMap[eq.id].bySplit[split.id] = pts;
        if (eq.logo_url) teamMap[eq.id].logo = eq.logo_url;
      }
    }

    return {
      pilotRanking: Object.entries(pilotMap).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.total - a.total),
      teamRanking: Object.entries(teamMap).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.total - a.total),
    };
  }, [activeSplits]);

  if (activeSplits.length === 0) return (
    <p className="text-white/20 text-xs font-mono py-12 text-center uppercase tracking-widest">
      Sin datos de temporadas
    </p>
  );

  const maxPilot = pilotRanking[0]?.total || 1;
  const maxTeam = teamRanking[0]?.total || 1;

  const PilotRow = ({ p, i }: { p: typeof pilotRanking[0]; i: number }) => {
    const photo = getPilotPhoto?.(p.id) || "";
    const pct = Math.round((p.total / maxPilot) * 100);
    const isFirst = i === 0;
    return (
      <div className={`flex items-center gap-3 py-3 ${i > 0 ? "border-t border-white/[0.04]" : ""}`}>
        <span className={`text-base font-black font-mono w-6 tabular-nums shrink-0 ${isFirst ? "text-[#e10600]" : "text-white/20"}`}>{i + 1}</span>
        {photo ? (
          <img src={photo} alt={p.nombre} referrerPolicy="no-referrer" loading="lazy" className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-black text-white/30 shrink-0">
            {p.nombre.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className={`text-sm font-bold uppercase truncate ${isFirst ? "text-white" : "text-white/70"}`}>{p.nombre}</span>
            <span className={`text-sm font-black tabular-nums shrink-0 ${isFirst ? "text-[#e10600]" : "text-white/50"}`}>
              {p.total}<span className="text-[9px] text-white/25 font-normal ml-0.5">pts</span>
            </span>
          </div>
          <div className="w-full bg-white/[0.04] h-1 overflow-hidden mb-1.5">
            <div className={`h-full ${isFirst ? "bg-[#e10600]" : "bg-white/20"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-3">
            {activeSplits.map(s => <span key={s.id} className="text-[8px] font-mono text-white/20">{s.nombre}: <span className="text-white/40 font-bold">{p.bySplit[s.id] || 0}</span></span>)}
          </div>
        </div>
      </div>
    );
  };

  const TeamRow = ({ t, i }: { t: typeof teamRanking[0]; i: number }) => {
    const pct = Math.round((t.total / maxTeam) * 100);
    const isFirst = i === 0;
    return (
      <div className={`flex items-center gap-3 py-3 ${i > 0 ? "border-t border-white/[0.04]" : ""}`}>
        <span className={`text-base font-black font-mono w-6 tabular-nums shrink-0 ${isFirst ? "text-[#e10600]" : "text-white/20"}`}>{i + 1}</span>
        {t.logo ? (
          <img src={t.logo} alt={t.nombre} referrerPolicy="no-referrer" loading="lazy" className="w-8 h-8 object-contain border border-white/10 p-0.5 shrink-0" />
        ) : (
          <div className="w-8 h-8 bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-black text-white/30 shrink-0">
            {t.nombre.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className={`text-sm font-bold uppercase truncate ${isFirst ? "text-white" : "text-white/70"}`}>{t.nombre}</span>
            <span className={`text-sm font-black tabular-nums shrink-0 ${isFirst ? "text-[#e10600]" : "text-white/50"}`}>
              {t.total}<span className="text-[9px] text-white/25 font-normal ml-0.5">pts</span>
            </span>
          </div>
          <div className="w-full bg-white/[0.04] h-1 overflow-hidden mb-1.5">
            <div className={`h-full ${isFirst ? "bg-[#e10600]" : "bg-white/20"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-3">
            {activeSplits.map(s => <span key={s.id} className="text-[8px] font-mono text-white/20">{s.nombre}: <span className="text-white/40 font-bold">{t.bySplit[s.id] || 0}</span></span>)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section>
      <h2 className="text-xl font-bold italic tracking-tight mb-4 border-b border-white/10 pb-2 lowercase flex items-center gap-2">
        <span className="w-1 h-5 bg-[#e10600]" />
        Puntos Acumulados - Todos los Splits
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/[0.03] border border-white/10 p-4">
          <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#e10600] font-black mb-3">Pilotos · Suma de todos los splits</p>
          {pilotRanking.map((p, i) => <PilotRow key={p.id} p={p} i={i} />)}
          {pilotRanking.length === 0 && <p className="text-white/20 text-xs font-mono py-6 text-center">Sin datos de pilotos</p>}
        </div>
        <div className="bg-white/[0.03] border border-white/10 p-4">
          <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#e10600] font-black mb-3">Constructores · Suma de todos los splits</p>
          {teamRanking.map((t, i) => <TeamRow key={t.id} t={t} i={i} />)}
          {teamRanking.length === 0 && <p className="text-white/20 text-xs font-mono py-6 text-center">Sin datos de constructores</p>}
        </div>
      </div>
    </section>
  );
}

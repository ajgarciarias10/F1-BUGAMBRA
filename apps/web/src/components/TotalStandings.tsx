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
    <p className="py-12 text-center text-xs uppercase tracking-widest text-ink-muted md:font-mono">
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
      <div className={`flex items-center gap-3 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
        <span className={`text-base font-black font-mono w-6 tabular-nums shrink-0 ${isFirst ? "text-brand" : "text-ink-muted"}`}>{i + 1}</span>
        {photo ? (
          <img src={photo} alt={p.nombre} referrerPolicy="no-referrer" loading="lazy" className="h-9 w-9 shrink-0 rounded-full border border-line object-cover" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-[11px] font-black text-ink-muted">
            {p.nombre.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className={`text-sm font-bold uppercase truncate ${isFirst ? "text-ink" : "text-ink-2"}`}>{p.nombre}</span>
            <span className={`text-sm font-black tabular-nums shrink-0 ${isFirst ? "text-brand" : "text-ink-muted"}`}>
              {p.total}<span className="ml-0.5 text-[11px] font-normal text-ink-muted">pts</span>
            </span>
          </div>
          <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div className={`h-full rounded-full ${isFirst ? "bg-brand" : "bg-surface-3"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {activeSplits.map(s => <span key={s.id} className="text-[11px] text-ink-muted md:font-mono md:text-[11px]">{s.nombre}: <span className="font-bold text-ink-muted">{p.bySplit[s.id] || 0}</span></span>)}
          </div>
        </div>
      </div>
    );
  };

  const TeamRow = ({ t, i }: { t: typeof teamRanking[0]; i: number }) => {
    const pct = Math.round((t.total / maxTeam) * 100);
    const isFirst = i === 0;
    return (
      <div className={`flex items-center gap-3 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
        <span className={`text-base font-black font-mono w-6 tabular-nums shrink-0 ${isFirst ? "text-brand" : "text-ink-muted"}`}>{i + 1}</span>
        {t.logo ? (
          <img src={t.logo} alt={t.nombre} referrerPolicy="no-referrer" loading="lazy" className="h-9 w-9 shrink-0 rounded-lg border border-line object-contain p-0.5 md:rounded-none" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-[11px] font-black text-ink-muted md:rounded-none">
            {t.nombre.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className={`text-sm font-bold uppercase truncate ${isFirst ? "text-ink" : "text-ink-2"}`}>{t.nombre}</span>
            <span className={`text-sm font-black tabular-nums shrink-0 ${isFirst ? "text-brand" : "text-ink-muted"}`}>
              {t.total}<span className="ml-0.5 text-[11px] font-normal text-ink-muted">pts</span>
            </span>
          </div>
          <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div className={`h-full rounded-full ${isFirst ? "bg-brand" : "bg-surface-3"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {activeSplits.map(s => <span key={s.id} className="text-[11px] text-ink-muted md:font-mono md:text-[11px]">{s.nombre}: <span className="font-bold text-ink-muted">{t.bySplit[s.id] || 0}</span></span>)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 border-b border-line pb-2 text-lg font-bold italic lowercase tracking-tight md:text-xl">
        <span className="w-1 h-5 bg-brand" />
        Puntos Acumulados - Todos los Splits
      </h2>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
        <div className="m-card border border-line bg-surface-3 p-4">
          <p className="mb-3 text-[12px] font-black text-brand md:font-mono md:text-[11px] md:uppercase md:tracking-[0.08em]">Pilotos · Suma de todos los splits</p>
          {pilotRanking.map((p, i) => <PilotRow key={p.id} p={p} i={i} />)}
          {pilotRanking.length === 0 && <p className="py-6 text-center text-xs text-ink-muted">Sin datos de pilotos</p>}
        </div>
        <div className="m-card border border-line bg-surface-3 p-4">
          <p className="mb-3 text-[12px] font-black text-brand md:font-mono md:text-[11px] md:uppercase md:tracking-[0.08em]">Constructores · Suma de todos los splits</p>
          {teamRanking.map((t, i) => <TeamRow key={t.id} t={t} i={i} />)}
          {teamRanking.length === 0 && <p className="py-6 text-center text-xs text-ink-muted">Sin datos de constructores</p>}
        </div>
      </div>
    </section>
  );
}

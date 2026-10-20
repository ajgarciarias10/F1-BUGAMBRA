import { useMemo } from "react";
import { Card, EmptyState } from "./ui";

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
    <EmptyState title="Sin datos de temporadas" description="El acumulado aparece cuando se completa el primer split." />
  );

  const maxPilot = pilotRanking[0]?.total || 1;
  const maxTeam = teamRanking[0]?.total || 1;

  const PilotRow = ({ p, i }: { p: typeof pilotRanking[0]; i: number }) => {
    const photo = getPilotPhoto?.(p.id) || "";
    const pct = Math.round((p.total / maxPilot) * 100);
    const isFirst = i === 0;
    return (
      <div className={`flex items-center gap-3 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
        <span className={`w-6 shrink-0 text-base font-semibold tabular-nums ${isFirst ? "text-brand" : "text-ink-muted"}`}>{i + 1}</span>
        {photo ? (
          <img src={photo} alt={p.nombre} referrerPolicy="no-referrer" loading="lazy" className="h-9 w-9 shrink-0 rounded-full border border-line object-cover" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-xs font-semibold text-ink-muted">
            {p.nombre.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className={`truncate text-sm font-semibold ${isFirst ? "text-ink" : "text-ink-2"}`}>{p.nombre}</span>
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${isFirst ? "text-brand" : "text-ink-2"}`}>
              {p.total}<span className="ml-0.5 text-[11px] font-normal text-ink-muted">pts</span>
            </span>
          </div>
          <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div className={`h-full rounded-full ${isFirst ? "bg-brand" : "bg-line-strong"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {activeSplits.map(s => <span key={s.id} className="text-xs text-ink-muted">{s.nombre}: <span className="font-semibold tabular-nums text-ink-2">{p.bySplit[s.id] || 0}</span></span>)}
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
        <span className={`w-6 shrink-0 text-base font-semibold tabular-nums ${isFirst ? "text-brand" : "text-ink-muted"}`}>{i + 1}</span>
        {t.logo ? (
          <img src={t.logo} alt={t.nombre} referrerPolicy="no-referrer" loading="lazy" className="h-9 w-9 shrink-0 rounded-lg border border-line object-contain p-0.5" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-xs font-semibold text-ink-muted">
            {t.nombre.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className={`truncate text-sm font-semibold ${isFirst ? "text-ink" : "text-ink-2"}`}>{t.nombre}</span>
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${isFirst ? "text-brand" : "text-ink-2"}`}>
              {t.total}<span className="ml-0.5 text-[11px] font-normal text-ink-muted">pts</span>
            </span>
          </div>
          <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div className={`h-full rounded-full ${isFirst ? "bg-brand" : "bg-line-strong"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {activeSplits.map(s => <span key={s.id} className="text-xs text-ink-muted">{s.nombre}: <span className="font-semibold tabular-nums text-ink-2">{t.bySplit[s.id] || 0}</span></span>)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2.5 text-lg font-semibold tracking-tight md:text-xl">
        <span aria-hidden="true" className="h-5 w-1 rounded-full bg-brand" />
        Puntos acumulados · todos los splits
      </h2>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
        <Card tone="solid" pad="sm">
          <h3 className="mb-1 text-sm font-semibold text-brand">Pilotos · suma de todos los splits</h3>
          {pilotRanking.map((p, i) => <PilotRow key={p.id} p={p} i={i} />)}
          {pilotRanking.length === 0 && <p className="py-6 text-center text-sm text-ink-muted">Sin datos de pilotos</p>}
        </Card>
        <Card tone="solid" pad="sm">
          <h3 className="mb-1 text-sm font-semibold text-brand">Constructores · suma de todos los splits</h3>
          {teamRanking.map((t, i) => <TeamRow key={t.id} t={t} i={i} />)}
          {teamRanking.length === 0 && <p className="py-6 text-center text-sm text-ink-muted">Sin datos de constructores</p>}
        </Card>
      </div>
    </section>
  );
}

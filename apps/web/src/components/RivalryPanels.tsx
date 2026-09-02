import { useMemo } from "react";
import { ShieldAlert, ArrowRight, Sparkles, Users } from "lucide-react";
import { buildRivalryTable, computePilotDynamicOVR } from "../utils/splitResolver";
import { rivalryStyles as s } from "./rivalryStyles";

const formatMillions = (value: number) => `${value.toFixed(1)}M`;

const getPilotValue = (pilot: any): number => {
  if (pilot.precio_compra != null) return pilot.precio_compra;
  if (pilot.clausula_actual != null) return pilot.clausula_actual;
  return (pilot.rating_piloto ?? 0) * 0.5;
};

const getStatusLabel = (rank: number) => `Piloto ${rank}`;

// ─── PANEL DE RIVALIDADES DEL PILOTO ─────────────────────────────────────────

export function PilotRivalryPanel({ split, miEscuderia, userPilotId }: { split: any; miEscuderia: any; userPilotId?: string }) {
  const pilot = useMemo(() => {
    if (!split?.roster || !userPilotId) return null;
    return split.roster.find((p: any) => p.pilotoId === userPilotId);
  }, [split, userPilotId]);

  const resolvedRivalries = useMemo(() => {
    if (split?.rivalries?.groups && Array.isArray(split.rivalries.groups)) return split.rivalries;
    return buildRivalryTable(split);
  }, [split]);

  const pilotGroup = useMemo(() => {
    if (!resolvedRivalries?.groups || !pilot) return null;
    return resolvedRivalries.groups.find((group: any) =>
      group.members.some((member: any) => member.id === pilot.pilotoId)
    );
  }, [resolvedRivalries, pilot]);

  const getTeamLogo = (equipoId: string) =>
    split?.equipos?.find((e: any) => e.id === equipoId)?.logo_url || "";

  const getPhoto = (pilotoId: string) =>
    split?.roster?.find((p: any) => p.pilotoId === pilotoId)?.foto_url || "";

  if (!pilot || !pilotGroup) {
    return (
      <section className="mt-8 bg-zinc-900/60 border border-white/10 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert className="w-5 h-5 text-[#e10600]" />
          <h2 className="text-lg font-bold uppercase tracking-[0.18em] text-white">Tus Rivalidades</h2>
        </div>
        <p className="text-sm text-white/50">No hay rivalidades definidas para tu piloto en el split actual.</p>
      </section>
    );
  }

  const rivals = pilotGroup.members
    .filter((member: any) => member.id !== pilot.pilotoId)
    .map((member: any) => {
      const live = split?.roster?.find((p: any) => p.pilotoId === member.id);
      return {
        ...member,
        rating:       live?.rating_piloto ?? member.rating ?? 70,
        puntos_piloto: live?.puntos_piloto ?? member.puntos_piloto ?? 0,
        price:        getPilotValue(live ?? member),
      };
    })
    .sort((a: any, b: any) => (b.puntos_piloto || 0) - (a.puntos_piloto || 0));

  const myLogo = getTeamLogo(pilot.equipoId);
  const myPhoto = pilot.foto_url || "";
  const ownStats = {
    rating: computePilotDynamicOVR(pilot),
    points: pilot.puntos_piloto || 0,
    price: getPilotValue(pilot),
    statusLabel: getStatusLabel(pilotGroup.statusRank),
  };

  return (
    <section className={s.panel}>
      <div className={s.glowTop} />
      <div className={s.headerBlock}>
        <div className={s.headerTitleRow}>
          <ShieldAlert className={s.headerIcon} />
          <h2 className={s.headerTitle}>Tus Rivalidades</h2>
        </div>
        <p className={s.headerDesc}>Rivales directos del split ordenados por puntuación.</p>
      </div>

      <div className={s.gridTop}>
        {/* Tu tarjeta */}
        <div className={s.cardSelf}>
          <div className={s.glowRight} />
          <div className={s.cardHeader}>
            <div className="flex items-center gap-3">
              {myPhoto ? (
                <img src={myPhoto} alt={pilot.nombre} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border-2 border-[#e10600]" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-sm text-white/40 uppercase">
                  {pilot.nombre ? pilot.nombre.substring(0, 2).toUpperCase() : "??"}
                </div>
              )}
              <div>
                <p className={s.pilotLabel}>Piloto</p>
                <h3 className={s.pilotName}>{pilot.nombre}</h3>
                <p className={s.pilotTeam}>{miEscuderia?.nombre || "Tu Escudería"} · {ownStats.statusLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {myLogo && (
                <img src={myLogo} alt={miEscuderia?.nombre} referrerPolicy="no-referrer" className="w-8 h-8 rounded-lg object-cover border border-white/10" />
              )}
              <div className={s.ovrBadge}>
                <span className={s.ovrLabel}>OVR</span>
                <span className={s.ovrValue}>{ownStats.rating}</span>
              </div>
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

        {/* Tarjetas de rivales */}
        <div className="grid gap-4">
          {rivals.map((rival: any) => {
            const rivalLogo = getTeamLogo(rival.equipoId);
            const rivalPhoto = getPhoto(rival.id);
            return (
              <div key={rival.id} className={s.cardRival}>
                <div className={s.glowLeft} />
                <div className={s.cardHeader}>
                  <div className="flex items-center gap-3">
                    {rivalPhoto ? (
                      <img src={rivalPhoto} alt={rival.nombre} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border-2 border-white/20" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-sm text-white/40 uppercase">
                        {rival.nombre ? rival.nombre.substring(0, 2).toUpperCase() : "??"}
                      </div>
                    )}
                    <div>
                      <p className={s.pilotLabel}>Rival directo</p>
                      <h4 className="text-xl font-bold text-white">{rival.nombre}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rivalLogo && (
                      <img src={rivalLogo} alt={rival.equipoNombre} referrerPolicy="no-referrer" className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                    )}
                    <span className="rounded-full bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-white/60 border border-white/10">
                      {rival.equipoNombre}
                    </span>
                  </div>
                </div>
                <div className={s.statsGridMain}>
                  <div className={s.statBox}>
                    <p className={s.statTitle}>Puntos</p>
                    <p className={s.statVal}>{rival.puntos_piloto || 0}</p>
                  </div>
                  <div className={s.statBox}>
                    <p className={s.statTitle}>OVR</p>
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
    </section>
  );
}

// ─── PANEL DE CONTROL DE RIVALIDADES (ADMIN) ──────────────────────────────────

export function AdminRivalryControlPanel({ split }: { split: any }) {
  const teamsByPilotId = useMemo(() => {
    const map: Record<string, any> = {};
    (split?.roster || []).forEach((p: any) => {
      map[p.pilotoId] = { teamId: p.equipoId, teamName: split?.equipos?.find((e: any) => e.id === p.equipoId)?.nombre ?? p.equipoId };
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
    <div className="mb-6 border border-white/[0.06] bg-white/[0.015]">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04]">
        <Users className="w-3.5 h-3.5 text-[#e10600] shrink-0" />
        <span className="text-[9px] font-mono uppercase tracking-[0.35em] text-white/40">Rivalidades del split</span>
        {financials.length > 0 && (
          <div className="ml-auto flex items-center gap-3">
            {financials.slice(0, 4).map((team: any) => (
              <div key={team.teamName} className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono text-white/30 truncate max-w-[70px]">{team.teamName}</span>
                <span className="text-[9px] font-black text-[#e10600]/80">{formatMillions(team.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-px p-0.5">
        {(currentRivalries.groups || []).map((group: any) => (
          <div key={group.id} className="flex items-center gap-0 bg-black/30 px-3 py-2 min-w-0">
            <span className="text-[8px] font-mono text-white/20 uppercase mr-2 shrink-0">
              {group.type === "triad" ? "3" : group.type === "pair" ? "2" : "1"}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {group.members.map((member: any, idx: number) => (
                <span key={member.id} className="flex items-center gap-1">
                  {idx > 0 && <ArrowRight className="w-2.5 h-2.5 text-white/10 shrink-0" />}
                  <span className="text-[10px] font-bold text-white/70">{member.nombre}</span>
                  <span className="text-[8px] font-mono text-white/25">{member.equipoNombre}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
        {(currentRivalries.groups || []).length === 0 && (
          <p className="text-[9px] font-mono text-white/15 px-3 py-2">Sin rivalidades generadas</p>
        )}
      </div>
    </div>
  );
}

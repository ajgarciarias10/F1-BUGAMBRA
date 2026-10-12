import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useSplits, usePilotos } from "../hooks/useData";
import { CalendarClock, Megaphone, ShieldAlert, Sparkles, TrendingUp, Trash2, UserX } from "lucide-react";

import { useSingleFlight } from "../hooks/useSingleFlight";
type MarketPostKind = "rumor" | "rookie" | "regreso";

interface MarketPost {
  id: string;
  splitId: string;
  pilotId: string;
  pilotName: string;
  kind: MarketPostKind;
  headline: string;
  body: string;
  candidateTeams: Array<{ id: string; nombre: string }>;
  rating?: number;
  points?: number;
  rookie?: boolean;
  createdAt: string;
  createdBy: string;
  authorName: string;
}

function buildCandidateTeams(split: any) {
  return [...(split?.equipos || [])]
    .sort((a, b) => {
      const aScore = Number(a.presupuesto ?? 0) * 2 - Number(a.puntos_constructores ?? 0);
      const bScore = Number(b.presupuesto ?? 0) * 2 - Number(b.puntos_constructores ?? 0);
      return bScore - aScore || String(a.nombre || a.id).localeCompare(String(b.nombre || b.id));
    })
    .slice(0, 3)
    .map((team: any) => ({ id: team.id, nombre: team.nombre || team.id }));
}

function createCopy(pilot: any, split: any, kind: MarketPostKind) {
  const candidateTeams = buildCandidateTeams(split);
  const teamNames = candidateTeams.map(team => team.nombre).join(", ") || "el paddock";
    const rating = Number(pilot.rating_piloto ?? 70);
  const points = Number(pilot.puntos_piloto ?? 0);
  const clause = Number(pilot.clausula_actual ?? 0);

  if (kind === "rookie") {
    return {
      headline: `Rookie drafteado: ${pilot.nombre} rompe el guion`,
      body: `${pilot.nombre} llega como rookie y ya mete ruido en el mercado. Con ${rating} OVR, ${points} puntos y una cláusula de ${clause}M, el paddock lo mira como una apuesta de futuro. Los focos apuntan a ${teamNames}.`,
    };
  }

  if (kind === "regreso") {
    return {
      headline: `¿Vuelve ${pilot.nombre} a la parrilla?`,
      body: `${pilot.nombre} lleva fuera de la liga desde que dejó su última escudería, pero el nombre no deja de sonar en el paddock. Con ${rating} OVR de referencia, cualquier regreso apuntaría a ${teamNames}.`,
    };
  }

  return {
    headline: `Deadline Watch: ${pilot.nombre} agita el mercado`,
    body: `${pilot.nombre} aparece en la lista de agentes libres con ${points} puntos, ${rating} OVR y una cláusula de ${clause}M. El rumor ya suena fuerte y los destinos más lógicos pasan por ${teamNames}.`,
  };
}

export function MarketDeadlineView({ readOnly = false }: { readOnly?: boolean }) {
  const { run: runOnce, pending: pendingOnce } = useSingleFlight();
  const { user, userData } = useAuth();
  const { splits } = useSplits();
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Splits reales con mercado propio: cada uno tiene su propia sección de rumores, no solo
  // el que esté activo ahora mismo.
  const marketSplits = useMemo(() => {
    return (splits || [])
      .filter((split: any) => split.id !== "global" && split.tipo !== "individual")
      .sort((a: any, b: any) => Number(a.orden ?? 999) - Number(b.orden ?? 999));
  }, [splits]);

  const [selectedSplitId, setSelectedSplitId] = useState("");
  const defaultSplitId = useMemo(() => {
    return marketSplits.find((split: any) => split.activo)?.id
      || marketSplits[marketSplits.length - 1]?.id
      || "";
  }, [marketSplits]);

  const marketSplit = useMemo(() => {
    const id = marketSplits.some((split: any) => split.id === selectedSplitId) ? selectedSplitId : defaultSplitId;
    return marketSplits.find((split: any) => split.id === id) || null;
  }, [marketSplits, selectedSplitId, defaultSplitId]);

  const freeAgents = useMemo(() => {
    return (marketSplit?.roster || [])
      .filter((pilot: any) => pilot.equipoId === "agente_libre")
      .sort((a: any, b: any) => (Number(b.rating_piloto ?? 0) - Number(a.rating_piloto ?? 0)) || (Number(b.puntos_piloto ?? 0) - Number(a.puntos_piloto ?? 0)));
  }, [marketSplit]);

  const rookies = useMemo(() => {
    return (marketSplit?.roster || [])
      .filter((pilot: any) => pilot.rookie)
      .sort((a: any, b: any) => (Number(b.rating_piloto ?? 0) - Number(a.rating_piloto ?? 0)) || (Number(b.puntos_piloto ?? 0) - Number(a.puntos_piloto ?? 0)));
  }, [marketSplit]);

  // Piloto global sin ficha en el roster del split de mercado: no está en ningún equipo ni
  // en la bolsa de agentes libres porque en algún split anterior se marcó "deja la liga".
  const { pilotos } = usePilotos();
  const exPilotos = useMemo(() => {
    const enRoster = new Set((marketSplit?.roster || []).map((pilot: any) => pilot.pilotoId));
    return (pilotos || [])
      .filter(piloto => !enRoster.has(piloto.id))
      .map(piloto => ({ pilotoId: piloto.id, nombre: piloto.nombre, rating_piloto: piloto.rating_piloto ?? 70 }))
      .sort((a, b) => Number(b.rating_piloto ?? 0) - Number(a.rating_piloto ?? 0));
  }, [pilotos, marketSplit]);

  const seasonSummaries = useMemo(() => {
    return (splits || []).filter((split: any) => split.completado && split.circuitos?.length).map((split: any) => {
      const winner = [...(split.roster || [])].sort((a, b) => Number(b.puntos_piloto ?? 0) - Number(a.puntos_piloto ?? 0))[0];
      const poles = (split.roster || []).map((pilot: any) => ({
        name: pilot.nombre,
        value: split.circuitos.reduce((total: number, race: any) => total + (race.resultados || []).filter((result: any) => result.pilotoId === pilot.pilotoId && result.qualyPos === 1).length, 0),
      })).sort((a, b) => b.value - a.value)[0];
      const team = [...(split.equipos || [])].sort((a, b) => Number(b.puntos_constructores ?? 0) - Number(a.puntos_constructores ?? 0))[0];
      return { id: split.id, name: split.nombre, winner: winner?.nombre || "Sin ganador", points: winner?.puntos_piloto ?? 0, team: team?.nombre || "Sin ganador", poles: poles?.name || "Sin datos", poleCount: poles?.value || 0 };
    });
  }, [splits]);

  const isAdmin = userData?.rol === "admin";

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "market_posts"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as MarketPost[];
      setPosts(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return unsub;
  }, []);

  // Cada split tiene su propio muro: un rumor de Split 2 no debe mezclarse con el de Split 3.
  const splitPosts = useMemo(() => posts.filter(post => post.splitId === marketSplit?.id), [posts, marketSplit]);

  const publishPost = async (pilot: any, kind: MarketPostKind) => {
    return runOnce(async () => {
    if (!user || !userData || !marketSplit) return;
    setPublishingId(pilot.pilotoId);
    try {
      const draft = createCopy(pilot, marketSplit, kind);
      await addDoc(collection(db, "market_posts"), {
        splitId: marketSplit.id,
        pilotId: pilot.pilotoId,
        pilotName: pilot.nombre,
        kind,
        headline: draft.headline,
        body: draft.body,
        candidateTeams: buildCandidateTeams(marketSplit),
        rating: Number(pilot.rating_piloto ?? 0),
        points: Number(pilot.puntos_piloto ?? 0),
        rookie: !!pilot.rookie,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        authorName: userData.nombre || "Admin",
      });
    } finally {
      setPublishingId(null);
    }
  });
};

  const removePost = async (postId: string) => {
    return runOnce(async () => {
    if (!isAdmin) return;
    await deleteDoc(doc(db, "market_posts", postId));
  });
};

  if (!marketSplit) {
    return (
      <div className="border border-line bg-surface-2 p-6 text-center text-ink-muted font-mono text-[10px] uppercase tracking-[0.3em]">
        No hay split de mercado disponible
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="m-card border border-line bg-gradient-to-r from-brand-soft via-surface-2 to-surface p-4 md:p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-1 h-5 bg-brand" />
          <p className="text-[12px] font-bold text-brand md:font-mono md:text-[9px] md:uppercase md:tracking-[0.35em]">Deadline Market</p>
        </div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-3xl font-bold uppercase tracking-[-0.03em] md:tracking-[-0.04em]">Rumores, rookies y humo de paddock</h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-2 md:text-sm">
              Posts para calentar el mercado del {marketSplit.nombre}. Cada agente libre puede tener su propio rumor y cada rookie, su anuncio de llegada.
            </p>
          </div>
          {marketSplit.activo && (
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-ink-muted">
              <CalendarClock className="w-4 h-4 text-brand" /> {marketSplit.nombre} activo
            </div>
          )}
        </div>
        {marketSplits.length > 1 && (
          <div className="m-rail hide-scrollbar mt-4 gap-2 md:gap-1.5">
            {marketSplits.map((split: any) => (
              <button
                key={split.id}
                onClick={() => setSelectedSplitId(split.id)}
                className={`min-h-10 shrink-0 rounded-full px-3 text-[12px] font-bold transition-colors md:min-h-0 md:rounded-none md:py-1.5 md:text-[10px] md:font-bold md:uppercase md:tracking-widest ${
                  marketSplit.id === split.id
                    ? "bg-brand text-brand-ink"
                    : "bg-surface-2 text-ink-muted border border-line hover:border-line hover:text-ink-2"
                }`}
              >
                {split.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {seasonSummaries.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {seasonSummaries.map(summary => (
            <article key={summary.id} className="m-card border border-warn/40 bg-warn-soft p-4 md:p-5">
              <div className="flex items-center gap-2 text-warn text-[9px] font-mono uppercase tracking-[0.28em]"><TrendingUp className="w-4 h-4" /> Resumen del mundial · {summary.name}</div>
              <h3 className="mt-3 text-xl font-bold uppercase">El mundial ya tiene dueño</h3>
              <p className="mt-2 text-sm text-ink-2 leading-relaxed">{summary.winner} se corona campeón de pilotos con {summary.points} puntos. {summary.team} domina el mundial de equipos. En clasificación, {summary.poles} lideró las poles{summary.poleCount ? ` con ${summary.poleCount}` : ""}.</p>
            </article>
          ))}
        </div>
      )}

      {!readOnly && isAdmin && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="m-card border border-line bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-4 h-4 text-brand" />
              <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-ink-muted">Agentes libres</span>
            </div>
            <div className="space-y-2">
              {freeAgents.length > 0 ? freeAgents.map((pilot: any) => {
                const draft = createCopy(pilot, marketSplit, "rumor");
                return (
                  <div key={pilot.pilotoId} className="m-card flex flex-col gap-3 border border-line bg-surface-2 p-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-bold uppercase tracking-tight">{pilot.nombre}</p>
                      <p className="text-[10px] text-ink-muted font-mono">{pilot.rating_piloto ?? 70} OVR · {pilot.puntos_piloto ?? 0} PTS · {pilot.clausula_actual ?? 0}M</p>
                    </div>
                    <button aria-busy={pendingOnce || undefined}
                      onClick={() => publishPost(pilot, "rumor")}
                      disabled={(publishingId === pilot.pilotoId) || pendingOnce}
                      className="min-h-11 rounded-xl bg-brand px-3 text-[13px] font-bold text-brand-ink transition-colors hover:bg-brand-hover disabled:opacity-40 md:min-h-0 md:rounded-none md:py-2 md:text-[10px] md:font-bold md:uppercase md:tracking-[0.2em]"
                    >
                      {publishingId === pilot.pilotoId ? "Publicando..." : "Publicar rumor"}
                    </button>
                    <p className="text-[10px] text-ink-muted leading-relaxed md:hidden">{draft.headline}</p>
                  </div>
                );
              }) : (
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-ink-muted">No hay agentes libres en {marketSplit.nombre}.</p>
              )}
            </div>
          </div>

          <div className="m-card border border-line bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-warn" />
              <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-ink-muted">Rookies drafteados</span>
            </div>
            <div className="space-y-2">
              {rookies.length > 0 ? rookies.map((pilot: any) => (
                <div key={pilot.pilotoId} className="m-card flex flex-col gap-3 border border-line bg-surface-2 p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-bold uppercase tracking-tight">{pilot.nombre}</p>
                    <p className="text-[10px] text-ink-muted font-mono">{pilot.rating_piloto ?? 70} OVR · debutante</p>
                  </div>
                  <button aria-busy={pendingOnce || undefined}
                    onClick={() => publishPost(pilot, "rookie")}
                    disabled={(publishingId === pilot.pilotoId) || pendingOnce}
                    className="min-h-11 rounded-xl border border-warn/40 bg-warn-soft px-3 text-[13px] font-bold text-warn transition-colors hover:bg-warn-soft disabled:opacity-40 md:min-h-0 md:rounded-none md:py-2 md:text-[10px] md:font-bold md:uppercase md:tracking-[0.2em]"
                  >
                    {publishingId === pilot.pilotoId ? "Publicando..." : "Publicar rookie"}
                  </button>
                </div>
              )) : (
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-ink-muted">No hay rookies detectados en {marketSplit.nombre}.</p>
              )}
            </div>
          </div>

          <div className="m-card border border-line bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserX className="w-4 h-4 text-violet" />
              <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-ink-muted">Ex-pilotos</span>
            </div>
            <div className="space-y-2">
              {exPilotos.length > 0 ? exPilotos.map((pilot) => (
                <div key={pilot.pilotoId} className="m-card flex flex-col gap-3 border border-line bg-surface-2 p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-bold uppercase tracking-tight">{pilot.nombre}</p>
                    <p className="text-[10px] text-ink-muted font-mono">{pilot.rating_piloto} OVR · fuera de la parrilla</p>
                  </div>
                  <button aria-busy={pendingOnce || undefined}
                    onClick={() => publishPost(pilot, "regreso")}
                    disabled={(publishingId === pilot.pilotoId) || pendingOnce}
                    className="min-h-11 rounded-xl border border-violet/40 bg-violet-soft px-3 text-[13px] font-bold text-violet transition-colors hover:bg-violet-soft disabled:opacity-40 md:min-h-0 md:rounded-none md:py-2 md:text-[10px] md:font-bold md:uppercase md:tracking-[0.2em]"
                  >
                    {publishingId === pilot.pilotoId ? "Publicando..." : "Publicar rumor"}
                  </button>
                </div>
              )) : (
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-ink-muted">No hay expilotos fuera de la parrilla.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {splitPosts.length > 0 ? splitPosts.map(post => (
          <article key={post.id} className="m-card border border-line bg-surface-2 p-4 md:p-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] font-mono uppercase tracking-[0.25em] px-2 py-1 border ${
                    post.kind === "rookie" ? "border-warn/40 text-warn bg-warn-soft"
                      : post.kind === "regreso" ? "border-violet/40 text-violet bg-violet-soft"
                      : "border-brand/25 text-brand bg-brand/10"
                  }`}>
                    {post.kind === "rookie" ? "Rookie draft" : post.kind === "regreso" ? "Rumor de regreso" : "Rumor de mercado"}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-ink-muted">{post.authorName}</span>
                </div>
                <h3 className="mt-3 text-lg font-bold uppercase tracking-[-0.03em] md:text-xl">{post.headline}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-2 md:text-sm">{post.body}</p>
              </div>
              {isAdmin && !readOnly && (
                <button aria-busy={pendingOnce || undefined} disabled={pendingOnce} onClick={() => removePost(post.id)} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted hover:text-danger transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Borrar
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-ink-muted">
              <span className="px-2 py-1 border border-line">{post.pilotName}</span>
              {post.kind !== "regreso" && <span className="px-2 py-1 border border-line">{post.points ?? 0} pts</span>}
              <span className="px-2 py-1 border border-line">{post.rating ?? 0} ovr</span>
              {post.candidateTeams.slice(0, 3).map(team => (
                <span key={team.id} className="px-2 py-1 border border-line text-ink-2">{team.nombre}</span>
              ))}
            </div>
          </article>
        )) : (
          <div className="border border-dashed border-line bg-surface-2 p-8 text-center">
            <ShieldAlert className="w-8 h-8 mx-auto text-ink-muted" />
            <p className="mt-3 text-[10px] font-mono uppercase tracking-[0.3em] text-ink-muted">Todavía no hay posts del deadline en {marketSplit.nombre}</p>
          </div>
        )}
      </div>
    </section>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Receipt, UserPlus, Users } from "lucide-react";
import { useSplits, useUsuarios } from "../hooks/useData";
import { PilotCardF1 } from "./PilotCardF1";
import { formatearMillones } from "../services/auctionService";
import { fetchTeamLedger } from "../services/readModelService";
import type { LedgerEntry, LedgerView } from "../services/readModels";
import type { LedgerSource } from "../types";
import { Badge, Card, EmptyState, Button, Notice, StatusPill, cn } from "./ui";

interface TeamEconomyViewProps {
  splitId: string;
  /** Se mantiene por compatibilidad con quien lo monta; el jeque nunca gestiona saldos desde aquí. */
  canManage?: boolean;
  escuderiaId?: string;
}

/** Etiquetas de cada fuente del ledger. Ninguna se fusiona con otra. */
const SOURCE_LABEL: Record<LedgerSource, string> = {
  points: "Puntos de carrera",
  pole: "Pole",
  fastestLap: "Vuelta rápida",
  participation: "Participación",
  cleanTeam: "Equipo sin sancionados",
  rivalry: "Rivalidad",
  seasonPrize: "Premio de temporada",
  transfer: "Fichajes y cláusulas",
  priceAdjustment: "Ajuste de precio de compra",
  manualAdjustment: "Ajuste manual del administrador",
  other: "Otros movimientos",
};

const SOURCE_ORDER: LedgerSource[] = [
  "points", "pole", "fastestLap", "participation", "cleanTeam", "rivalry", "seasonPrize",
  "transfer", "priceAdjustment", "manualAdjustment", "other",
];

function signedMillions(value: number): string {
  const abs = formatearMillones(Math.abs(value));
  return value > 0 ? `+${abs}` : value < 0 ? `−${abs}` : abs;
}

function formatDate(ms: number | null): string {
  return ms == null ? "Sin fecha" : new Date(ms).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

/** Una cifra con su etiqueta; el valor nunca se sustituye por 0 si no se conoce. */
function Figure({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "brand" }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums text-ink md:text-3xl", tone === "brand" && "text-brand")}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

type LedgerState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; view: LedgerView };

function LedgerSection({ splitId, teamId, teamName, balance, circuitNames }: {
  splitId: string; teamId: string; teamName?: string; balance: number | null; circuitNames: Map<string, string>;
}) {
  const [state, setState] = useState<LedgerState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<LedgerSource | "all">("all");

  const load = useCallback(() => {
    let alive = true;
    setState({ status: "loading" });
    fetchTeamLedger(splitId, teamId, balance, teamName)
      .then(view => { if (alive) setState({ status: "ready", view }); })
      .catch(() => { if (alive) setState({ status: "error", message: "No se pudieron leer los movimientos. No se muestra ningún saldo inventado." }); });
    return () => { alive = false; };
  }, [splitId, teamId, teamName, balance]);

  useEffect(() => load(), [load, attempt]);

  return (
    <Card as="section" aria-labelledby="ledger-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="ledger-title" className="flex items-center gap-2 text-lg font-bold text-ink">
          <Receipt aria-hidden="true" className="h-5 w-5 text-brand" /> Movimientos
        </h3>
        {state.status === "ready" && state.view.state === "ok" && <StatusPill tone="ok">Conciliado</StatusPill>}
        {state.status === "ready" && state.view.state === "pending_reconciliation" && <StatusPill tone="warn">Pendiente de conciliar</StatusPill>}
      </div>

      {state.status === "loading" && <p role="status" className="py-6 text-center text-sm text-ink-muted">Cargando movimientos…</p>}

      {state.status === "error" && (
        <Notice tone="danger" title="Error de carga" action={<Button size="sm" onClick={() => setAttempt(n => n + 1)}>Reintentar</Button>}>
          {state.message}
        </Notice>
      )}

      {state.status === "ready" && (() => {
        const { view } = state;
        const sources = SOURCE_ORDER.filter(s => view.netBySource[s] !== undefined);
        const entries = filter === "all" ? view.entries : view.entries.filter(e => e.source === filter);
        return (
          <>
            {view.state === "balance_unknown" && (
              <Notice tone="warn" title="Saldo no disponible">
                La escudería no tiene un saldo registrado. Los movimientos se muestran tal como constan; el administrador debe conciliar el saldo.
              </Notice>
            )}
            {view.state === "pending_reconciliation" && (
              <Notice tone="warn" title="Saldo pendiente de conciliar">
                El saldo actual no coincide con el último movimiento que guardó su saldo posterior. El administrador lo revisa; la web no corrige saldos.
              </Notice>
            )}
            {view.state === "empty" && (
              <EmptyState icon={Receipt} title="Sin movimientos" description="Cuando el administrador registre ingresos, fichajes o ajustes, aparecerán aquí con su referencia." />
            )}
            {view.entries.length > 0 && (
              <>
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">Desglose por fuente (neto)</p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {sources.map(source => {
                      const net = view.netBySource[source] ?? 0;
                      const active = filter === source;
                      return (
                        <li key={source}>
                          <button
                            type="button"
                            aria-pressed={active}
                            onClick={() => setFilter(active ? "all" : source)}
                            className={cn(
                              "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 text-left text-sm transition-colors",
                              active ? "border-brand bg-brand-soft" : "border-line bg-surface-2 hover:border-line-strong",
                            )}
                          >
                            <span className="text-ink-2">{SOURCE_LABEL[source]}</span>
                            <span className={cn("font-bold tabular-nums", net > 0 ? "text-ok" : net < 0 ? "text-danger" : "text-ink-muted")}>{signedMillions(net)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {filter !== "all" && <Button variant="ghost" size="sm" className="mt-2" onClick={() => setFilter("all")}>Ver todos los movimientos</Button>}
                </div>

                <ul className="divide-y divide-line rounded-lg border border-line">
                  {entries.map(entry => (
                    <LedgerRow key={entry.id || `${entry.dateMs}-${entry.concept}`} entry={entry} circuitNames={circuitNames}
                      open={openId === (entry.id || entry.reference)} onToggle={() => setOpenId(id => id === (entry.id || entry.reference) ? null : (entry.id || entry.reference))} />
                  ))}
                </ul>
              </>
            )}
          </>
        );
      })()}
    </Card>
  );
}

function LedgerRow({ entry, circuitNames, open, onToggle }: { entry: LedgerEntry; circuitNames: Map<string, string>; open: boolean; onToggle: () => void }) {
  const gp = entry.circuitId ? circuitNames.get(entry.circuitId) ?? entry.circuitId : null;
  const title = entry.concept || SOURCE_LABEL[entry.source];
  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
            <span>{formatDate(entry.dateMs)}</span>
            {gp && <span>· GP {gp}</span>}
            <Badge tone="neutral">{SOURCE_LABEL[entry.source]}</Badge>
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className={cn("block text-sm font-bold tabular-nums", entry.signedAmount > 0 ? "text-ok" : entry.signedAmount < 0 ? "text-danger" : "text-ink")}>{signedMillions(entry.signedAmount)}</span>
          <span className="block text-xs tabular-nums text-ink-muted">{entry.balanceAfter === null ? "Saldo no registrado" : `Saldo ${formatearMillones(entry.balanceAfter)}`}</span>
        </span>
        {open ? <ChevronUp aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-muted" /> : <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-muted" />}
      </button>
      {open && (
        <dl className="grid gap-x-6 gap-y-2 border-t border-line bg-surface-2 px-3 py-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-ink-muted">Concepto</dt><dd className="text-ink">{entry.concept || "Sin descripción"}</dd></div>
          <div><dt className="text-xs text-ink-muted">Fuente</dt><dd className="text-ink">{SOURCE_LABEL[entry.source]}</dd></div>
          {entry.pilot && <div><dt className="text-xs text-ink-muted">Piloto</dt><dd className="text-ink">{entry.pilot}</dd></div>}
          {gp && <div><dt className="text-xs text-ink-muted">Carrera</dt><dd className="text-ink">GP {gp}</dd></div>}
          <div><dt className="text-xs text-ink-muted">Referencia</dt><dd className="break-all font-mono text-xs text-ink">{entry.reference || "Sin referencia"}</dd></div>
          <div><dt className="text-xs text-ink-muted">Importe</dt><dd className="text-ink">{signedMillions(entry.signedAmount)} ({entry.signedAmount >= 0 ? "ingreso" : "gasto"})</dd></div>
        </dl>
      )}
    </li>
  );
}

export function TeamEconomyView({ splitId, escuderiaId }: TeamEconomyViewProps) {
  const { splits } = useSplits();
  const { usuarios } = useUsuarios();
  const split = useMemo(() => splits.find((s: any) => s.id === splitId), [splits, splitId]);

  const getPilotPhoto = (pilotId: string) => {
    const u = (usuarios || []).find((u: any) => u.uid === pilotId || u.piloto_id === pilotId);
    if (u?.foto_url) return u.foto_url;
    for (const s of splits || []) {
      const p = (s.roster || []).find((r: any) => r.pilotoId === pilotId);
      if (p?.foto_url) return p.foto_url;
    }
    return "";
  };

  const equipos = useMemo(() => {
    if (!split || split.tipo === "individual") return [];
    return (split.equipos || [])
      .filter((e: any) => e.id !== "agente_libre")
      .map((e: any) => {
        const pilotos = (split.roster || []).filter((p: any) => p.equipoId === e.id && p.participa_hasta == null);
        const valorPilotos = pilotos.reduce((sum: number, p: any) => sum + (p.clausula_actual ?? 0), 0);
        const presupuesto = typeof e.presupuesto === "number" && Number.isFinite(e.presupuesto) ? e.presupuesto : null;
        return { ...e, presupuesto, pilotos, valorPilotos, valorTotal: presupuesto === null ? null : presupuesto + valorPilotos };
      });
  }, [split]);

  const miEquipo = useMemo(() => (escuderiaId ? equipos.find((e: any) => e.id === escuderiaId) : null), [equipos, escuderiaId]);
  const otros = equipos.filter((e: any) => e.id !== escuderiaId);
  const agentesLibres = useMemo(() => {
    if (!split) return [];
    return (split.roster || [])
      .filter((p: any) => p.equipoId === "agente_libre" && p.participa_hasta == null)
      .sort((a: any, b: any) => Number(b.rating_piloto ?? 0) - Number(a.rating_piloto ?? 0));
  }, [split]);
  const circuitNames = useMemo(() => new Map<string, string>((split?.circuitos ?? []).map((c: any) => [c.id, c.nombre])), [split]);

  if (!split) {
    return <EmptyState title="Split no encontrado" description="Todavía no hay una temporada disponible para consultar." />;
  }

  return (
    <section className="space-y-4 md:space-y-6" aria-label="Economía y plantillas">
      <Notice tone="info">
        Esta pantalla es de consulta. Los fichajes, renovaciones, cláusulas y ajustes de saldo se ejecutan cuando la liga los anuncia por WhatsApp y el administrador los registra; aparecen aquí una vez registrados.
      </Notice>

      {escuderiaId && !miEquipo && (
        <EmptyState title="No encontramos tu escudería en este split" description="Si acabas de recibirla, vuelve a entrar en unos minutos o consulta con el administrador." />
      )}

      {miEquipo && (
        <>
          <Card as="section" accent="var(--c-brand)" aria-labelledby="mi-escuderia">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-surface-2">
                {miEquipo.logo_url
                  ? <img src={miEquipo.logo_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  : <span className="text-xs font-bold text-ink-muted">{String(miEquipo.nombre ?? "EQ").slice(0, 2).toUpperCase()}</span>}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand">Tu escudería · {split.nombre}</p>
                <h2 id="mi-escuderia" className="truncate text-xl font-bold text-ink md:text-2xl">{miEquipo.nombre}</h2>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Figure label="Presupuesto disponible" tone="brand"
                value={miEquipo.presupuesto === null ? "No disponible" : formatearMillones(miEquipo.presupuesto)}
                hint={miEquipo.presupuesto === null ? "Saldo pendiente de conciliar" : undefined} />
              <Figure label="Valor de las fichas" value={formatearMillones(miEquipo.valorPilotos)} hint="Suma de cláusulas actuales" />
              <Figure label="Valor total" value={miEquipo.valorTotal === null ? "No disponible" : formatearMillones(miEquipo.valorTotal)} />
              <Figure label="Puntos del equipo" value={String(miEquipo.puntos_constructores ?? 0)} />
            </div>
          </Card>

          <Card as="section" aria-labelledby="plantilla-title">
            <h3 id="plantilla-title" className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
              <Users aria-hidden="true" className="h-5 w-5 text-brand" /> Plantilla ({miEquipo.pilotos.length})
            </h3>
            {miEquipo.pilotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {miEquipo.pilotos.map((p: any, i: number) => (
                  <PilotCardF1
                    key={`${miEquipo.id}-${p.pilotoId}-${i}`}
                    pilot={p}
                    team={miEquipo}
                    getPilotPhoto={getPilotPhoto}
                    size="sm"
                    showPrice={true}
                    footer={
                      <div className="space-y-1 border border-t-0 border-line bg-surface-2 px-2 py-1.5 text-[11px] text-ink-muted">
                        <div className="flex justify-between"><span>Cláusula</span><span className="font-bold text-ink">{p.clausula_actual || 0}M</span></div>
                        {p.congelado && <div className="flex justify-between"><span>Estado</span><span className="font-bold text-info">Congelado</span></div>}
                      </div>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="Sin pilotos contratados" description="Los fichajes aparecen cuando el administrador los registra." />
            )}
          </Card>

          <LedgerSection splitId={splitId} teamId={miEquipo.id} teamName={miEquipo.nombre} balance={miEquipo.presupuesto} circuitNames={circuitNames} />
        </>
      )}

      {otros.length > 0 && (
        <Card as="section" aria-labelledby="otras-escuderias">
          <h3 id="otras-escuderias" className="mb-3 text-lg font-bold text-ink">{miEquipo ? "Otras escuderías" : "Escuderías"}</h3>
          <ul className="divide-y divide-line">
            {otros.map((e: any) => (
              <li key={e.id}>
                <details className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">{e.nombre}</span>
                      <span className="block text-xs text-ink-muted">{e.pilotos.length} pilotos · {e.puntos_constructores ?? 0} pts</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold tabular-nums text-ink">{e.presupuesto === null ? "No disponible" : formatearMillones(e.presupuesto)}</span>
                      <span className="block text-xs text-ink-muted">Presupuesto</span>
                    </span>
                  </summary>
                  <div className="pb-3 text-sm text-ink-2">
                    <p className="mb-1 text-xs text-ink-muted">Valor de las fichas: {formatearMillones(e.valorPilotos)}</p>
                    {e.pilotos.length > 0
                      ? <p>{e.pilotos.map((p: any) => p.nombre).join(" · ")}</p>
                      : <p className="text-ink-muted">Sin pilotos contratados.</p>}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {agentesLibres.length > 0 && (
        <Card as="section" aria-labelledby="agentes-libres">
          <details>
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-lg font-bold text-ink">
              <UserPlus aria-hidden="true" className="h-5 w-5 text-ok" />
              <span id="agentes-libres">Agentes libres ({agentesLibres.length})</span>
            </summary>
            <ul className="mt-3 divide-y divide-line">
              {agentesLibres.map((p: any, i: number) => (
                <li key={`libre-${p.pilotoId}-${i}`} className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate font-semibold text-ink">{p.nombre}</span>
                  <span className="shrink-0 text-xs text-ink-muted">OVR {p.rating_piloto ?? "—"} · {p.clausula_actual || 0}M</span>
                </li>
              ))}
            </ul>
          </details>
        </Card>
      )}
    </section>
  );
}

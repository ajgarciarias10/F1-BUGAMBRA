import { useMemo, useState } from "react";
import { Loader2, UserPlus, UserX, Wallet, Users } from "lucide-react";
import { useSplits, useUsuarios } from "../hooks/useData";
import { PilotCardF1 } from "./PilotCardF1";
import { StatusBanner, useConfirm } from "./Feedback";
import { formatearMillones } from "../services/auctionService";

interface TeamEconomyViewProps {
  splitId: string;
  canManage: boolean;
  escuderiaId?: string;
}

export function TeamEconomyView({ splitId, escuderiaId }: TeamEconomyViewProps) {
  // Los acuerdos tradicionales y los ajustes los documenta administración.
  const canManage = false;
  const { splits } = useSplits();
  const { usuarios } = useUsuarios();
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  // Una sola operación a la vez: sin esto, dos toques seguidos en «Fichar» disparaban dos
  // veces `ficharPiloto` y el presupuesto se descontaba dos veces.
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<{ message: string; tone: "info" | "exito" | "error" } | null>(null);
  const { confirm, confirmDialog } = useConfirm();
  const split = useMemo(() => splits.find((s: any) => s.id === splitId), [splits, splitId]);
  const isAuctionEnabled = split?.mercado_subasta_activado === true;
  // La misma regla que ya aplicaba `sacarPilotoASubasta`: con la ventana cerrada no se
  // mueve nadie. Sin esto, la cabecera decía «Mercado cerrado» y los botones seguían vivos.
  const mercadoAbierto = split?.fichajes_abiertos === true;

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
        const pilotos = (split.roster || [])
          .filter((p: any) => p.equipoId === e.id && p.participa_hasta == null);
        const valorPilotos = pilotos.reduce((sum: number, p: any) => sum + (p.clausula_actual ?? 0), 0);
        return {
          ...e,
          pilotos,
          valorPilotos,
          valorTotal: (e.presupuesto || 0) + valorPilotos,
        };
      });
  }, [split]);

  const miEquipo = useMemo(() => {
    if (!escuderiaId) return null;
    return equipos.find((e: any) => e.id === escuderiaId);
  }, [equipos, escuderiaId]);

  const agentesLibres = useMemo(() => {
    if (!split) return [];
    return (split.roster || [])
      .filter((p: any) => p.equipoId === "agente_libre" && p.participa_hasta == null)
      .sort((a: any, b: any) => (Number(b.rating_piloto ?? 0) - Number(a.rating_piloto ?? 0)));
  }, [split]);

  const handleBudgetChange = async (teamId: string) => {
    const newBudget = Number(budgetInput.replace(",", "."));
    if (!Number.isFinite(newBudget) || newBudget < 0) {
      setStatus({ tone: "error", message: "El presupuesto tiene que ser un número igual o mayor que cero." });
      return;
    }
    setBusy(`budget:${teamId}`);
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../services/firebase");
      await updateDoc(doc(db, `splits/${splitId}/equipos`, teamId), { presupuesto: newBudget });
      setEditingBudget(null);
      setBudgetInput("");
      setStatus({ tone: "exito", message: `Presupuesto actualizado a ${formatearMillones(newBudget)}.` });
    } catch (err: any) {
      setStatus({ tone: "error", message: `No se ha podido actualizar el presupuesto: ${err.message}` });
    } finally {
      setBusy(null);
    }
  };

  /**
   * Alta de un piloto en una escudería.
   *
   * `teamId` es siempre el equipo que PAGA y se lleva al piloto. Antes, el botón de
   * cláusula pasaba aquí el equipo vendedor, así que se le cobraba al dueño y el piloto se
   * quedaba donde estaba.
   */
  const handleSignPilot = async (
    teamId: string,
    pilotId: string,
    precio: number,
    tipo: "fichaje" | "clausula" = "fichaje",
  ) => {
    if (busy) return;
    if (!mercadoAbierto) {
      setStatus({ tone: "error", message: "La ventana de fichajes está cerrada. El admin la abre desde el panel de control." });
      return;
    }
    const team = equipos.find((e: any) => e.id === teamId);
    const pilot = split?.roster?.find((p: any) => p.pilotoId === pilotId);
    if (!team) {
      setStatus({ tone: "error", message: "No se encuentra la escudería compradora." });
      return;
    }

    if (precio > 0 && team.presupuesto < precio) {
      setStatus({ tone: "error", message: `${team.nombre} tiene ${formatearMillones(team.presupuesto)} y la operación cuesta ${formatearMillones(precio)}.` });
      return;
    }

    const esClausula = tipo === "clausula";
    const ok = await confirm({
      title: esClausula ? "Ejecutar cláusula" : "Fichar piloto",
      body: esClausula
        ? `${pilot?.nombre || "El piloto"} pasa a ${team.nombre} por ${formatearMillones(precio)}. El importe sale de tu presupuesto y la operación no se puede deshacer desde aquí.`
        : `${pilot?.nombre || "El piloto"} ficha por ${team.nombre} por ${formatearMillones(precio)}. El importe sale de tu presupuesto.`,
      confirmLabel: esClausula ? "Ejecutar cláusula" : "Fichar",
    });
    if (!ok) return;

    setBusy(`sign:${pilotId}`);
    try {
      const { ficharPiloto } = await import("../services/economyService");
      const result = await ficharPiloto({
        splitId,
        teamId,
        teamName: team.nombre || teamId,
        pilotoId: pilotId,
        pilotName: pilot?.nombre || pilotId,
        tipo,
        precio,
      });
      setStatus({ tone: result.success ? "exito" : "error", message: result.message });
    } catch (err: any) {
      setStatus({ tone: "error", message: `No se ha podido completar el fichaje: ${err.message}` });
    } finally {
      setBusy(null);
    }
  };

  /**
   * Liberar deja al piloto sin escudería, no lo borra.
   *
   * Antes se hacía `deleteDoc` de su ficha: como el plantel del split se deriva de
   * `equipos/{id}/pilotos`, el piloto desaparecía de la temporada entera en vez de pasar a
   * la lista de agentes libres, que es lo que anunciaba el mensaje.
   */
  const handleReleasePilot = async (teamId: string, pilotId: string) => {
    if (busy) return;
    if (!mercadoAbierto) {
      setStatus({ tone: "error", message: "La ventana de fichajes está cerrada: no se puede liberar a nadie hasta que el admin la abra." });
      return;
    }
    const pilot = split?.roster?.find((p: any) => p.pilotoId === pilotId);
    const ok = await confirm({
      title: "Liberar piloto",
      body: `${pilot?.nombre || "El piloto"} pasa a la lista de agentes libres y cualquier escudería podrá ficharlo. No se recupera el dinero invertido.`,
      confirmLabel: "Liberar",
      tone: "peligro",
    });
    if (!ok) return;

    setBusy(`release:${pilotId}`);
    try {
      const { deleteDoc, doc, getDoc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../services/firebase");
      const origen = doc(db, `splits/${splitId}/equipos/${teamId}/pilotos`, pilotId);
      const ficha = await getDoc(origen);
      if (!ficha.exists()) {
        setStatus({ tone: "error", message: "Ese piloto ya no está en la plantilla." });
        return;
      }
      await setDoc(doc(db, `splits/${splitId}/equipos/agente_libre/pilotos`, pilotId), {
        ...ficha.data(),
        equipoId: "agente_libre",
      });
      await deleteDoc(origen);
      setStatus({ tone: "exito", message: `${pilot?.nombre || "El piloto"} ya figura como agente libre.` });
    } catch (err: any) {
      setStatus({ tone: "error", message: `No se ha podido liberar al piloto: ${err.message}` });
    } finally {
      setBusy(null);
    }
  };

  if (!split) {
    return (
      <div className="border border-white/10 bg-white/[0.02] p-6 text-center text-white/30 font-mono text-[10px] uppercase tracking-[0.3em]">
        Split no encontrado
      </div>
    );
  }

  return (
    <section className="space-y-6" aria-label="Economía y fichajes">
      <div className="m-card border border-white/10 bg-gradient-to-r from-[#e10600]/15 via-white/[0.03] to-white/[0.02] p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1 h-5 bg-[#e10600]" />
              <p className="text-[12px] font-black text-[#e10600] md:font-mono md:text-[9px] md:uppercase md:tracking-[0.35em]">Economía del Split</p>
            </div>
            <h2 className="text-xl md:text-3xl font-black uppercase tracking-[-0.03em] md:tracking-[-0.04em]">
              {isAuctionEnabled ? "Subasta activada" : "Mercado directo · Gestión de plantillas"}
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/55 md:text-sm">
              {!mercadoAbierto
                ? "La ventana de fichajes está cerrada: aquí ves el estado económico de cada escudería, pero no se puede fichar ni liberar hasta que el admin la abra."
                : isAuctionEnabled
                  ? "La sala de subasta está disponible en la pestaña Mercado. Aquí ves el estado económico de cada escudería."
                  : "Los acuerdos tradicionales y los ajustes de cláusulas los registra administración. Aquí puedes consultar los saldos y las plantillas."}
            </p>
          </div>
          <div className="shrink-0 border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/35">Modo de mercado</p>
            <p className={`mt-1 text-sm font-black uppercase tracking-tight ${isAuctionEnabled ? "text-sky-300" : "text-white/80"}`}>
              {isAuctionEnabled ? "Sala de pujas" : "Fichaje directo"}
            </p>
            <p className="mt-1 text-[10px] leading-snug text-white/35">Lo cambia el admin en Roster → Subasta en vivo.</p>
          </div>
        </div>
      </div>

      {status && (
        <StatusBanner message={status.message} tone={status.tone} onDismiss={() => setStatus(null)} />
      )}

      {miEquipo && (
        <div className="m-card bg-white/[0.02] border border-white/20 p-6 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-[#e10600]/10 rounded-full pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 w-full md:w-auto">
              <div className="w-20 h-20 rounded-sm overflow-hidden border-2 border-white/10 bg-white/[0.02] shrink-0 flex items-center justify-center">
                {(miEquipo as any).logo_url ? (
                  <img src={(miEquipo as any).logo_url} alt={miEquipo.nombre} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-2">
                    <span className="text-[8px] font-mono text-white/20 uppercase tracking-tighter">{miEquipo.nombre ? miEquipo.nombre.substring(0, 2).toUpperCase() : 'EQ'}</span>
                  </div>
                )}
              </div>
              <div>
                <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-[#e10600] font-black block mb-1">TU ESCUDERÍA</span>
                <h3 className="text-2xl font-black italic text-white uppercase tracking-tight">{miEquipo.nombre}</h3>
                <p className="text-[10px] text-white/40 uppercase font-mono mt-0.5">Presupuesto y plantilla para {split.nombre}</p>
              </div>
            </div>
            <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
              <div>
                <h4 className="text-[9px] uppercase font-bold tracking-[0.15em] text-[#e10600] mb-1">Presupuesto Disponible</h4>
                <div className="flex items-baseline gap-0.5">
                  {editingBudget === miEquipo.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor="presupuesto-mi-equipo">Presupuesto de {miEquipo.nombre} en millones</label>
                      <input
                        id="presupuesto-mi-equipo"
                        type="text"
                        inputMode="decimal"
                        value={budgetInput}
                        onChange={(e) => setBudgetInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleBudgetChange(miEquipo.id);
                          if (e.key === "Escape") { setEditingBudget(null); setBudgetInput(""); }
                        }}
                        autoFocus
                        className="w-28 border border-white/20 bg-black/40 px-2 py-1 text-3xl font-extrabold italic leading-none text-white outline-none focus:border-[#e10600]"
                      />
                      <button
                        onClick={() => handleBudgetChange(miEquipo.id)}
                        disabled={busy === `budget:${miEquipo.id}`}
                        className="min-h-9 bg-[#e10600] px-3 text-[10px] font-black uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#ff241c] disabled:opacity-40"
                      >
                        {busy === `budget:${miEquipo.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar"}
                      </button>
                      <button
                        onClick={() => { setEditingBudget(null); setBudgetInput(""); }}
                        className="min-h-9 border border-white/10 px-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/50 transition-colors hover:text-white"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold italic text-white leading-none">{miEquipo.presupuesto.toFixed(1)}</span>
                      <span className="text-xl font-bold text-white/50">M</span>
                      {canManage && (
                        <button
                          onClick={() => { setEditingBudget(miEquipo.id); setBudgetInput(String(miEquipo.presupuesto)); }}
                          className="ml-3 inline-flex min-h-9 items-center gap-1.5 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <Wallet className="h-3.5 w-3.5" /> Editar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-[#e10600] uppercase font-bold tracking-[0.15em] mb-1">Valor Total de Plantilla</p>
                <div className="flex items-baseline justify-end gap-0.5">
                  <span className="text-2xl font-black italic text-white leading-none">{miEquipo.valorTotal.toFixed(1)}</span>
                  <span className="text-sm font-bold text-white/50">M</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {equipos.map((equipo: any) => (
          <article key={equipo.id} className={`m-card border ${equipo.id === escuderiaId ? "border-[#e10600]/50 bg-[#e10600]/5" : "border-white/10 bg-white/[0.02]"} p-4 md:p-5`}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-sm overflow-hidden border border-white/10 bg-white/[0.02] shrink-0 flex items-center justify-center">
                  {(equipo as any).logo_url ? (
                    <img src={(equipo as any).logo_url} alt={equipo.nombre} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-black uppercase text-white/20 font-mono">
                      {equipo.nombre ? equipo.nombre.substring(0, 2).toUpperCase() : 'EQ'}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-black italic text-white uppercase tracking-tight truncate">{equipo.nombre}</h3>
                  <p className="text-[10px] text-white/40 uppercase font-mono mt-0.5">
                     {equipo.pilotos.length} pilotos · sin límite
                    {equipo.id === escuderiaId && <span className="ml-2 text-[#e10600] font-bold">(TU EQUIPO)</span>}
                  </p>
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => { setEditingBudget(equipo.id); setBudgetInput(String(equipo.presupuesto)); }}
                  className="min-h-9 shrink-0 px-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/60 hover:text-white transition-colors bg-white/5 border border-white/10 rounded-xl md:rounded-none md:py-1.5"
                  aria-label={`Editar presupuesto de ${equipo.nombre}`}
                >
                  <Wallet className="w-3.5 h-3.5 mr-1.5 inline" /> Editar
                </button>
              )}
            </div>

            <div className="space-y-2 mb-4">
              {editingBudget === equipo.id && equipo.id !== escuderiaId ? (
                <div className="flex flex-wrap items-center gap-2 border border-white/10 bg-black/30 p-2">
                  <label className="sr-only" htmlFor={`presupuesto-${equipo.id}`}>Presupuesto de {equipo.nombre} en millones</label>
                  <input
                    id={`presupuesto-${equipo.id}`}
                    type="text"
                    inputMode="decimal"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBudgetChange(equipo.id);
                      if (e.key === "Escape") { setEditingBudget(null); setBudgetInput(""); }
                    }}
                    autoFocus
                    className="w-24 border border-white/20 bg-black/40 px-2 py-1 text-sm font-bold text-white outline-none focus:border-[#e10600]"
                  />
                  <button
                    onClick={() => handleBudgetChange(equipo.id)}
                    disabled={busy === `budget:${equipo.id}`}
                    className="min-h-9 bg-[#e10600] px-3 text-[9px] font-black uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#ff241c] disabled:opacity-40"
                  >
                    {busy === `budget:${equipo.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar"}
                  </button>
                  <button
                    onClick={() => { setEditingBudget(null); setBudgetInput(""); }}
                    className="min-h-9 border border-white/10 px-3 text-[9px] font-black uppercase tracking-[0.15em] text-white/50 transition-colors hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex justify-between text-[11px] font-mono text-white/40">
                  <span>Presupuesto</span>
                  <span className="text-white font-bold tabular-nums">{formatearMillones(equipo.presupuesto)}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] font-mono text-white/40">
                <span>Valor pilotos</span>
                <span className="text-white font-bold tabular-nums">{formatearMillones(equipo.valorPilotos)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-mono text-white/40 border-t border-white/5 pt-2">
                <span className="font-bold">Valor total</span>
                <span className="text-white font-black tabular-nums text-[#e10600]">{formatearMillones(equipo.valorTotal)}</span>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3">
              <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Plantilla ({equipo.pilotos.length})
              </h4>
              {equipo.pilotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {equipo.pilotos.map((p: any, i: number) => (
                    <div
                      key={`${equipo.id}-${p.pilotoId}-${i}`}
                      className="m-card bg-white/[0.02] border border-white/10 p-2 relative"
                    >
                      <PilotCardF1
                        pilot={p}
                        team={equipo}
                        getPilotPhoto={getPilotPhoto}
                        size="sm"
                        showPrice={true}
                        footer={!p.congelado ? (
                          <div className="bg-white/[0.02] border border-t-0 border-white/[0.06] px-2 py-1.5 space-y-1">
                            <div className="flex justify-between text-[8px] font-mono text-white/40">
                              <span>Cláusula</span>
                              <span className="text-[#e10600] font-bold">{p.clausula_actual || 0}M</span>
                            </div>
                            {canManage && miEquipo && p.equipoId !== escuderiaId && (() => {
                              const precio = p.clausula_actual || 0;
                              const sinDinero = miEquipo.presupuesto < precio;
                              const cargando = busy === `sign:${p.pilotoId}`;
                              return (
                                <button
                                  onClick={() => handleSignPilot(miEquipo.id, p.pilotoId, precio, "clausula")}
                                  disabled={!!busy || !mercadoAbierto || sinDinero}
                                  title={!mercadoAbierto ? "La ventana de fichajes está cerrada" : sinDinero ? "Presupuesto insuficiente" : `Pagar ${formatearMillones(precio)} y llevártelo a ${miEquipo.nombre}`}
                                  className="mt-1 flex w-full min-h-9 items-center justify-center gap-1.5 rounded border border-[#e10600]/30 bg-[#e10600]/10 px-2 text-[9px] font-black uppercase tracking-[0.1em] text-[#e10600] transition-colors hover:bg-[#e10600]/20 disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  {cargando && <Loader2 className="h-3 w-3 animate-spin" />}
                                  {cargando ? "Fichando…" : "Ejecutar cláusula"}
                                </button>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="bg-white/[0.02] border border-t-0 border-white/[0.06] px-2 py-1.5">
                            <div className="flex justify-between text-[8px] font-mono text-white/40">
                              <span>Estado</span>
                              <span className="text-blue-400 font-bold">❄ Congelado</span>
                            </div>
                          </div>
                        )}
                      />
                      {canManage && equipo.id === escuderiaId && !p.congelado && (
                        <button
                          onClick={() => handleReleasePilot(equipo.id, p.pilotoId)}
                          disabled={!!busy || !mercadoAbierto}
                          title={mercadoAbierto ? `Liberar a ${p.nombre}` : "La ventana de fichajes está cerrada"}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 flex items-center justify-center disabled:opacity-30"
                          aria-label={`Liberar a ${p.nombre}`}
                        >
                          {busy === `release:${p.pilotoId}`
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <UserX className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/20 italic text-xs uppercase tracking-widest font-mono py-4 text-center">Sin pilotos contratados</p>
              )}
            </div>
          </article>
        ))}

        {agentesLibres.length > 0 && (
          <article className="m-card border border-white/10 bg-white/[0.02] p-4 md:p-5">
            <h3 className="text-lg font-black italic text-white uppercase tracking-tight mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" /> Agentes Libres ({agentesLibres.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {agentesLibres.map((p: any, i: number) => (
                <div key={`libre-${p.pilotoId}-${i}`} className="m-card bg-white/[0.02] border border-white/10 p-2">
                  <PilotCardF1
                    pilot={p}
                    team={null}
                    getPilotPhoto={getPilotPhoto}
                    size="sm"
                    showPrice={true}
                    footer={canManage && miEquipo ? (
                      <div className="bg-white/[0.02] border border-t-0 border-white/[0.06] px-2 py-1.5">
                        <div className="flex justify-between text-[8px] font-mono text-white/40">
                          <span>Precio</span>
                          <span className="text-emerald-400 font-bold">{p.clausula_actual || 0}M</span>
                        </div>
                        <button
                          onClick={() => handleSignPilot(miEquipo.id, p.pilotoId, p.clausula_actual || 0)}
                           disabled={!!busy || !mercadoAbierto || miEquipo.presupuesto < (p.clausula_actual || 0)}
                          title={!mercadoAbierto
                            ? "La ventana de fichajes está cerrada"
                            : miEquipo.presupuesto < (p.clausula_actual || 0)
                              ? "Presupuesto insuficiente"
                              : `Fichar por ${formatearMillones(p.clausula_actual || 0)}`}
                          className="mt-1 flex w-full min-h-9 items-center justify-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          {busy === `sign:${p.pilotoId}` && <Loader2 className="h-3 w-3 animate-spin" />}
                          {busy === `sign:${p.pilotoId}` ? "Fichando…" : "Fichar"}
                        </button>
                      </div>
                    ) : undefined}
                  />
                </div>
              ))}
            </div>
          </article>
        )}
      </div>

      {confirmDialog}
    </section>
  );
}

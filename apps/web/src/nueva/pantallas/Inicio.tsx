import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { useLiga } from "../datos/useLiga";
import type { EquipoTemporada, GpTemporada, PilotoTemporada, Temporada } from "../datos/tipos";
import type { Role } from "../../contexts/AuthContext";
import type { AvisoOficial } from "../../types";
import { fetchLatestOfficialNotice } from "../../services/readModelService";
import { Kpi } from "../ui/Kpi";
import { rutaDe } from "../shell/secciones";

export interface ResumenInicio {
  equipo: EquipoTemporada | null;
  piloto: PilotoTemporada | null;
  saldo: number | null;
  proximoGp: GpTemporada | null;
  actasPendientes: number;
  economiasPendientes: number;
  lider: EquipoTemporada | null;
}

/** Solo el rol dueño de un equipo ve su saldo. La ausencia de saldo no equivale a cero. */
export function resumenInicio(temporada: Temporada | null, rol: Role, equipoId: string | null, pilotoId: string | null): ResumenInicio {
  const esEquipo = rol === "jeque" || rol === "director_deportivo";
  const equipo = esEquipo && equipoId ? temporada?.equipos.find(e => e.equipoId === equipoId) ?? null : null;
  const piloto = rol === "piloto" && pilotoId ? temporada?.pilotos[pilotoId] ?? null : null;
  const gps = temporada?.gps ?? [];
  const lider = temporada?.equipos.length ? [...temporada.equipos].sort((a, b) => b.puntos - a.puntos)[0] : null;
  return {
    equipo, piloto, saldo: equipo?.saldoActual ?? null,
    proximoGp: gps.find(g => !g.disputada) ?? null,
    actasPendientes: gps.filter(g => g.disputada && !g.actaCerrada).length,
    economiasPendientes: gps.filter(g => g.disputada && !g.economiaProcesada).length,
    lider,
  };
}

type AvisoEstado = { tipo: "cargando" } | { tipo: "error" } | { tipo: "listo"; aviso: AvisoOficial | null };

export function Inicio() {
  const { userData } = useAuth();
  const { liga, loading, error, retry } = useLiga();
  const [aviso, setAviso] = useState<AvisoEstado>({ tipo: "cargando" });
  const [intento, setIntento] = useState(0);
  const temporada = liga.actual;
  const resumen = useMemo(() => resumenInicio(temporada, userData?.rol ?? null, userData?.escuderia_id ?? null, userData?.piloto_id ?? (userData?.rol === "piloto" ? userData.uid : null)), [temporada, userData]);

  useEffect(() => {
    let vigente = true;
    fetchLatestOfficialNotice().then(
      notice => { if (vigente) setAviso({ tipo: "listo", aviso: notice }); },
      () => { if (vigente) setAviso({ tipo: "error" }); },
    );
    return () => { vigente = false; };
  }, [intento]);

  if (loading) return <p role="status">Cargando la liga…</p>;
  if (error) return <section role="alert"><p>No se pudo cargar la liga.</p><button className="nui-button" onClick={retry}>Reintentar</button></section>;
  if (!temporada) return <section><h1>Inicio</h1><p>Todavía no hay una temporada activa.</p></section>;

  const nombre = userData?.nombre || "miembro de la liga";
  const rol = userData?.rol;
  const fecha = resumen.proximoGp?.fecha ? new Date(`${resumen.proximoGp.fecha}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long" }) : "Fecha por confirmar";
  return <div className="mx-auto max-w-6xl space-y-8 text-[color:var(--text-main)]">
    <header className="flex flex-wrap items-end justify-between gap-5 border-b pb-6" style={{ borderColor: "var(--border-color)" }}>
      <div><span className="nui-eyebrow">{temporada.nombre} · F1 Bugambra</span><h1 className="text-3xl font-bold lg:text-4xl">Hola, {nombre}</h1></div>
      <nav className="flex flex-wrap gap-2" aria-label="Accesos de inicio"><Link className="nui-button inline-flex items-center" to={rutaDe("carreras")}>Resultados y actas</Link><Link className="nui-button nui-button--primary inline-flex items-center" to={rutaDe("campeonato")}>Clasificación</Link></nav>
    </header>
    <div className="grid gap-4 sm:grid-cols-2">
      <Kpi etiqueta="Próximo GP" valor={resumen.proximoGp ? `GP ${resumen.proximoGp.numero} · ${resumen.proximoGp.nombre}` : "Temporada completada"} detalle={resumen.proximoGp ? fecha : "Consulta los resultados de la temporada"} />
      {resumen.equipo ? <Kpi etiqueta="Mi equipo" valor={resumen.equipo.nombre} detalle={`${resumen.equipo.puntos} puntos · ${temporada.equipos.filter(e => e.puntos > resumen.equipo!.puntos).length + 1}.º`} />
        : rol === "admin" ? <Kpi etiqueta="Pendiente del comisario" valor={resumen.actasPendientes} unidad="actas" detalle={<><span>{resumen.economiasPendientes} GP sin economía procesada</span><br/><Link to={rutaDe("adminCarreras")}>Ir a carreras y actas →</Link></>} tono={resumen.actasPendientes || resumen.economiasPendientes ? "aviso" : "normal"} />
          : rol === "piloto" ? <Kpi etiqueta="Mi piloto" valor={resumen.piloto?.nombre ?? "Sin piloto enlazado"} detalle={resumen.piloto ? `${resumen.piloto.puntos} puntos en ${temporada.nombre}` : "Consulta tu perfil para ver tu trayectoria"} />
            : <Kpi etiqueta={`Líder de ${temporada.nombre}`} valor={resumen.lider?.nombre ?? "Sin clasificación"} detalle={resumen.lider ? `${resumen.lider.puntos} puntos` : undefined} />}
      {resumen.equipo && <Kpi etiqueta={`Saldo disponible · ${resumen.equipo.nombre}`} valor={resumen.saldo === null ? "Saldo no disponible" : `${resumen.saldo.toLocaleString("es-ES")} M`} detalle={<Link to={rutaDe("miEscuderia")}>Ir a Mi escudería →</Link>} tono={resumen.saldo === null ? "aviso" : "positivo"} />}
      <div className="nui-kpi"><span className="nui-eyebrow">Último aviso oficial</span>{aviso.tipo === "cargando" ? <p role="status">Cargando aviso…</p> : aviso.tipo === "error" ? <p role="alert">No se pudo cargar el aviso. <button className="nui-button" onClick={() => { setAviso({ tipo: "cargando" }); setIntento(n => n + 1); }}>Reintentar</button></p> : aviso.aviso ? <><h2>{aviso.aviso.titulo}</h2><p className="nui-muted">{aviso.aviso.texto}</p></> : <p className="nui-muted">Sin avisos publicados</p>}</div>
    </div>
  </div>;
}

export default Inicio;

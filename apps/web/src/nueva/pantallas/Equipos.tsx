import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { useUsuarios } from "../../hooks/useData";
import type { Usuario } from "../../types";
import {
  cambiosDePlantilla, cartaDeTemporada, clasificacionDuos, clasificacionEquipos,
  clasificacionPilotos, evolucionEscuderias, saldosEntreSplits, useLiga,
  type AportePiloto, type Liga, type PactoPiloto, type PactosSplit, type PilotoTemporada, type Temporada,
} from "../datos";
import { CartaPilotoModal } from "../ui/CartaPilotoModal";
import { ControlSegmentado } from "../ui/ControlSegmentado";
import { Evolucion } from "../ui/Evolucion";
import { TarjetaDuo } from "../ui/TarjetaDuo";
import { TarjetaEquipo } from "../ui/TarjetaEquipo";
import { TarjetaPiloto, type AparienciaEquipo } from "../ui/TarjetaPiloto";
import { TemporadasRail, type GrupoTemporadas } from "../ui/TemporadasRail";

const dinero = (valor: number | null) => valor === null ? "—" : `${valor.toLocaleString("es-ES", { maximumFractionDigits: 2 })} M€`;
const numero = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
const estilos = new URL("../ui/nueva.css", import.meta.url).href;

function aparienciaEquipo(nombre: string, logoUrl?: string): AparienciaEquipo {
  const clave = nombre.toLowerCase();
  if (clave.includes("zenith")) return { color: "var(--team-zenith)", fondo: "var(--team-zenith-dark)", logoUrl };
  if (clave.includes("roses")) return { color: "var(--team-roses)", fondo: "var(--team-roses-dark)", logoUrl };
  if (clave.includes("alfa")) return { color: "var(--team-alfa)", fondo: "var(--team-alfa-dark)", logoUrl };
  return { color: "#717a88", fondo: "#202632", logoUrl };
}

export function fichaEquipo(liga: Liga, temporada: Temporada, equipoId: string) {
  const clasificada = clasificacionEquipos(temporada).find(f => f.fila.equipoId === equipoId);
  if (!clasificada) return null;
  const equipo = clasificada.fila;
  const pilotos = equipo.pilotos.map(id => temporada.pilotos[id]).filter((p): p is PilotoTemporada => !!p);
  const cambio = temporada.tipo === "split" ? cambiosDePlantilla(liga, temporada.id).find(c => c.equipoId === equipoId) : null;
  return {
    equipo, pilotos, puesto: clasificada.puesto, aportes: equipo.porPiloto,
    saldo: temporada.enCurso ? equipo.saldoActual : equipo.saldoCierre,
    altas: cambio?.altas ?? [], bajas: cambio?.bajas ?? [],
  };
}

/** Solo se anuncia un fichaje cuando la lectura del traspaso confirma equipo y precio. */
export function textoFichaje(pacto: PactoPiloto | undefined, equipoNombre: string, splitNombre: string): string | null {
  if (!pacto?.traspaso || pacto.traspaso.estado === "pendiente") return null;
  return `Fichado para el ${splitNombre} con ${equipoNombre} · ${dinero(pacto.traspaso.precio)}`;
}

function gruposTemporadas(liga: Liga): GrupoTemporadas[] {
  const opcion = (t: Temporada) => ({
    id: t.id, nombre: t.nombre, tipo: t.tipo, enCurso: t.enCurso,
    detalle: `${t.gps.length} GP${t.enCurso ? " · en curso" : ""}`,
  });
  return [
    ...(liga.origins ? [{ id: "origins", nombre: "Origins · por dúos", temporadas: [opcion(liga.origins)] }] : []),
    ...(liga.temporada1 ? [{ id: "temporada1", nombre: "Temporada 1 · por escuderías", temporadas: [opcion(liga.temporada1), ...liga.splits.map(opcion)] }] : []),
  ];
}

function responsables(equipoId: string, usuarios: readonly Usuario[]) {
  const personas = usuarios.filter(u => u.escuderia_id === equipoId && (u.rol === "jeque" || u.rol === "director_deportivo"));
  return personas.map(u => `${u.rol === "jeque" ? "Jeque" : "D. D."}: ${u.nombre}`).join(" · ");
}

function ProximoSplit({ pactos, liga, abrirPiloto }: { pactos: PactosSplit; liga: Liga; abrirPiloto: (id: string) => void }) {
  const actual = liga.actual;
  const siguiente = pactos.siguiente?.nombre ?? `Split ${liga.splits.length + 1}`;
  const anunciados = Object.values(pactos.porPiloto).filter(p => p.traspaso && p.traspaso.estado !== "pendiente");
  if (!actual) return null;
  return <section aria-labelledby="proximo-split"><h2 id="proximo-split">Plantillas previstas · {siguiente}</h2>
    <p className="nui-muted">{anunciados.length} fichajes registrados o pactados. Los pilotos sin acuerdo siguen sin decidir.</p>
    <div className="nui-demo-grid">{actual.equipos.map(e => {
      const pilotos = anunciados.filter(p => p.traspaso?.equipoId === e.equipoId);
      const plantilla = pactos.porEquipo[e.equipoId];
      return <article key={e.equipoId} className="nui-kpi"><h3>{e.nombre}</h3>
        {pilotos.length ? <ul>{pilotos.map(p => <li key={p.pilotoId}><button type="button" className="nui-button" onClick={() => abrirPiloto(p.pilotoId)}>{p.nombre}</button> · {dinero(p.traspaso!.precio)}</li>)}</ul> : <p className="nui-muted">Sin fichajes confirmados.</p>}
        {plantilla && plantilla.siguen.length > 0 && <p>Siguen: {plantilla.siguen.map(p => p.nombre).join(", ")}</p>}
        {plantilla && plantilla.sinDecidir.length > 0 && <p>Sin decidir: {plantilla.sinDecidir.map(p => p.nombre).join(", ")}</p>}
      </article>;
    })}</div>
  </section>;
}

export function Equipos() {
  const { liga, splits, pactos, loading, error } = useLiga();
  const { usuarios } = useUsuarios();
  const [params, setParams] = useSearchParams();
  const temporada = liga.temporadas.find(t => t.id === params.get("temporada")) ?? liga.actual ?? liga.origins;
  const equipoId = params.get("equipo");
  const pilotoId = params.get("piloto");
  const vista = params.get("vista") === "saldo" ? "saldo" : "puntos";
  const cambiar = (clave: string, valor: string | null) => setParams(prev => {
    const next = new URLSearchParams(prev);
    if (valor === null) next.delete(clave); else next.set(clave, valor);
    if (clave === "temporada") { next.delete("equipo"); next.delete("piloto"); }
    return next;
  });
  const ficha = temporada && equipoId ? fichaEquipo(liga, temporada, equipoId) : null;
  const carta = temporada && pilotoId ? cartaDeTemporada(temporada, pilotoId) : null;
  const equipoCarta = temporada?.equipos.find(e => e.equipoId === carta?.equipoId);
  const aparienciaCarta = aparienciaEquipo(equipoCarta?.nombre ?? "Individual", equipoCarta?.logoUrl);
  const evolucion = useMemo(() => temporada && temporada.tipo !== "individual"
    ? evolucionEscuderias(liga, splits, temporada.tipo === "agregada" ? temporada : liga.temporada1 ?? temporada)
    : null, [liga, splits, temporada]);
  if (loading && !temporada) return <p role="status">Cargando equipos…</p>;
  if (error) return <p role="alert">No se pudieron cargar los equipos: {String(error)}</p>;
  if (!temporada) return <p>No hay temporadas disponibles.</p>;
  const apertura = (id: string) => cambiar("piloto", id);
  const nombrePiloto = (id: string) => temporada.pilotos[id]?.nombre ?? liga.splits.flatMap(s => Object.values(s.pilotos)).find(p => p.pilotoId === id)?.nombre ?? id;
  const siguienteNombre = pactos?.siguiente?.nombre ?? `Split ${liga.splits.length + 1}`;
  return <main className="nui-demo"><link rel="stylesheet" href={estilos} />
    <h1>Escuderías y pilotos</h1>
    <TemporadasRail grupos={gruposTemporadas(liga)} seleccion={temporada.id} onSeleccionar={id => cambiar("temporada", id)} />
    {ficha ? <section aria-labelledby="titulo-equipo">
      <button type="button" className="nui-button" onClick={() => cambiar("equipo", null)}>← Todas las escuderías</button>
      <h2 id="titulo-equipo">{ficha.equipo.nombre} · {temporada.nombre}</h2>
      <div className="nui-demo-grid">
        <div className="nui-kpi"><span className="nui-eyebrow">Clasificación</span><p className="nui-kpi-value">{ficha.puesto}.º · {numero(ficha.equipo.puntos)} pts</p></div>
        <div className="nui-kpi"><span className="nui-eyebrow">Saldo de salida</span><p className="nui-kpi-value">{dinero(ficha.equipo.saldoApertura)}</p></div>
        <div className="nui-kpi"><span className="nui-eyebrow">{temporada.enCurso ? "Saldo actual" : "Saldo de cierre"}</span><p className="nui-kpi-value">{dinero(ficha.saldo)}</p></div>
      </div>
      <p className="nui-muted">{responsables(ficha.equipo.equipoId, usuarios)}</p>
      {temporada.id === liga.actual?.id && pactos?.porEquipo[ficha.equipo.equipoId] && <div className="nui-kpi">
        <h3>Próximo split · {siguienteNombre}</h3>
        {pactos.porEquipo[ficha.equipo.equipoId].llegan.length ? <ul>{pactos.porEquipo[ficha.equipo.equipoId].llegan.map(p => <li key={p.pilotoId}>
          {textoFichaje(pactos.porPiloto[p.pilotoId], ficha.equipo.nombre, siguienteNombre) ?? `${p.nombre} · incorporación registrada`}
        </li>)}</ul> : <p className="nui-muted">Sin incorporaciones registradas.</p>}
      </div>}
      <h3>Plantilla y puntos</h3>
      <div className="nui-demo-grid">{ficha.pilotos.map(p => {
        const c = cartaDeTemporada(temporada, p.pilotoId);
        if (!c) return null;
        const fichaje = temporada.id === liga.actual?.id ? textoFichaje(pactos?.porPiloto[p.pilotoId], liga.actual.equipos.find(e => e.equipoId === pactos?.porPiloto[p.pilotoId]?.traspaso?.equipoId)?.nombre ?? "", siguienteNombre) : null;
        return <div key={p.pilotoId}><TarjetaPiloto piloto={{ ...c, equipoId: ficha.equipo.equipoId, equipoNombre: ficha.equipo.nombre, puntos: ficha.aportes[p.pilotoId]?.puntos ?? p.puntos }} apariencia={aparienciaEquipo(ficha.equipo.nombre, ficha.equipo.logoUrl)} onAbrir={() => apertura(p.pilotoId)} />
          <p>{numero(ficha.aportes[p.pilotoId]?.puntos ?? p.puntos)} pts para la escudería · {ficha.aportes[p.pilotoId]?.splits.join(", ")}</p>{fichaje && <p>{fichaje}</p>}</div>;
      })}</div>
      {ficha.altas.length + ficha.bajas.length > 0 && <p>Respecto al split anterior: altas {ficha.altas.map(nombrePiloto).join(", ") || "—"} · bajas {ficha.bajas.map(nombrePiloto).join(", ") || "—"}.</p>}
      {evolucion && (() => { const serie = evolucion.series.find(s => s.equipoId === ficha.equipo.equipoId); if (!serie) return null;
        return <><h3>Evolución de {ficha.equipo.nombre} · GP a GP y entre splits</h3>
          <ControlSegmentado etiqueta="Medida de evolución" opciones={[{ valor: "puntos", etiqueta: "Puntos" }, { valor: "saldo", etiqueta: "Saldo" }]} valor={vista} onCambiar={v => cambiar("vista", v)} />
          <Evolucion titulo={`${vista === "puntos" ? "Puntos acumulados" : "Saldo"} de ${ficha.equipo.nombre}`} columnas={evolucion.columnas}
            series={[{ id: serie.equipoId, nombre: serie.nombre, color: aparienciaEquipo(ficha.equipo.nombre).color,
              valores: vista === "puntos" ? serie.puntosAcumulados : serie.saldoTrasGp.map(s => s.saldo),
              saldos: vista === "saldo" ? serie.saldoTrasGp : undefined }]}
            nota={vista === "saldo" ? "Los huecos indican saldos que no constan en el GP; no se estiman." : undefined} />
          <h3>Saldo entre splits</h3><ol>{saldosEntreSplits(liga, ficha.equipo.equipoId).map((s, i) => <li key={`${s.splitId}-${i}`}>{s.clave === "inicio" ? "Inicio" : s.clave === "actual" ? "Actual" : "Cierre"} de {s.split}: {dinero(s.saldo)}</li>)}</ol></>;
      })()}
    </section> : <>
      <section><h2>{temporada.tipo === "individual" ? "Dúos" : "Escuderías"} · {temporada.nombre}</h2>
        <p className="nui-muted">{temporada.tipo === "individual" ? "Origins se corrió por dúos, sin escuderías ni economía." : "Plantillas, puntos y saldos de la temporada. Abre una escudería para ver su evolución."}</p>
        <div className="nui-demo-grid">{temporada.tipo === "individual" ? clasificacionDuos(temporada).map(({ fila, puesto }) =>
          <TarjetaDuo key={fila.id} duo={fila} pilotos={fila.pilotoIds.map(id => temporada.pilotos[id]).filter((p): p is PilotoTemporada => !!p)} puesto={puesto} temporada={temporada.nombre} />) :
          clasificacionEquipos(temporada).map(({ fila, puesto }) => {
            const p = fila.pilotos.map(id => temporada.pilotos[id]).filter((x): x is PilotoTemporada => !!x);
            const valoraciones = p.map(x => x.rating).filter((n): n is number => n !== null);
            return <div key={fila.equipoId}><TarjetaEquipo equipo={fila} pilotos={p} apariencia={aparienciaEquipo(fila.nombre, fila.logoUrl)} puesto={puesto}
              mediaOvr={valoraciones.length ? Math.round(valoraciones.reduce((a, b) => a + b, 0) / valoraciones.length) : null}
              responsables={responsables(fila.equipoId, usuarios)} onAbrir={() => cambiar("equipo", fila.equipoId)} onPiloto={apertura} />
              <p>Salida {dinero(fila.saldoApertura)} · {temporada.enCurso ? "Actual" : "Cierre"} {dinero(temporada.enCurso ? fila.saldoActual : fila.saldoCierre)}</p></div>;
          })}</div>
      </section>
      {temporada.tipo === "split" && cambiosDePlantilla(liga, temporada.id).length > 0 && <section><h2>Cambios respecto al split anterior</h2>
        <div className="nui-demo-grid">{cambiosDePlantilla(liga, temporada.id).map(c => <article key={c.equipoId} className="nui-kpi"><h3>{temporada.equipos.find(e => e.equipoId === c.equipoId)?.nombre}</h3><p>Altas: {c.altas.map(nombrePiloto).join(", ") || "—"}</p><p>Bajas: {c.bajas.map(nombrePiloto).join(", ") || "—"}</p></article>)}</div>
      </section>}
      {temporada.tipo === "agregada" && <section><h2>Pilotos que han pasado por cada escudería</h2>
        {clasificacionEquipos(temporada).map(({ fila }) => <article key={fila.equipoId} className="nui-kpi"><h3>{fila.nombre}</h3><ul>{Object.entries(fila.porPiloto).map(([id, aporte]: [string, AportePiloto]) => <li key={id}><button type="button" className="nui-button" onClick={() => apertura(id)}>{nombrePiloto(id)}</button> · {numero(aporte.puntos)} pts · {aporte.splits.join(", ")}</li>)}</ul></article>)}
      </section>}
      {temporada.id === liga.actual?.id && pactos && <ProximoSplit pactos={pactos} liga={liga} abrirPiloto={apertura} />}
    </>}
    <section><h2>Pilotos de la parrilla ({Object.keys(temporada.pilotos).length})</h2>
      <div className="nui-demo-grid">{clasificacionPilotos(temporada).map(({ fila }) => {
        const c = cartaDeTemporada(temporada, fila.pilotoId);
        if (!c) return null;
        const e = temporada.equipos.find(x => x.equipoId === c.equipoId);
        const pacto = temporada.id === liga.actual?.id ? pactos?.porPiloto[fila.pilotoId] : undefined;
        const destino = liga.actual?.equipos.find(x => x.equipoId === pacto?.traspaso?.equipoId);
        const fichaje = textoFichaje(pacto, destino?.nombre ?? "", siguienteNombre);
        return <div key={fila.pilotoId}><TarjetaPiloto piloto={c} apariencia={aparienciaEquipo(e?.nombre ?? "Individual", e?.logoUrl)} onAbrir={() => apertura(fila.pilotoId)} />{fichaje && <p>{fichaje}</p>}</div>;
      })}</div>
    </section>
    {carta && <CartaPilotoModal piloto={carta} apariencia={aparienciaCarta} abierto onCerrar={() => cambiar("piloto", null)} />}
  </main>;
}

export default Equipos;

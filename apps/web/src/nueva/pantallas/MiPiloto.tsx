import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { usePilotos } from "../../hooks/useData";
import {
  cartaDeTemporada, evolucionPiloto, trayectoriaPiloto, useLiga,
  type Liga, type ResultadoGp,
} from "../datos";
import { CartaPilotoModal } from "../ui/CartaPilotoModal";
import { Evolucion } from "../ui/Evolucion";
import { TarjetaPiloto, type AparienciaEquipo } from "../ui/TarjetaPiloto";

const estilos = new URL("../ui/nueva.css", import.meta.url).href;

export function pilotoDeCuenta(cuenta: { [key: string]: unknown } | null): string | null {
  return typeof cuenta?.piloto_id === "string" ? cuenta.piloto_id : null;
}

export function textoResultado(resultado: Pick<ResultadoGp, "estado" | "puesto"> | null): string {
  if (!resultado || resultado.estado === "no_corrio") return "NC";
  if (resultado.estado === "dnf") return "DNF";
  if (resultado.estado === "rango_11_20") return "P11–P20";
  if (resultado.estado === "desconocida" || resultado.puesto === null) return "¿?";
  return `P${resultado.puesto}`;
}

export function modeloMiPiloto(liga: Liga, pilotoId: string) {
  const temporadas = liga.temporadas.filter(t => t.pilotos[pilotoId]);
  const actual = liga.actual?.pilotos[pilotoId] ? liga.actual : temporadas.at(-1);
  if (!actual) return null;
  const carta = cartaDeTemporada(actual, pilotoId);
  if (!carta) return null;
  return { carta, evolucion: evolucionPiloto(liga, pilotoId), trayectoria: trayectoriaPiloto(liga, pilotoId), temporadas };
}

function apariencia(nombre: string, logoUrl?: string): AparienciaEquipo {
  const clave = nombre.toLowerCase();
  if (clave.includes("zenith")) return { color: "var(--team-zenith)", fondo: "var(--team-zenith-dark)", logoUrl };
  if (clave.includes("roses")) return { color: "var(--team-roses)", fondo: "var(--team-roses-dark)", logoUrl };
  if (clave.includes("alfa")) return { color: "var(--team-alfa)", fondo: "var(--team-alfa-dark)", logoUrl };
  return { color: "#717a88", fondo: "#202632", logoUrl };
}

export function MiPiloto() {
  const { userData, loading: authLoading } = useAuth();
  const { pilotos } = usePilotos();
  const { liga, loading, error, pactos } = useLiga();
  const [cartaTemporada, setCartaTemporada] = useState<string | null>(null);
  const pilotoId = pilotoDeCuenta(userData);
  const modelo = pilotoId ? modeloMiPiloto(liga, pilotoId) : null;
  if (authLoading || loading && !liga.actual) return <p role="status">Cargando piloto…</p>;
  if (error) return <p role="alert">No se pudo cargar el piloto: {String(error)}</p>;
  if (!pilotoId) return <main className="nui-demo"><h1>Mi piloto</h1><p>Tu cuenta no tiene un piloto vinculado.</p></main>;
  if (!modelo) return <main className="nui-demo"><h1>Mi piloto</h1><p>No hay resultados de este piloto en las temporadas disponibles.</p></main>;
  const { carta, evolucion, trayectoria, temporadas } = modelo;
  const global = pilotos.find(p => p.id === pilotoId);
  const equipo = temporadas.find(t => t.id === carta.temporadaId)?.equipos.find(e => e.equipoId === carta.equipoId);
  const aspecto = apariencia(equipo?.nombre ?? "Individual", equipo?.logoUrl);
  const temporadaVisible = temporadas.find(t => t.id === cartaTemporada);
  const cartaVisible = temporadaVisible ? cartaDeTemporada(temporadaVisible, pilotoId) : null;
  const equipoVisible = temporadas.find(t => t.id === cartaTemporada)?.equipos.find(e => e.equipoId === cartaVisible?.equipoId);
  const pacto = pactos?.porPiloto[pilotoId];
  const destino = liga.actual?.equipos.find(e => e.equipoId === pacto?.traspaso?.equipoId);
  const siguiente = pactos?.siguiente?.nombre ?? `Split ${liga.splits.length + 1}`;
  const color = aspecto.color;
  return <main className="nui-demo"><link rel="stylesheet" href={estilos} />
    <h1>Mi piloto · {carta.nombre}</h1>
    <p className="nui-muted">Ficha, evolución carrera a carrera y trayectoria por temporada.</p>
    <section style={{ maxWidth: 540 }}><TarjetaPiloto piloto={{ ...carta, fotoUrl: carta.fotoUrl ?? global?.foto_url }} apariencia={aspecto} onAbrir={() => setCartaTemporada(carta.temporadaId)} />
      <button type="button" className="nui-button" onClick={() => setCartaTemporada(carta.temporadaId)}>Abrir carta de piloto</button>
      {pacto?.traspaso && pacto.traspaso.estado !== "pendiente" && destino && <p>Fichado para el {siguiente} con {destino.nombre} · {pacto.traspaso.precio.toLocaleString("es-ES", { maximumFractionDigits: 2 })} M€</p>}
    </section>
    <section><h2>Evolución en la Temporada 1</h2>
      <Evolucion titulo={`${carta.nombre} · puntos acumulados`} columnas={evolucion.columnas} unirGrupos
        series={[{ id: pilotoId, nombre: carta.nombre, color, valores: evolucion.serie.acumulado,
          celdas: evolucion.serie.acumulado.map((n, i) => n === null ? "" : <><strong>{n}</strong><small>+{evolucion.serie.porGp[i]}</small></>) }]}
        filasExtra={[{ id: "puesto", etiqueta: "Puesto", celdas: evolucion.resultados.map(textoResultado) }]}
        nota="Cada bloque es un split, con la escudería en la que corrió. NC: no corrió; ¿?: posición no registrada." />
    </section>
    <section><h2>Resultados por GP</h2>
      <div style={{ overflowX: "auto" }}><table className="nui-card-results" style={{ width: "100%" }}><thead><tr><th scope="col">GP</th><th scope="col">Split</th><th scope="col">Resultado</th><th scope="col">Puntos</th></tr></thead>
        <tbody>{evolucion.columnas.map((c, i) => <tr key={`${c.grupo}-${c.circuitoId}`}><th scope="row">GP {c.numero} · {c.nombre}</th><td>{c.grupo}</td><td>{c.pendiente ? "Por disputar" : textoResultado(evolucion.resultados[i])}</td><td>{evolucion.serie.porGp[i] ?? "—"}</td></tr>)}</tbody>
      </table></div>
    </section>
    <section><h2>Trayectoria por temporada</h2>
      <div className="nui-demo-grid">{trayectoria.map(t => {
        const tem = temporadas.find(s => s.id === t.temporadaId)!;
        const nombreEquipo = tem.equipos.find(e => e.equipoId === t.equipoId)?.nombre ?? "Individual";
        return <article key={t.temporadaId} className="nui-kpi"><button type="button" className="nui-button" onClick={() => setCartaTemporada(t.temporadaId)}>{t.temporada}</button>
          <p>{nombreEquipo} · {t.puesto}.º · {t.puntos} pts{t.provisional ? " · en curso" : ""}</p></article>;
      })}</div>
    </section>
    {cartaVisible && <CartaPilotoModal piloto={cartaVisible} apariencia={apariencia(equipoVisible?.nombre ?? "Individual", equipoVisible?.logoUrl)} abierto onCerrar={() => setCartaTemporada(null)} />}
  </main>;
}

export default MiPiloto;

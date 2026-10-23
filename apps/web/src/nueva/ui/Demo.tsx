import { useState } from "react";
import type { CartaPiloto } from "../datos/cartas";
import type { ColumnaGp } from "../datos/temporadas";
import type { SaldoGp } from "../datos/evolucion";
import { BarraSeleccion, CartaPilotoModal, ChipRivalidad, ControlSegmentado, Evolucion, Kpi, TablaAdmin, TarjetaDuo,
  TarjetaEquipo, TarjetaPiloto, TarjetaVideo, TemporadasRail, type AparienciaEquipo, type GrupoTemporadas } from "./index";

const fotos = {
  fabi: new URL("../../../../../docs/redesign/prototipo-gemini/img/piloto-fabi.jpg", import.meta.url).href,
  mimic: new URL("../../../../../docs/redesign/prototipo-gemini/img/piloto-mimic.jpg", import.meta.url).href,
  toni: new URL("../../../../../docs/redesign/prototipo-gemini/img/piloto-toni.jpg", import.meta.url).href,
};
const alfa: AparienciaEquipo = { color: "var(--team-alfa)", fondo: "var(--team-alfa-dark)", logoUrl: "/bugambra-logo.png" };
const carta: CartaPiloto = {
  pilotoId: "mimic", nombre: "Mimic", fotoUrl: fotos.mimic, temporadaId: "s3", temporada: "Split 3",
  equipoId: "alfa", equipoNombre: "Alfa Romero", rating: 89, nivel: "PRO", puntos: 28,
  carreras: 3, victorias: 1, podios: 2, poles: 1, vueltasRapidas: 1, dnfs: 0, limpias: 2, mediaCarrera: 3, mediaPuntos: 9.3,
  evolucion: [
    { circuitoId: "hungria", numero: 13, nombre: "Hungría", estado: "clasificado", puesto: 1, puntos: 12, vueltaRapida: true, pilotoDelDia: false },
    { circuitoId: "paises-bajos", numero: 14, nombre: "Países Bajos", estado: "clasificado", puesto: 3, puntos: 9, vueltaRapida: false, pilotoDelDia: false },
    { circuitoId: "italia", numero: 15, nombre: "Italia", estado: "desconocida", puesto: null, puntos: 7, vueltaRapida: false, pilotoDelDia: false },
  ],
};
const pilotos = [
  { pilotoId: "mimic", nombre: "Mimic", fotoUrl: fotos.mimic, puntos: 28 },
  { pilotoId: "fabi", nombre: "Fabi", fotoUrl: fotos.fabi, puntos: 36 },
  { pilotoId: "toni", nombre: "Toni", fotoUrl: fotos.toni, puntos: 24 },
];
const grupos: GrupoTemporadas[] = [
  { id: "origins", nombre: "Temporada Origins · por dúos", temporadas: [{ id: "origins", nombre: "Origins", tipo: "individual", enCurso: false, detalle: "6 GP · Toni/Fabi" }] },
  { id: "t1", nombre: "Temporada 1 · por escuderías", temporadas: [
    { id: "t1", nombre: "Temporada 1", tipo: "agregada", enCurso: true, detalle: "Total · GP 1–18 · en curso" },
    ...[1, 2, 3].map(n => ({ id: `s${n}`, nombre: `Split ${n}`, tipo: "split" as const, enCurso: n === 3, detalle: `GP ${n * 6 - 5}–${n * 6}` })),
  ] },
];
const circuitos = ["Bélgica", "Japón", "Hungría", "Países Bajos", "Italia", "Imola", "Canadá", "Mónaco"];
const columnas: ColumnaGp[] = circuitos.map((nombre, i) => ({ circuitoId: `gp-${i}`, numero: i + 11, nombre, grupo: i < 2 ? "Split 2" : "Split 3", pendiente: i > 4 }));
const saldos: SaldoGp[] = [
  { saldo: 42, estado: "guardado", reconstruido: true }, { saldo: 50, estado: "guardado", reconstruido: true },
  { saldo: 66.1, estado: "guardado" }, { saldo: null, estado: "desconocido" }, { saldo: 73.2, estado: "registrado" },
  { saldo: null, estado: "pendiente" }, { saldo: null, estado: "pendiente" }, { saldo: null, estado: "pendiente" },
];

/** Galería aislada: cifras ilustrativas, sin conexión a servicios ni escrituras. */
export function Demo() {
  const [temporada, setTemporada] = useState("s3");
  const [vista, setVista] = useState<"puntos" | "saldo">("saldo");
  const [abierta, setAbierta] = useState(false);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [video, setVideo] = useState(false);
  const [tema, setTema] = useState(document.documentElement.classList.contains("dark"));
  return <main className="nui-demo">
    <span className="nui-eyebrow">F1 Bugambra · Galería de componentes</span><h1>La liga, pieza a pieza</h1>
    <p className="nui-muted">Datos de muestra para revisión visual. Las acciones de esta página solo cambian la demo.</p>
    <button type="button" className="nui-button" onClick={() => { document.documentElement.classList.toggle("dark", !tema); setTema(!tema); }}>{tema ? "Usar tema claro" : "Usar tema oscuro"}</button>
    <section aria-label="Selector de temporadas"><TemporadasRail grupos={grupos} seleccion={temporada} onSeleccionar={setTemporada} /><p className="nui-note">Selección de muestra: {temporada}</p></section>
    <section><h2>Evolución alineada</h2>
      <ControlSegmentado<"puntos" | "saldo"> etiqueta="Medida de la evolución" valor={vista} onCambiar={setVista} opciones={[{ valor: "puntos", etiqueta: "Puntos acumulados" }, { valor: "saldo", etiqueta: "Saldo tras cada GP" }]} />
      <Evolucion titulo={vista === "saldo" ? "Saldo de las tres escuderías tras cada GP" : "Puntos de las tres escuderías"} columnas={columnas}
        formato={n => `${n.toLocaleString("es-ES")} ${vista === "saldo" ? "M" : "pts"}`} series={[
          { id: "alfa", nombre: "Alfa Romero", color: "var(--serie-alfa)", valores: vista === "saldo" ? saldos.map(s => s.saldo) : [32, 58, 30, 72, 115, null, null, null], saldos: vista === "saldo" ? saldos : undefined },
          { id: "zenith", nombre: "Zenith", color: "var(--serie-zenith)", dash: "8 4", valores: vista === "saldo" ? [30, 36.3, 53.8, 60.5, 64, null, null, null] : [24, 48, 22, 46, 64, null, null, null] },
          { id: "roses", nombre: "Roses", color: "var(--serie-roses)", dash: "2 4", valores: vista === "saldo" ? [42, 50, 57.9, 60, 66.2, null, null, null] : [18, 38, 12, 20, 42, null, null, null] },
        ]} filasExtra={[{ id: "estado", etiqueta: "Acta", celdas: columnas.map(c => c.pendiente ? "Por disputar" : "Cerrada") }]}
        nota="Ejemplo ilustrativo. Los rombos marcan saldos reconstruidos; los huecos conservan el saldo desconocido. Las columnas rayadas están pendientes." />
    </section>
    <section><h2>Indicadores</h2><div className="nui-demo-grid"><Kpi etiqueta="Puntos" valor="115" unidad="pts" detalle="Split 3 · Alfa Romero" /><Kpi etiqueta="Saldo guardado" valor="66,1" unidad="M" detalle="Ejemplo de saldo tras el GP" /><Kpi etiqueta="Actas pendientes" valor="1" tono="aviso" detalle="Pendiente de revisión" /></div></section>
    <section><h2>Cartas de piloto</h2><div className="nui-demo-grid"><TarjetaPiloto piloto={carta} apariencia={alfa} onAbrir={() => setAbierta(true)} /><TarjetaPiloto piloto={{ ...carta, pilotoId: "fabi", nombre: "Fabi", fotoUrl: fotos.fabi, equipoNombre: "Zenith", puntos: 36, rating: 92, nivel: "ELITE" }} apariencia={{ color: "var(--team-zenith)", fondo: "var(--team-zenith-dark)" }} /></div></section>
    <section><h2>Escuderías y dúos</h2><div className="nui-demo-grid">
      <TarjetaEquipo equipo={{ equipoId: "alfa", nombre: "Alfa Romero", puntos: 115, logoUrl: alfa.logoUrl }} apariencia={alfa} pilotos={[pilotos[0]]} puesto={1} mediaOvr={89} responsables="D.D.: Antonio Ceferi · Plantilla de muestra" onAbrir={() => setMensaje("Detalle de Alfa Romero seleccionado")} onPiloto={() => setAbierta(true)} />
      <TarjetaDuo duo={{ nombre: "Toni/Fabi", puntos: 211 }} pilotos={[pilotos[2], pilotos[1]]} puesto={1} temporada="Origins" />
    </div></section>
    <section><h2>Tabla de administración</h2><TablaAdmin titulo="Economía · ejemplo de lectura" cabecera={<tr><th scope="col" className="sticky-col">Escudería</th><th scope="col">Salida</th><th scope="col">Ingresos</th><th scope="col">Saldo tras GP</th><th scope="col">Origen</th></tr>}>
      <tr><th scope="row" className="sticky-col">Alfa Romero</th><td>50,0 M</td><td className="is-pos">16,1 M</td><td>66,1 M</td><td>Guardado</td></tr>
      <tr><th scope="row" className="sticky-col">Zenith</th><td>36,3 M</td><td className="is-pos">17,5 M</td><td>53,8 M</td><td>Reconstruido</td></tr>
    </TablaAdmin></section>
    <section><h2>Elegir una rivalidad</h2><div className="nui-demo-chips">{pilotos.map(p => <ChipRivalidad key={p.pilotoId} piloto={p} detalle={`${p.puntos} puntos · muestra`} seleccionado={seleccion.includes(p.pilotoId)} onSeleccionar={() => setSeleccion(s => s.includes(p.pilotoId) ? s.filter(id => id !== p.pilotoId) : [...s, p.pilotoId])} />)}</div>
      <BarraSeleccion resumen={seleccion.length ? seleccion.join(" · ") : "Selecciona pilotos"} detalle="Elige 2 o 3 pilotos para previsualizar el grupo" acciones={<><button type="button" className="nui-button" onClick={() => setSeleccion([])} disabled={!seleccion.length}>Limpiar</button><button type="button" className="nui-button nui-button--primary" disabled={seleccion.length < 2} onClick={() => setMensaje("Grupo de muestra preparado; no se ha guardado.")}>Previsualizar grupo</button></>} />
      <p role="status">{mensaje}</p>
    </section>
    <section><h2>Bugambra TV</h2><div className="nui-demo-grid"><TarjetaVideo titulo="Gran Premio de Italia · cámara de Fabi" miniatura="/fom-broadcast.jpeg" duracion="1:24:08" tipo="Carrera" autor="fabiml_204" detalle="GP 15 · Split 3 · Resultado por confirmar" abierto={video} onAlternar={() => setVideo(!video)} reproductor={<p className="nui-demo">Vista de muestra del reproductor.</p>} /></div></section>
    <CartaPilotoModal piloto={carta} apariencia={alfa} abierto={abierta} onCerrar={() => setAbierta(false)} />
  </main>;
}

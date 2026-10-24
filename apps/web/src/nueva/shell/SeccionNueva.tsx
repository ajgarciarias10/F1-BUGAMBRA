import { Suspense } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { useCuentaShell } from "./AppShell";
import { SECCIONES, inicioDe, type ClaveSeccion } from "./secciones";

const cargando = <div role="status" className="ns-obra"><p>Cargando…</p></div>;

/** Marcador hasta que llegue la pantalla de los tickets 16 a 25. */
function EnConstruccion({ clave }: { clave: ClaveSeccion }) {
  const cuenta = useCuentaShell();
  const { search } = useLocation();
  const seccion = SECCIONES[clave];
  let destino = seccion.panelActual(cuenta.conSesion ? cuenta.rol : null);
  // La portada conserva la pestaña pedida (?tab=equipos → /?tab=equipos).
  if (clave === "portada" && search) destino = `/${search}`;
  return (
    <section className="ns-obra" aria-labelledby="ns-obra-titulo">
      <span className="ns-obra-eyebrow">{seccion.sub}</span>
      <h1 id="ns-obra-titulo">{seccion.titulo}</h1>
      <p>Pantalla en construcción</p>
      <Link to={destino} className="ns-obra-enlace">Abrir en el panel actual</Link>
    </section>
  );
}

/** Una sección: su pantalla si ya existe en el registro, si no el marcador. */
export default function SeccionNueva({ clave }: { clave: ClaveSeccion }) {
  const Pantalla = SECCIONES[clave].pantalla;
  if (!Pantalla) return <EnConstruccion clave={clave} />;
  return <Suspense fallback={cargando}><Pantalla /></Suspense>;
}

/** `/nueva` a secas: portada para visitas, inicio con sesión. */
export function IndiceNueva() {
  const { loading } = useAuth();
  const cuenta = useCuentaShell();
  if (loading) return cargando;
  return <Navigate to={inicioDe(cuenta)} replace />;
}

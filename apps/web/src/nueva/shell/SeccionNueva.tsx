import { Suspense } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { useCuentaShell } from "./AppShell";
import { SECCIONES, inicioDe, type ClaveSeccion } from "./secciones";

const cargando = <div role="status" className="ns-obra"><p>Cargando…</p></div>;

/** Abre el panel existente con sus servicios, permisos y guardas de escritura. */
function PanelActual({ clave }: { clave: ClaveSeccion }) {
  const cuenta = useCuentaShell();
  const seccion = SECCIONES[clave];
  const destino = seccion.panelActual(cuenta.conSesion ? cuenta.rol : null);
  return <Navigate to={destino} replace />;
}

/** Una sección: su pantalla implementada o el panel funcional anterior. */
export default function SeccionNueva({ clave }: { clave: ClaveSeccion }) {
  const Pantalla = SECCIONES[clave].pantalla;
  if (!Pantalla) return <PanelActual clave={clave} />;
  return <Suspense fallback={cargando}><Pantalla /></Suspense>;
}

/** `/nueva` a secas: portada para visitas, inicio con sesión. */
export function IndiceNueva() {
  const { loading } = useAuth();
  const cuenta = useCuentaShell();
  if (loading) return cargando;
  return <Navigate to={inicioDe(cuenta)} replace />;
}

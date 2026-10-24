import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DataProvider } from "./hooks/useData";
import { InstallBanner } from "./components/InstallApp";
import { MarketLifecycleProvider } from "./components/MarketLifecycleProvider";
import "./hooks/useTheme";
import { SECCIONES, type ClaveSeccion } from "./nueva/shell/secciones";

const AdminDashboard = lazy(() => import("./components/AdminDashboard").then(module => ({ default: module.AdminDashboard })));
const JequeDashboard = lazy(() => import("./components/Dashboards").then(module => ({ default: module.JequeDashboard })));
const PilotoDashboard = lazy(() => import("./components/Dashboards").then(module => ({ default: module.PilotoDashboard })));
const UsuarioDashboard = lazy(() => import("./components/Dashboards").then(module => ({ default: module.UsuarioDashboard })));
// App nueva (ADR 0004), en /nueva mientras se construye; el ticket 26 la pasa a la raíz.
const NuevaShell = lazy(() => import("./nueva/shell/AppShell"));
const SeccionNueva = lazy(() => import("./nueva/shell/SeccionNueva"));
const IndiceNueva = lazy(() => import("./nueva/shell/SeccionNueva").then(module => ({ default: module.IndiceNueva })));

const routeFallback = <div role="status" className="min-h-screen bg-bg flex items-center justify-center text-ink-muted text-xs tracking-[0.3em] uppercase font-mono">Cargando</div>;

/**
 * Esta app React solo sirve los paneles clásicos (panel.html). La portada, el acceso y la
 * instalación son del diseño aprobado (index.html, rutas con #): se sale a él con recarga.
 */
function AlDiseno({ hash = "" }: { hash?: string }) {
  useEffect(() => { window.location.replace(`/${hash}`); }, [hash]);
  return routeFallback;
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, userData, loading } = useAuth();
  if (loading) return routeFallback;
  if (!user || !userData) return <Navigate to="/login" replace />;
  const adminByEmail = ["ajgarciarias@gmail.com", "admin@f1bugambra.com"].includes((user.email || "").toLowerCase());
  if (allowedRoles && !allowedRoles.includes(userData.rol || "") && !(allowedRoles.includes("admin") && adminByEmail)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * React Router conserva el scroll al cambiar de ruta, que es lo correcto al ir
 * hacia atrás pero no al navegar a una pantalla nueva: pulsando "Instalar app"
 * desde el final de la portada se aterrizaba al final de /instalar, con el gris
 * del body asomando y aspecto de página en blanco.
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function nuevaSeccion(clave: ClaveSeccion) {
  const { ruta, roles } = SECCIONES[clave];
  const pantalla = <SeccionNueva clave={clave} />;
  return <Route key={clave} path={ruta} element={roles ? <ProtectedRoute allowedRoles={[...roles]}>{pantalla}</ProtectedRoute> : pantalla} />;
}

function DataRoutes() {
  return <DataProvider><MarketLifecycleProvider><Outlet /></MarketLifecycleProvider></DataProvider>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={routeFallback}>
          <Routes>
            <Route path="/login" element={<AlDiseno hash="#login" />} />
            <Route path="/instalar" element={<AlDiseno hash="#instalar" />} />
            <Route element={<DataRoutes />}>
              <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/jeque" element={<ProtectedRoute allowedRoles={["jeque"]}><JequeDashboard /></ProtectedRoute>} />
              <Route path="/piloto" element={<ProtectedRoute allowedRoles={["piloto", "admin"]}><PilotoDashboard /></ProtectedRoute>} />
              <Route path="/usuario" element={<ProtectedRoute allowedRoles={["usuario", "invitado", "director_deportivo"]}><UsuarioDashboard /></ProtectedRoute>} />
              <Route path="/nueva" element={<NuevaShell />}>
                <Route index element={<IndiceNueva />} />
                {(Object.keys(SECCIONES) as ClaveSeccion[]).map(nuevaSeccion)}
                <Route path="*" element={<Navigate to="/nueva" replace />} />
              </Route>
              <Route path="*" element={<AlDiseno />} />
            </Route>
          </Routes>
        </Suspense>
        <InstallBanner />
      </BrowserRouter>
    </AuthProvider>
  );
}

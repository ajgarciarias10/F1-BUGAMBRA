import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DataProvider } from "./hooks/useData";
import { PublicHome } from "./components/PublicHome";
import { InstallBanner } from "./components/InstallApp";
import { MarketLifecycleProvider } from "./components/MarketLifecycleProvider";
import "./hooks/useTheme";
import "./nueva/ui/nueva.css";
import { SECCIONES, destinoEntrada, rutaDe, type ClaveSeccion } from "./nueva/shell/secciones";

const AdminDashboard = lazy(() => import("./components/AdminDashboard").then(module => ({ default: module.AdminDashboard })));
const JequeDashboard = lazy(() => import("./components/Dashboards").then(module => ({ default: module.JequeDashboard })));
const PilotoDashboard = lazy(() => import("./components/Dashboards").then(module => ({ default: module.PilotoDashboard })));
const UsuarioDashboard = lazy(() => import("./components/Dashboards").then(module => ({ default: module.UsuarioDashboard })));
// Entrada del rediseño conectado (ADR 0004). Los paneles pendientes conservan sus rutas.
const NuevaShell = lazy(() => import("./nueva/shell/AppShell"));
const SeccionNueva = lazy(() => import("./nueva/shell/SeccionNueva"));
const IndiceNueva = lazy(() => import("./nueva/shell/SeccionNueva").then(module => ({ default: module.IndiceNueva })));

const routeFallback = <div role="status" className="min-h-screen bg-bg flex items-center justify-center text-ink-muted text-xs tracking-[0.3em] uppercase font-mono">Cargando</div>;

function Entrada() {
  const { search, hash } = useLocation();
  return <Navigate to={destinoEntrada(search, hash)} replace />;
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
            <Route path="/login" element={<Navigate to={rutaDe("entrar")} replace />} />
            <Route path="/instalar" element={<Navigate to={rutaDe("instalar")} replace />} />
            <Route element={<DataRoutes />}>
              <Route path="/" element={<Entrada />} />
              <Route path="/clasica" element={<PublicHome />} />
              <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/jeque" element={<ProtectedRoute allowedRoles={["jeque"]}><JequeDashboard /></ProtectedRoute>} />
              <Route path="/piloto" element={<ProtectedRoute allowedRoles={["piloto", "admin"]}><PilotoDashboard /></ProtectedRoute>} />
              <Route path="/usuario" element={<ProtectedRoute allowedRoles={["usuario", "invitado", "director_deportivo"]}><UsuarioDashboard /></ProtectedRoute>} />
              <Route path="/nueva" element={<NuevaShell />}>
                <Route index element={<IndiceNueva />} />
                {(Object.keys(SECCIONES) as ClaveSeccion[]).map(nuevaSeccion)}
                <Route path="*" element={<Navigate to="/nueva" replace />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
        <InstallBanner />
      </BrowserRouter>
    </AuthProvider>
  );
}

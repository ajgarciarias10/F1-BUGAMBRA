import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DataProvider } from "./hooks/useData";
import { PublicHome } from "./components/PublicHome";
import { InstallApp, InstallBanner } from "./components/InstallApp";

const LoginRegister = lazy(() => import("./components/LoginRegister").then(module => ({ default: module.LoginRegister })));
const AdminDashboard = lazy(() => import("./components/AdminDashboard").then(module => ({ default: module.AdminDashboard })));
const JequeDashboard = lazy(() => import("./components/Dashboards").then(module => ({ default: module.JequeDashboard })));
const PilotoDashboard = lazy(() => import("./components/Dashboards").then(module => ({ default: module.PilotoDashboard })));
const UsuarioDashboard = lazy(() => import("./components/Dashboards").then(module => ({ default: module.UsuarioDashboard })));

const routeFallback = <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/40 text-xs tracking-[0.3em] uppercase font-mono">Cargando</div>;

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, userData, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/40 text-xs tracking-[0.3em] uppercase font-mono">Cargando</div>;
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

function DataRoutes() {
  return <DataProvider><Outlet /></DataProvider>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={routeFallback}>
          <Routes>
            <Route path="/login" element={<LoginRegister />} />
            <Route path="/instalar" element={<InstallApp />} />
            <Route element={<DataRoutes />}>
              <Route path="/" element={<PublicHome />} />
              <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/jeque" element={<ProtectedRoute allowedRoles={["jeque"]}><JequeDashboard /></ProtectedRoute>} />
              <Route path="/piloto" element={<ProtectedRoute allowedRoles={["piloto", "admin"]}><PilotoDashboard /></ProtectedRoute>} />
              <Route path="/usuario" element={<ProtectedRoute allowedRoles={["usuario", "invitado"]}><UsuarioDashboard /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
        <InstallBanner />
      </BrowserRouter>
    </AuthProvider>
  );
}

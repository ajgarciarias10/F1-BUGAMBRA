import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginRegister } from "./components/LoginRegister";
import { AdminDashboard } from "./components/AdminDashboard";
import { JequeDashboard, PilotoDashboard } from "./components/Dashboards";
import { PublicHome } from "./components/PublicHome";

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, userData, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/40 text-xs tracking-[0.3em] uppercase font-mono">Cargando</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && userData && !allowedRoles.includes(userData.rol || "")) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/login" element={<LoginRegister />} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/jeque" element={<ProtectedRoute allowedRoles={["jeque"]}><JequeDashboard /></ProtectedRoute>} />
          <Route path="/piloto" element={<ProtectedRoute allowedRoles={["piloto"]}><PilotoDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

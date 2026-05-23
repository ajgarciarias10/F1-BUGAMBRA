/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginRegister } from "./components/LoginRegister";
import { AdminDashboard } from "./components/AdminDashboard";
import { JequeDashboard, PilotoDashboard } from "./components/Dashboards";

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, userData, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen bg-[#0E0E10] flex items-center justify-center text-white font-mono text-sm">CARGANDO...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  if (allowedRoles && userData && !allowedRoles.includes(userData.rol || '')) {
    return <Navigate to="/" replace />; // Fallback to root router logic
  }
  
  return <>{children}</>;
}

function RoleRouter() {
  const { userData, loading, user } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0E0E10] flex items-center justify-center text-white font-mono text-sm">CARGANDO...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  switch(userData?.rol) {
    case 'admin': return <Navigate to="/admin" replace />;
    case 'jeque': return <Navigate to="/jeque" replace />;
    case 'piloto': return <Navigate to="/piloto" replace />;
    default: return <div className="text-white p-8">Role not assigned or data missing.</div>;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRegister />} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/jeque" element={<ProtectedRoute allowedRoles={['jeque']}><JequeDashboard /></ProtectedRoute>} />
          <Route path="/piloto" element={<ProtectedRoute allowedRoles={['piloto']}><PilotoDashboard /></ProtectedRoute>} />
          <Route path="*" element={<RoleRouter />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './components/Dashboard';
import { Militares } from './components/Militares';
import { FichaIndividual } from './components/FichaIndividual';
import { PlantoesExtras } from './components/PlantoesExtras';
import { Relatorios } from './components/Relatorios';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/auth/Login';

function AuthenticatedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-low">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/militares" element={<Militares />} />
        <Route path="/perfil" element={<FichaIndividual />} />
        <Route path="/extras" element={<PlantoesExtras />} />
        <Route path="/relatorios" element={<Relatorios />} />
        {/* Fallback for other routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthenticatedApp />
      </BrowserRouter>
    </AuthProvider>
  );
}

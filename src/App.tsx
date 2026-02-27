import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Agenda } from './pages/Agenda';
import { Agendar } from './pages/Agendar';
import { Dashboard } from './pages/Dashboard';
import { AcessoRestrito } from './pages/AcessoRestrito';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AuthGuard({ children, permission }: { children: React.ReactNode, permission?: string }) {
  const { user, roleId, permissoes, loading } = useAuth();

  // Spinner de carregamento
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Se não tem usuário logado
  if (!user) return <Navigate to="/login" replace />;

  // Se tem usuário mas não tem perfil (role_id null), manda para acesso restrito
  if (roleId === null) return <AcessoRestrito />;

  // Se a rota exige permissão e o usuário não tem, volta para a Home
  if (permission && !permissoes.includes(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <AuthGuard>
            <Layout>
              <Home />
            </Layout>
          </AuthGuard>
        } />

        <Route path="/agenda" element={
          <AuthGuard>
            <Layout>
              <Agenda />
            </Layout>
          </AuthGuard>
        } />

        <Route path="/novo" element={
          <AuthGuard>
            <Layout>
              <Agendar />
            </Layout>
          </AuthGuard>
        } />

        <Route path="/dashboard" element={
          <AuthGuard permission="acessar_dashboard">
            <Layout>
              <Dashboard />
            </Layout>
          </AuthGuard>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
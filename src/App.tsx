import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Agenda } from './pages/Agenda';
import { Agendar } from './pages/Agendar';
import { AcessoRestrito } from './pages/AcessoRestrito';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Admin } from './pages/Admin';

function AuthGuard({ children, permission }: { children: React.ReactNode, permission?: string }) {
  const { user, roleId, permissoes, loading } = useAuth();
  
  const [isHanging, setIsHanging] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (loading) {
      timeout = setTimeout(() => setIsHanging(true), 5000);
    } else {
      setIsHanging(false);
    }
    return () => clearTimeout(timeout);
  }, [loading]);

  const forceClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login'; 
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        
        {isHanging && (
          <div className="text-center animate-in fade-in duration-500 max-w-sm px-4">
            <p className="text-slate-600 mb-4 font-medium">
              Sua sessão expirou.
            </p>
            <button 
              onClick={forceClearCache}
              className="w-full px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 hover:text-blue-800 font-bold transition-colors shadow-sm"
            >
              Atualizar Sessão
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roleId === null) return <AcessoRestrito />;
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

        <Route path="/admin" element={
          <AuthGuard>
            <Layout>
              <Admin />
            </Layout>
          </AuthGuard>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
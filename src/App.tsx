import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';

// PÁGINAS CORE
import { Login } from './pages/core/Login';
import { Home } from './pages/core/Home';
import { AcessoRestrito } from './pages/core/AcessoRestrito'; 
import { TrocarSenha } from './pages/core/TrocarSenha'; 
import { EsqueciSenha } from './pages/core/EsqueciSenha';
import { LinkExpirado } from './pages/core/LinkExpirado';

// PÁGINAS DE MÓDULOS
import { Admin } from './pages/administracao/Admin';
import { Agenda } from './pages/pa/Agenda';
import { Agendar } from './pages/pa/Agendar';
import { Ambulatorio as FilaAmbulatorio } from './pages/ambulatorio/FilaAmbulatorio'; 
import { NovoAmbulatorio } from './pages/ambulatorio/NovoAmbulatorio';

// CONTEXTOS E UI
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Button } from './components/ui/Button';
import { Description } from './components/ui/Typography';

function AuthGuard({ 
  children, 
  permission, 
  requireProfile = true, 
  checkPrimeiroAcesso = true 
}: { 
  children: React.ReactNode, 
  permission?: string, 
  requireProfile?: boolean,
  checkPrimeiroAcesso?: boolean 
}) {
  const { user, alocacoes, permissoes, isActive, primeiroAcesso, loading } = useAuth();
  const [isHanging, setIsHanging] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let timeout: any;
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

  const hashParams = new URLSearchParams(location.hash.replace('#', '?'));
  const isTokenExpired = hashParams.get('error_code') === 'otp_expired' || 
                         new URLSearchParams(location.search).get('error_code') === 'otp_expired';

  if (isTokenExpired) {
    return <Navigate to="/link-expirado" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-500 space-y-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
        {isHanging && (
          <div className="text-center animate-in fade-in duration-500 max-w-sm px-4">
            <Description className="!mb-4 !font-medium text-slate-600 dark:text-slate-300">
              Aguardando resposta do servidor...
            </Description>
            <Button onClick={forceClearCache} variant="primary" fullWidth>
              Voltar ao Login
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    const isRecovering = location.hash.includes('type=recovery') || location.hash.includes('access_token');
    if (isRecovering) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }
  
  // TRAVA RBAC: Exige apenas Alocações para liberar a Home (permissoes carregam em segundo plano)
  if (requireProfile && (isActive === false || !alocacoes?.length)) {
    return <Navigate to="/acesso-restrito" replace />;
  }

  if (checkPrimeiroAcesso && primeiroAcesso === true) {
    return <Navigate to="/trocar-senha" replace />;
  }
  
  if (permission && !permissoes.includes(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* ROTAS PÚBLICAS */}
          <Route path="/login" element={<Login />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/link-expirado" element={<LinkExpirado />} />

          {/* ROTAS PROTEGIDAS PELO AUTHGUARD */}
          <Route path="/" element={
            <AuthGuard requireProfile={true}>
              <Layout><Home /></Layout>
            </AuthGuard>
          } />

          <Route path="/acesso-restrito" element={
            <AuthGuard requireProfile={false}>
              <AcessoRestrito />
            </AuthGuard>
          } />

          <Route path="/trocar-senha" element={
            <AuthGuard requireProfile={false} checkPrimeiroAcesso={false}>
              <TrocarSenha />
            </AuthGuard>
          } />

          {/* MÓDULOS ESPECÍFICOS */}
          <Route path="/agenda" element={<AuthGuard><Layout><Agenda /></Layout></AuthGuard>} />
          <Route path="/novo" element={<AuthGuard><Layout><Agendar /></Layout></AuthGuard>} />
          <Route path="/admin" element={<AuthGuard><Layout><Admin /></Layout></AuthGuard>} />
          <Route path="/novo-ambulatorio" element={<AuthGuard><Layout><NovoAmbulatorio /></Layout></AuthGuard>} />
          <Route path="/ambulatorio" element={<AuthGuard><Layout><FilaAmbulatorio /></Layout></AuthGuard>} />

          {/* REDIRECIONAMENTO PADRÃO */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
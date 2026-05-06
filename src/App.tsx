import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';

// CAMINHOS GEOGRÁFICOS E ARQUITETURA ATUALIZADA
import { Login } from './pages/core/Login';
import { Home } from './pages/core/Home';
import { AcessoRestrito } from './pages/core/AcessoRestrito'; 
import { TrocarSenha } from './pages/core/TrocarSenha'; 
import { Admin } from './pages/administracao/Admin';
import { Agenda } from './pages/pa/Agenda';
import { Agendar } from './pages/pa/Agendar';
import { Ambulatorio as FilaAmbulatorio } from './pages/ambulatorio/FilaAmbulatorio'; 
import { NovoAmbulatorio } from './pages/ambulatorio/NovoAmbulatorio';
import { EsqueciSenha } from './pages/core/EsqueciSenha';

// CONTEXTOS E COMPONENTES UI
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
  const { user, roleId, permissoes, setores, isActive, primeiroAcesso, loading } = useAuth();
  const [isHanging, setIsHanging] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-500 space-y-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
        {isHanging && (
          <div className="text-center animate-in fade-in duration-500 max-w-sm px-4">
            <Description className="!mb-4 !font-medium text-slate-600 dark:text-slate-300">
              Sua sessão expirou.
            </Description>
            <Button 
              onClick={forceClearCache} 
              variant="primary" 
              fullWidth
            >
              Atualizar Sessão
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  
  if (requireProfile && (isActive === false || roleId === null || !setores?.length || !permissoes?.length)) {
    return <Navigate to="/acesso-restrito" replace />;
  }

  if (checkPrimeiroAcesso && primeiroAcesso === true) {
    return <Navigate to="/trocar-senha" replace />;
  }
  
  if (permission && !permissoes.includes(permission)) return <Navigate to="/" replace />;

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

          {/* ROTAS PROTEGIDAS */}
          <Route path="/" element={
            <AuthGuard requireProfile={true}>
              <Layout>
                <Home />
              </Layout>
            </AuthGuard>
          } />

          <Route path="/acesso-restrito" element={
            <AuthGuard requireProfile={false}>
              <Layout>
                <AcessoRestrito />
              </Layout>
            </AuthGuard>
          } />

          <Route path="/trocar-senha" element={
            <AuthGuard requireProfile={false} checkPrimeiroAcesso={false}>
              <Layout>
                <TrocarSenha />
              </Layout>
            </AuthGuard>
          } />

          {/* PRONTO ATENDIMENTO */}
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

          {/* ADMINISTRAÇÃO */}
          <Route path="/admin" element={
            <AuthGuard>
              <Layout>
                <Admin />
              </Layout>
            </AuthGuard>
          } />

          {/* AMBULATÓRIO */}
          <Route path="/novo-ambulatorio" element={
            <AuthGuard>
              <Layout>
                <NovoAmbulatorio />
              </Layout>
            </AuthGuard>
          } />

          <Route path="/ambulatorio" element={
            <AuthGuard>
              <Layout>
                <FilaAmbulatorio />
              </Layout>
            </AuthGuard>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, LayoutDashboard, Settings, ChevronRight, Home, Users, ClipboardList } from 'lucide-react'; // <-- NOVO ÍCONE AQUI

import { DashboardHub } from './dashboards/DashboardHub'; 
import { GerenciarHorarios } from './GerenciarHorarios';
import { GerenciarUsuarios } from './usuarios/GerenciarUsuarios';
import { GerenciarPerguntas } from './pesquisa/GerenciarPerguntas'; // <-- IMPORT DA NOVA TELA

import { Card } from '../../components/ui/Card';
import { Title, Description } from '../../components/ui/Typography';

// 1. TIPO ATUALIZADO
type AdminView = 'hub' | 'horarios' | 'dashboard' | 'usuarios' | 'perguntas';

export function Admin() {
  const { permissoes, loading: authLoading } = useAuth();
  const location = useLocation();
  
  const [view, setView] = useState<AdminView>(() => {
    const savedView = sessionStorage.getItem('adminCurrentView');
    return (savedView as AdminView) || 'hub';
  });

  useEffect(() => {
    sessionStorage.setItem('adminCurrentView', view);
  }, [view]);

  useEffect(() => {
    if (location.state && (location.state as any).forceAdminHub) {
      setView('hub');
      sessionStorage.removeItem('adminCurrentView');
      sessionStorage.removeItem('hubCurrentDash');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  if (authLoading) return null;

  const isAdmin = permissoes.includes('adm_gerenciar_usuarios');
  
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20 mt-4">
      {view === 'hub' && (
        <>
          <nav className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 font-medium mb-4 px-2">
            <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors">
              <Home size={14} />
              <span>Home</span>
            </Link>
            <ChevronRight size={14} className="text-slate-400 dark:text-slate-600" />
            <span className="font-bold dark:text-slate-200">Administração</span>
          </nav>

          <div className="mb-8 px-2">
            <Title className="flex items-center gap-3">
              <Settings className="text-blue-600 dark:text-blue-500" size={32} />
              Painel de Administração
            </Title>
            <Description className="text-lg mt-2">
              Gerencie os indicadores, configurações e acessos do sistema.
            </Description>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-300">
            <Card hoverable onClick={() => {
              sessionStorage.removeItem('hubCurrentDash');
              setView('dashboard');
            }} className="group">
               <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <LayoutDashboard size={24} />
               </div>
               <Title className="text-lg mb-2">Dashboard Operacional</Title>
               <Description className="text-sm">Acesse as métricas gerais e indicadores.</Description>
            </Card>

            <Card hoverable onClick={() => {
              sessionStorage.removeItem('hubCurrentDash');
              setView('horarios');
            }} className="group">
               <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Clock size={24} />
               </div>
               <Title className="text-lg mb-2">Horários de Agendamento</Title>
               <Description className="text-sm">Gerencie a grade de horários da agenda.</Description>
            </Card>

            <Card hoverable onClick={() => {
              sessionStorage.removeItem('hubCurrentDash');
              setView('usuarios');
            }} className="group">
               <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users size={24} />
               </div>
               <Title className="text-lg mb-2">Gestão de Usuários</Title>
               <Description className="text-sm">Crie contas e gerencie os acessos do sistema.</Description>
            </Card>

            {/* <-- NOVO CARD DE PESQUISA --> */}
            <Card hoverable onClick={() => {
              sessionStorage.removeItem('hubCurrentDash');
              setView('perguntas');
            }} className="group">
               <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ClipboardList size={24} />
               </div>
               <Title className="text-lg mb-2">Pesquisa de Satisfação</Title>
               <Description className="text-sm">Gerencie as perguntas do formulário de pacientes.</Description>
            </Card>
          </div>
        </>
      )}

      {view === 'dashboard' && <DashboardHub />}
      
      {view === 'horarios' && <GerenciarHorarios onBack={() => {
        setView('hub');
        sessionStorage.removeItem('adminCurrentView');
      }} />}
      
      {view === 'usuarios' && <GerenciarUsuarios onBack={() => {
        setView('hub');
        sessionStorage.removeItem('adminCurrentView');
      }} />}

      {/* <-- CHAMADA DA NOVA TELA COM FUNÇÃO DE VOLTAR --> */}
      {view === 'perguntas' && <GerenciarPerguntas onBack={() => {
        setView('hub');
        sessionStorage.removeItem('adminCurrentView');
      }} />}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from "../../../contexts/AuthContext";
import { Card } from '../../../components/ui/Card';
import { Title, Description } from '../../../components/ui/Typography';
import { LayoutDashboard, Activity, Building2, ChevronRight, Home } from 'lucide-react';
import { usePermissoes } from '../../../hooks/usePermissoes';

import { DashPA } from './DashPA';

export function DashboardHub() {
  const { loading: authLoading } = useAuth();
  const { podeAcessarDashboard } = usePermissoes();
  
  const [currentView, setCurrentView] = useState<'menu' | 'pa'>(() => {
    const savedView = sessionStorage.getItem('hubCurrentDash');
    return (savedView as 'menu' | 'pa') || 'menu';
  });

  useEffect(() => {
    sessionStorage.setItem('hubCurrentDash', currentView);
  }, [currentView]);

  if (authLoading) return null;
  if (!podeAcessarDashboard) return <Navigate to="/" replace />;

  if (currentView === 'pa') return <DashPA onBack={() => {
    setCurrentView('menu');
    sessionStorage.removeItem('hubCurrentDash');
  }} />;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 mt-4">
      <nav className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 font-medium mb-2 px-2">
        <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors">
          <Home size={14} />
          <span>Home</span>
        </Link>
        <ChevronRight size={14} className="text-slate-400 dark:text-slate-600" />
        {/* CORREÇÃO: Link do breadcrumb envia o forceAdminHub */}
        <Link to="/admin" state={{ forceAdminHub: true }} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Administração
        </Link>   
        <ChevronRight size={14} className="text-slate-400 dark:text-slate-600" />
        <span className="font-bold dark:text-slate-200">Dashboards</span>
      </nav>

      <div className="mb-8 px-2">
        <Title className="flex items-center gap-3">
            <LayoutDashboard className="text-blue-600 dark:text-blue-500" size={32} />
            Painel de Produtividade
        </Title>
        <Description className="text-lg mt-2">
          Selecione o setor para visualizar os indicadores e métricas.
        </Description>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card hoverable className="p-8 flex flex-col items-center justify-center text-center group" onClick={() => setCurrentView('pa')}>
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Activity size={40} />
            </div>
            <Title className="text-2xl mb-2">Pronto Atendimento</Title>
            <Description>Métricas de conversão, fila de contatos e agendamentos do PA.</Description>
          </Card>

          <Card className="p-8 flex flex-col items-center justify-center text-center relative overflow-hidden bg-gray-50/80 dark:bg-slate-900/40 border-dashed cursor-not-allowed">
            <div className="absolute top-4 right-4 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wider">
              Em Construção
            </div>
            <div className="w-20 h-20 bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600 rounded-2xl flex items-center justify-center mb-6">
              <Building2 size={40} />
            </div>
            <Title className="text-2xl text-gray-400 dark:text-slate-600 mb-2">Ambulatório</Title>
            <Description className="text-gray-400 dark:text-slate-600">Em breve: indicadores de encaminhamentos e produtividade do concierge.</Description>
          </Card>
      </div>
    </div>
  );
}
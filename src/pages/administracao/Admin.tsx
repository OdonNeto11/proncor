import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, LayoutDashboard, Settings, ChevronRight, Home } from 'lucide-react';

// IMPORTAÇÃO CORRIGIDA PARA BATER COM O NOME DA FUNÇÃO ACIMA
import { DashboardHub } from './dashboards/DashboardHub'; 
import { GerenciarHorarios } from './GerenciarHorarios';

type AdminView = 'hub' | 'horarios' | 'dashboard';

export function Admin() {
  const { roleId, loading: authLoading } = useAuth();
  const location = useLocation();
  const [view, setView] = useState<AdminView>('hub');

  useEffect(() => {
    if (location.state && (location.state as any).reset) {
      setView('hub');
    }
  }, [location.state]);

  if (authLoading) return null;
  if (roleId !== 1) return <Navigate to="/" replace />;

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20 mt-4">
      {view === 'hub' && (
        <>
          <nav className="flex items-center space-x-2 text-sm text-slate-500 font-medium mb-2">
            <Link to="/" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
              <Home size={14} />
              <span>Home</span>
            </Link>
            <ChevronRight size={14} className="text-slate-400" />
            <span className="text-slate-800 font-bold">Administração</span>
          </nav>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Settings className="text-blue-600" size={32} />
              Painel de Administração
            </h1>
            <p className="text-gray-500 mt-2 text-lg">Gerencie os indicadores, configurações e acessos do sistema.</p>
          </div>
        </>
      )}

      {view === 'hub' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-300">
          <div onClick={() => setView('dashboard')} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer transition-all group">
             <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <LayoutDashboard size={24} />
             </div>
             <h3 className="text-lg font-bold text-gray-800 mb-2">Dashboard Operacional</h3>
             <p className="text-sm text-gray-500">Acesse as métricas gerais e indicadores.</p>
          </div>
          <div onClick={() => setView('horarios')} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-400 cursor-pointer transition-all group">
             <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Clock size={24} />
             </div>
             <h3 className="text-lg font-bold text-gray-800 mb-2">Horários de Agendamento</h3>
             <p className="text-sm text-gray-500">Gerencie a grade de horários da agenda.</p>
          </div>
        </div>
      )}

      {view === 'dashboard' && (
        <div className="animate-in slide-in-from-right-8 duration-300">
          <DashboardHub /> {/* Chamada corrigida */}
        </div>
      )}

      {view === 'horarios' && (
        <div className="animate-in slide-in-from-right-8 duration-300">
          <GerenciarHorarios onBack={() => setView('hub')} />
        </div>
      )}
    </div>
  );
}
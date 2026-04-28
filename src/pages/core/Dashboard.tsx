import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom'; // <-- IMPORT ADICIONADO AQUI TAMBÉM
import { useAuth } from "../../contexts/AuthContext";
import { Card } from '../../components/ui/Card';
import { LayoutDashboard, Activity, Building2, ChevronRight, Home } from 'lucide-react';

// IMPORTAÇÃO DOS SUB-DASHBOARDS
import { DashPA } from '../administracao/dashboards/DashPA';
import { usePermissoes } from '../../hooks/usePermissoes';

export function Dashboard() {
  const { loading: authLoading } = useAuth();
  const { podeAcessarDashboard } = usePermissoes();
  
  const [currentView, setCurrentView] = useState<'menu' | 'pa'>('menu');

  if (authLoading) return null;
  
  if (!podeAcessarDashboard) return <Navigate to="/" replace />;

  if (currentView === 'pa') {
    return <DashPA onBack={() => setCurrentView('menu')} />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 mt-4">
      
{/* BREADCRUMB PARA O MENU PRINCIPAL DE DASHBOARDS */}
      <nav className="flex items-center space-x-2 text-sm text-slate-500 font-medium mb-2">
        <Link to="/" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
          <Home size={14} />
          <span>Home</span>
        </Link>
        <ChevronRight size={14} className="text-slate-400" />
        
        {/* Mude o "/administracao" abaixo para a rota real do seu menu */}
      <Link to="/admin" state={{ reset: Date.now() }} className="hover:text-blue-600 transition-colors">
          Administração
        </Link>   
        
        <ChevronRight size={14} className="text-slate-400" />
        <span className="text-slate-800 font-bold">Dashboards</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <LayoutDashboard className="text-blue-600" size={32} />
            Painel de Produtividade
        </h1>
        <p className="text-gray-500 mt-2 text-lg">Selecione o setor para visualizar os indicadores e métricas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            hoverable 
            className="p-8 flex flex-col items-center justify-center text-center cursor-pointer group border-blue-100 hover:border-blue-400 transition-all" 
            onClick={() => setCurrentView('pa')}
          >
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Activity size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Pronto Atendimento</h2>
            <p className="text-gray-500">Métricas de conversão, fila de contatos e agendamentos do PA.</p>
          </Card>

          <Card className="p-8 flex flex-col items-center justify-center text-center relative overflow-hidden border-gray-100 bg-gray-50/80 cursor-not-allowed select-none">
            <div className="absolute top-4 right-4 bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wider">
              Em Construção
            </div>
            <div className="w-20 h-20 bg-gray-200 text-gray-400 rounded-2xl flex items-center justify-center mb-6">
              <Building2 size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-400 mb-2">Ambulatório</h2>
            <p className="text-gray-400">Em breve: indicadores de encaminhamentos e produtividade do concierge.</p>
          </Card>
      </div>
    </div>
  );
}
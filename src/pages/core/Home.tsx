import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissoes } from '../../hooks/usePermissoes';
import { Building2, Stethoscope, ClipboardList } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';

import { Card } from '../../components/ui/Card';
import { Title, Description } from '../../components/ui/Typography';

export function Home() {
  const { profileName, alocacoes, loading, permissoes } = useAuth();
  const { podeVerPA, podeCriarPA, podeVerAmb, podeCriarAmb } = usePermissoes();
  const navigate = useNavigate();

  if (loading) return null;

  if (profileName === null || !alocacoes || alocacoes.length === 0) {
    return <Navigate to="/acesso-restrito" replace />;
  }
  
  if (!permissoes || permissoes.length === 0) {
    return <Navigate to="/acesso-restrito" replace />;
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      
      <div className="mb-8">
        <Title>Olá, {(profileName || 'Usuário').split(' ')[0]}</Title>
        <Description>Selecione o seu ambiente de trabalho para iniciar.</Description>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {alocacoes.map(aloc => { // Removida tipagem inline para evitar poluição
          let rota = '';
          let Icone = Building2;
          let cor = 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
          let temPermissaoParaAcessar = false;

          // Lógica de decisão baseada no ID ou Nome da nova estrutura
          if (aloc.setor_id === 1 || aloc.setor_nome.includes('PA')) {
              rota = podeCriarPA ? '/novo' : '/agenda'; 
              Icone = Stethoscope;
              cor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400';
              temPermissaoParaAcessar = podeVerPA || podeCriarPA;
          } else if (aloc.setor_id === 2 || aloc.setor_nome.includes('Ambulatório')) {
              rota = podeCriarAmb ? '/novo-ambulatorio' : '/ambulatorio'; 
              Icone = ClipboardList;
              cor = 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400';
              temPermissaoParaAcessar = podeVerAmb || podeCriarAmb;
          }

          if (!temPermissaoParaAcessar) return null;

          return (
            <Card 
              key={aloc.setor_id} 
              hoverable 
              onClick={() => navigate(rota)}
              className="flex flex-col items-center text-center p-8 group transition-all duration-300"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${cor}`}>
                 <Icone size={32} />
              </div>
              <Title className="text-xl mb-2">{aloc.setor_nome}</Title>
              <span className="text-slate-400 dark:text-slate-500 text-xs font-bold bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full tracking-wider">
                  {aloc.setor_nome.includes('PA') ? 'PA' : 'AMB'}
              </span>
            </Card>
          )
        })}
      </div>
    </div>
  );
}
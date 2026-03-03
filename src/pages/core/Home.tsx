import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissoes } from '../../hooks/usePermissoes';
import { Building2, Stethoscope, ClipboardList, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  const { profileName, setores, roleId } = useAuth();
  const { podeVerPA, podeVerAmb } = usePermissoes();

  // REGRA 2: Existe na profile, mas não possui setores vinculados ou roleId nulo
  const isAcessoPendente = roleId === null || !setores || setores.length === 0;

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Olá, {profileName ? profileName.split(' ')[0] : 'Profissional'}
        </h1>
        <p className="text-gray-600">Selecione o seu ambiente de trabalho para iniciar.</p>
      </div>

      {isAcessoPendente ? (
        /* TELA DE ACESSO PENDENTE (REGRA 2) */
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center max-w-2xl mx-auto mt-12 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <AlertCircle size={40} className="text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Sem setor vinculado</h2>
          <p className="text-gray-500 leading-relaxed">
            Seu usuário foi autenticado, mas você ainda não possui um ambiente de trabalho definido no sistema.
            <br/><br/>
            Por favor, contate a administração do sistema para liberar o seu acesso aos menus.
          </p>
        </div>
      ) : (
        /* GRID DE SETORES COM FILTRO DE PERMISSÃO */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {setores.filter(Boolean).map(setor => {
            let rota = '';
            let Icone = Building2;
            let cor = 'bg-blue-50 text-blue-600';
            let hoverCor = 'hover:border-blue-400';
            let temPermissaoParaAcessar = false;

            // Lógica baseada na Sigla do Setor e no Hook usePermissoes
            if (setor.sigla === 'PA') {
                rota = '/novo'; 
                Icone = Stethoscope;
                cor = 'bg-emerald-50 text-emerald-600';
                hoverCor = 'hover:border-emerald-400';
                temPermissaoParaAcessar = podeVerPA; // pa_visualizar_agendamentos
            } else if (setor.sigla === 'AMB') {
                rota = '/ambulatorio'; 
                Icone = ClipboardList;
                cor = 'bg-purple-50 text-purple-600';
                hoverCor = 'hover:border-purple-400';
                temPermissaoParaAcessar = podeVerAmb; // amb_visualizar_encaminhamentos
            }

            // Só renderiza o card se houver permissão explícita no Hook
            if (!temPermissaoParaAcessar) return null;

            return (
              <Link 
                key={setor.id} 
                to={rota}
                className={`bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group flex flex-col items-center text-center ${hoverCor}`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${cor}`}>
                   <Icone size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{setor.nome}</h3>
                <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full tracking-wider">
                    {setor.sigla}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  );
}
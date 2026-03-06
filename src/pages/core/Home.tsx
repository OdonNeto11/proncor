import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissoes } from '../../hooks/usePermissoes';
import { Building2, Stethoscope, ClipboardList, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Card } from '../../components/ui/Card';
import { Title, Description } from '../../components/ui/Typography';

export function Home() {
  const { profileName, setores, roleId } = useAuth();
  const { podeVerPA, podeVerAmb } = usePermissoes();
  const navigate = useNavigate();

  const isAcessoPendente = roleId === null || !setores || setores.length === 0;

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      
      <div className="mb-8">
        {/* Se você mudar a cor no Typography.tsx, aqui muda sozinho */}
        <Title>Olá, {profileName ? profileName.split(' ')[0] : 'Profissional'}</Title>
        <Description>Selecione o seu ambiente de trabalho para iniciar.</Description>
      </div>

      {isAcessoPendente ? (
        <Card className="p-12 text-center max-w-2xl mx-auto mt-12 border-dashed border-gray-300 dark:border-slate-700">
          <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} className="text-gray-400 dark:text-slate-500" />
          </div>
          <Title className="text-2xl mb-3">Sem setor vinculado</Title>
          <Description className="leading-relaxed">
            Seu usuário foi autenticado, mas você ainda não possui um ambiente de trabalho definido no sistema.
          </Description>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {setores.filter(Boolean).map(setor => {
            let rota = '';
            let Icone = Building2;
            let cor = 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
            let temPermissaoParaAcessar = false;

            if (setor.sigla === 'PA') {
                rota = '/novo'; 
                Icone = Stethoscope;
                cor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400';
                temPermissaoParaAcessar = podeVerPA;
            } else if (setor.sigla === 'AMB') {
                rota = '/novo-ambulatorio'; 
                Icone = ClipboardList;
                cor = 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400';
                temPermissaoParaAcessar = podeVerAmb;
            }

            if (!temPermissaoParaAcessar) return null;

            return (
              <Card 
                key={setor.id} 
                hoverable 
                onClick={() => navigate(rota)}
                className="flex flex-col items-center text-center p-8 group transition-all duration-300"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${cor}`}>
                   <Icone size={32} />
                </div>
                {/* Aqui também usamos o Title para garantir padronização */}
                <Title className="text-xl mb-2">{setor.nome}</Title>
                <span className="text-slate-400 dark:text-slate-500 text-xs font-bold bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full tracking-wider">
                    {setor.sigla}
                </span>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  );
}
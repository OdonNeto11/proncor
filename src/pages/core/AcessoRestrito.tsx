import { AlertTriangle, LogOut, UserX, Ban } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthLayout } from '../../components/AuthLayout';

export function AcessoRestrito() {
  const { signOut, alocacoes, isActive, loading } = useAuth();

  // Se ainda estiver carregando os dados do perfil, não mostra nada para não dar "flash" de erro
  if (loading) return null;

  let titulo = "Acesso Pendente";
  let mensagem = "Sua conta está sendo configurada.";
  let Icone = AlertTriangle;

  // 1. Bloqueio por Inatividade
  if (isActive === false) {
    titulo = "Acesso Bloqueado";
    mensagem = "Sua conta foi desativada pelo administrador. Você não tem mais permissão para acessar o sistema.";
    Icone = Ban;
  } 
  // 2. Falta de Vínculo (O SQL que você rodou deve ter populado isso, mas se falhar, cai aqui)
  else if (!alocacoes || alocacoes.length === 0) {
    titulo = "Perfil Não Vinculado";
    mensagem = "Sua conta foi autenticada, mas o administrador ainda não vinculou seu perfil a um Cargo e Setor na nova estrutura de dados.";
    Icone = UserX;
  } 
  // 3. SE CHEGOU AQUI E PASSOU PELAS TRAVAS, O USUÁRIO DEVERIA ESTAR NA HOME
  // Adicionamos um botão de "Tentar Novamente" para forçar o redirecionamento
  else {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center p-4 min-h-[80vh]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800/50 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center mx-auto mb-6 border border-blue-200">
                <AlertTriangle size={40} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-50 mb-2">Permissões Identificadas</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-10 text-sm">
              Suas alocações foram encontradas. Clique no botão abaixo para acessar o painel principal.
            </p>
            <button 
                onClick={() => window.location.href = '/'} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors mb-4"
            >
                Ir para a Home
            </button>
            <button onClick={signOut} className="text-slate-500 text-xs hover:underline">Sair do Sistema</button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="flex items-center justify-center p-4 min-h-[80vh]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800/50 text-center animate-in zoom-in-95 duration-300">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border ${isActive === false ? 'bg-red-100 dark:bg-red-950/40 border-red-200 dark:border-red-900/30' : 'bg-orange-100 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/30'}`}>
              <Icone size={40} className={isActive === false ? "text-red-600 dark:text-red-500" : "text-orange-600 dark:text-orange-500"} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-50 mb-2">{titulo}</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-10 leading-relaxed text-sm">{mensagem}</p>
          <button onClick={signOut} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm border border-slate-200 dark:border-slate-700/50 shadow-sm">
              <LogOut size={18} /> Sair do Sistema
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
import { AlertTriangle, LogOut, UserX, MapPinOff, Ban } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function AcessoRestrito() {
  const { signOut, alocacoes, permissoes, isActive, loading } = useAuth();

  // Previne renderização do componente antes de terminar de carregar os dados
  if (loading) return null;

  let titulo = "Acesso Pendente";
  let mensagem = "";
  let Icone = AlertTriangle;
  let corIcone = "text-orange-600 dark:text-orange-500";
  let bgIcone = "bg-orange-100 dark:bg-orange-950/40 dark:border-orange-900/30";

  // 1. CONTA DESATIVADA: O administrador marcou is_active = false lá no painel.
  if (isActive === false) {
    titulo = "Acesso Bloqueado";
    mensagem = "Sua conta foi desativada pelo administrador. Você não tem mais permissão para acessar o sistema.";
    Icone = Ban;
    corIcone = "text-red-600 dark:text-red-500";
    bgIcone = "bg-red-100 dark:bg-red-950/40 dark:border-red-900/30";
  } 
  // 2. SEM VÍNCULO: Usuário está logado e ativo, mas não tem registro na tabela 'usuario_alocacoes' (sem cargo/setor).
  else if (!alocacoes || alocacoes.length === 0) {
    titulo = "Perfil Não Vinculado";
    mensagem = "Sua conta foi autenticada, mas o administrador ainda não vinculou seu perfil a um Cargo e Setor na nova estrutura de dados.";
    Icone = UserX;
  } 
  // 3. SEM PODERES: Usuário tem cargo/setor, mas a tabela 'role_permissoes' não tem nenhuma permissão cadastrada para ele.
  else if (!permissoes || permissoes.length === 0) {
    titulo = "Acesso Restrito";
    mensagem = "Você já possui um setor, mas seu perfil atual não tem permissões liberadas para acessar as telas deste módulo.";
    Icone = AlertTriangle;
  } 
  // 4. FALTA DE PERMISSÃO ESPECÍFICA: A conta está 100% correta, mas o usuário tentou entrar numa rota que o cargo dele não permite (ex: entrou no PA, mas é do Ambulatório).
  else {
    titulo = "Funcionalidade Restrita";
    mensagem = "Sua conta está ativa, mas você não possui as permissões necessárias para acessar esta tela ou realizar esta ação específica.";
    Icone = AlertTriangle;
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800/50 text-center animate-in zoom-in-95 duration-300">
        
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-transparent ${bgIcone}`}>
            <Icone size={40} className={corIcone} />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-50 mb-2">{titulo}</h1>
        
        <p className="text-slate-600 dark:text-slate-300 mb-10 leading-relaxed text-sm">
          {mensagem}<br/><br/>
          Por favor, entre em contato com a coordenação ou TI para solicitar a liberação final do seu acesso.
        </p>

        <button 
            onClick={signOut} 
            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm border border-slate-200 dark:border-slate-700/50 shadow-sm"
        >
            <LogOut size={18} /> Sair do Sistema
        </button>
      </div>
    </div>
  );
}
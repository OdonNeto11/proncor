import { AlertTriangle, LogOut, UserX, MapPinOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function AcessoRestrito() {
  const { signOut, roleId, setores, permissoes } = useAuth();

  let titulo = "Acesso Pendente";
  let mensagem = "";
  let Icone = AlertTriangle;

  if (!roleId) {
    titulo = "Perfil Não Vinculado";
    mensagem = "Sua conta foi autenticada, mas o administrador ainda não definiu o seu cargo no sistema.";
    Icone = UserX;
  } else if (!setores || setores.length === 0) {
    titulo = "Sem Setor Vinculado";
    mensagem = "O seu cargo já foi definido, mas você ainda não foi alocado em nenhum setor específico.";
    Icone = MapPinOff;
  } else if (!permissoes || permissoes.length === 0) {
    titulo = "Acesso Restrito";
    mensagem = "Você já possui um setor, mas seu perfil atual não tem permissões liberadas para acessar as telas deste módulo.";
    Icone = AlertTriangle;
  } else {
    titulo = "Acesso Pendente";
    mensagem = "Autenticação realizada com sucesso, mas seu acesso às funcionalidades do sistema está pendente de liberação.";
    Icone = AlertTriangle;
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800/50 text-center animate-in zoom-in-95 duration-300">
        
        <div className="w-20 h-20 bg-orange-100 dark:bg-orange-950/40 rounded-full flex items-center justify-center mx-auto mb-6 border border-transparent dark:border-orange-900/30">
            <Icone size={40} className="text-orange-600 dark:text-orange-500" />
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
import { AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function AcessoRestrito() {
  const { signOut, profileName } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-slate-100 text-center animate-in zoom-in-95 duration-300">
        
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} className="text-orange-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Acesso Pendente</h1>
        
        <p className="text-slate-600 mb-8">
          Olá, <strong>{profileName}</strong>. O seu usuário foi autenticado, mas o seu perfil ainda não possui permissões atribuídas no sistema.<br/><br/>
          Por favor, entre em contato com a coordenação para solicitar a liberação do seu acesso.
        </p>

        <button 
            onClick={signOut} 
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
            <LogOut size={20} /> Sair do Sistema
        </button>
      </div>
    </div>
  );
}
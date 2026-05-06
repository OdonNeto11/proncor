import React, { useEffect } from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface ModalExcluirUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  usuario: any;
  loading: boolean;
}

export function ModalExcluirUsuario({ isOpen, onClose, onConfirm, usuario, loading }: ModalExcluirUsuarioProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen || !usuario) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">Excluir permanentemente?</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          Você está prestes a excluir o usuário <strong>{usuario.nome}</strong>. Esta ação apagará a credencial de acesso e não poderá ser desfeita.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={loading}
            className="!bg-red-500 hover:!bg-red-600 !text-white !border-transparent whitespace-nowrap shadow-sm"
          >
            <div className="flex items-center justify-center gap-2">
              {loading ? 'Excluindo...' : <><Trash2 size={16} /> Sim, Excluir</>}
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
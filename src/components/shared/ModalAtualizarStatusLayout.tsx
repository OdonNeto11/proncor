import React, { ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ModalAtualizarStatusLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  nomePaciente: string;
  theme?: 'blue' | 'purple';
  children: ReactNode; 
}

export function ModalAtualizarStatusLayout({
  isOpen,
  onClose,
  nomePaciente,
  theme = 'blue',
  children
}: ModalAtualizarStatusLayoutProps) {

  const textTheme = theme === 'purple' ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400';

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={<span className={`${textTheme} font-bold text-lg`}>Atualizar Status</span>}
    >
      <div className="flex flex-col gap-5 animate-in slide-in-from-right-4 duration-300">
        
        {/* TEXTO AUMENTADO E DESTACADO */}
        <div className="text-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
          <p className="text-lg text-slate-600 dark:text-slate-300 font-medium">
            Selecione o novo status para <br />
            <strong className={`${textTheme} text-2xl font-black block mt-1`}>
              {nomePaciente}
            </strong>
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          {children}
        </div>

        <Button variant="secondary" fullWidth onClick={onClose} className="mt-2">
          Cancelar e Voltar
        </Button>
        
      </div>
    </Modal>
  );
}
import React, { ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Description } from '../ui/Typography';

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
      title={<span className={`${textTheme} font-bold`}>Atualizar Status</span>}
    >
      <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300">
        
        <Description size="sm">
          Selecione o novo status para <strong className={textTheme}>{nomePaciente}</strong>:
        </Description>
        
        {/* Aqui é onde os botões (children) são injetados */}
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
import React, { ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ModalAtualizarStatusLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  nomePaciente: string;
  theme?: 'blue' | 'purple';
  children: ReactNode; // Aqui vão entrar os ActionListItems
}

export function ModalAtualizarStatusLayout({
  isOpen,
  onClose,
  nomePaciente,
  theme = 'blue',
  children
}: ModalAtualizarStatusLayoutProps) {

  // Prevenindo problemas do Tailwind com classes dinâmicas
  const textTheme = theme === 'purple' ? 'text-purple-600' : 'text-blue-600';

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={<span className={`${textTheme} font-bold`}>Atualizar Status</span>}
    >
      <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
        
        <p className="text-sm text-slate-600 mb-2">
          Selecione o novo status para <strong className={textTheme}>{nomePaciente}</strong>:
        </p>
        
        {/* Renderiza a lista de botões (ActionListItems) passados pela tela */}
        {children}

        <Button variant="secondary" fullWidth onClick={onClose} className="mt-4">
          Cancelar e Voltar
        </Button>
        
      </div>
    </Modal>
  );
}
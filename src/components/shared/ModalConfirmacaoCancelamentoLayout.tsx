import React, { ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertCircle, XCircle } from 'lucide-react';

interface ModalConfirmacaoCancelamentoLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  nomePaciente: string;
  tipoAtendimento?: string; 
  customInput?: ReactNode;  
  errorMsg?: string;
}

export function ModalConfirmacaoCancelamentoLayout({
  isOpen, 
  onClose, 
  onConfirm, 
  nomePaciente,
  tipoAtendimento = 'agendamento',
  customInput, 
  errorMsg
}: ModalConfirmacaoCancelamentoLayoutProps) {
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={<span className="text-red-600 dark:text-red-500 font-bold">Cancelar {tipoAtendimento.charAt(0).toUpperCase() + tipoAtendimento.slice(1)}</span>}
    >
      <div className="text-center space-y-4 py-4 animate-in zoom-in-95 duration-200">
        
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500">
          <XCircle size={40} strokeWidth={1.5} />
        </div>
        
        <p className="text-slate-600 dark:text-slate-400 text-sm px-4 mt-4">
          Tem certeza que deseja cancelar este {tipoAtendimento} de <br/>
          <span className="text-xl leading-relaxed text-slate-800 dark:text-slate-200">
            <strong className="font-bold">{nomePaciente}</strong>
            <span className="font-normal">?</span>
          </span>
        </p>
        
        {customInput && (
          <div className="text-left mt-6">
            {customInput}
          </div>
        )}

        {errorMsg && (
          <div className="mb-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2 text-left">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span className="font-bold">{errorMsg}</span>
          </div>
        )}

        <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
          <Button variant="secondary" fullWidth onClick={onClose}>Voltar</Button>
          <Button variant="danger" fullWidth onClick={onConfirm}>Sim, Cancelar</Button>
        </div>
        
      </div>
    </Modal>
  );
}
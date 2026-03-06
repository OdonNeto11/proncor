import React, { ReactNode } from 'react';
import { CheckCircle2, HelpCircle, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal'; 
import { Button } from '../ui/Button';

interface ModalConfirmacaoStatusLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  nomePaciente: string;
  statusNome: string; 
  tipoStatus: 'sucesso' | 'neutro'; 
  customInput?: ReactNode; 
  errorMsg?: string;
  title?: string;
}

export function ModalConfirmacaoStatusLayout({
  isOpen,
  onClose,
  onConfirm,
  nomePaciente,
  statusNome,
  tipoStatus,
  customInput,
  errorMsg,
  title = "Confirmar Alteração"
}: ModalConfirmacaoStatusLayoutProps) {
  
  const isSucesso = tipoStatus === 'sucesso';
  const themeStyles = isSucesso ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={<span className={`${isSucesso ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-600 dark:text-slate-300'} font-bold`}>{title}</span>}>
      <div className="text-center space-y-4 py-4 animate-in zoom-in-95 duration-200">
        
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${themeStyles}`}>
          {isSucesso ? <CheckCircle2 size={40} strokeWidth={1.5} /> : <HelpCircle size={40} strokeWidth={1.5} />}
        </div>
        
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Tem certeza que deseja mudar o status do paciente
          </p>
          <div className="mt-1">
            <span className="text-xl leading-tight text-slate-800 dark:text-slate-200">
              <strong className="font-bold">{nomePaciente}</strong>
              <span className="text-slate-600 dark:text-slate-400 text-sm font-normal mx-1 tracking-tight">para</span>
              <strong className={`${isSucesso ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-600 dark:text-slate-300'} font-bold uppercase`}>
                {statusNome}
              </strong>
              <span className="font-normal text-slate-800 dark:text-slate-200">?</span>
            </span>
          </div>
        </div>
        
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
          <Button variant={isSucesso ? 'success' : 'primary'} fullWidth onClick={onConfirm}>Sim, Confirmar</Button>
        </div>
        
      </div>
    </Modal>
  );
}
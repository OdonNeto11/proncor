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
  theme?: 'blue' | 'purple'; // Adicionado para manter a cor viva!
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
  theme = 'blue',
  customInput,
  errorMsg,
  title = "Confirmar alteração"
}: ModalConfirmacaoStatusLayoutProps) {
  
  const isSucesso = tipoStatus === 'sucesso';
  
  // Definição inteligente de cores: verde para sucesso, e cor do módulo (roxo/azul) para neutro
  const themeColors = {
    bg: isSucesso 
      ? 'bg-emerald-50 dark:bg-emerald-900/20' 
      : theme === 'purple' ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-blue-50 dark:bg-blue-900/20',
    text: isSucesso 
      ? 'text-emerald-600 dark:text-emerald-500' 
      : theme === 'purple' ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={<span className={`${themeColors.text} font-bold text-lg`}>{title}</span>}>
      <div className="p-4 text-center space-y-6 animate-in zoom-in-95 duration-200">
        
        {/* ÍCONE CENTRALIZADO COM COR VIVA */}
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${themeColors.bg}`}>
          {isSucesso ? <CheckCircle2 size={32} className={themeColors.text} /> : <HelpCircle size={32} className={themeColors.text} />}
        </div>
        
        {/* TEXTO AUMENTADO COM A QUEBRA DE LINHA CORRETA */}
        <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
          Deseja alterar o status de <strong className={`${themeColors.text} whitespace-nowrap`}>{nomePaciente}</strong> para <br />
          <strong className={`${themeColors.text} uppercase text-xl block mt-2`}>
            {statusNome}?
          </strong>
        </p>
        
        {customInput && (
          <div className="text-left mt-4">
            {customInput}
          </div>
        )}

        {errorMsg && (
          <div className="mb-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2 text-left">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span className="font-bold">{errorMsg}</span>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" fullWidth onClick={onClose}>Voltar</Button>
          <Button variant={isSucesso ? 'success' : 'primary'} fullWidth onClick={onConfirm}>Sim, confirmar</Button>
        </div>
        
      </div>
    </Modal>
  );
}
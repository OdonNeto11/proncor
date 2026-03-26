import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ToastErrorProps {
  message: string;
  errors?: Record<string, string>; // Recebe o objeto de erros para fazer o scroll automático
  onClose: () => void;
}

export function ToastError({ message, errors, onClose }: ToastErrorProps) {
  
  // Efeito executado assim que o Toast aparece na tela
  useEffect(() => {
    if (errors && Object.keys(errors).length > 0) {
      // Pequeno delay para garantir que o React atualizou as bordas vermelhas no DOM
      const timer = setTimeout(() => {
        const firstErrorKey = Object.keys(errors)[0];
        const elementoComErro = document.getElementsByName(firstErrorKey)[0] || document.getElementById(firstErrorKey);
        
        if (elementoComErro) {
          elementoComErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof elementoComErro.focus === 'function') elementoComErro.focus();
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [errors]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-red-50 dark:bg-red-950/80 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded shadow-lg flex items-center gap-3 backdrop-blur-sm">
        <AlertCircle size={24} className="flex-shrink-0" />
        <span className="font-semibold text-sm">{message}</span>
        <button 
          type="button"
          onClick={onClose} 
          className="ml-4 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors opacity-70 hover:opacity-100"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
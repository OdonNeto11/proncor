import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Textarea({ label, error, icon, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">
          {label} {props.required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-3.5 text-slate-400 pointer-events-none z-10">
            {icon}
          </div>
        )}
        
        <textarea 
          className={`
            w-full rounded-xl px-3 py-3 text-sm transition-all duration-200 min-h-[100px]
            
            /* BORDAS E SOMBRAS VISÍVEIS RESTAURADAS */
            appearance-none outline-none border shadow-sm
            border-slate-300 dark:border-slate-600
            
            /* ESTADOS VISUAIS DE FOCO (LINHA E ANEL AZUL) */
            focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 
            dark:focus:border-blue-500 dark:focus:ring-blue-500/40
            disabled:cursor-not-allowed disabled:opacity-50
            
            /* CORES BASE */
            bg-white dark:bg-slate-800
            text-slate-900 dark:text-slate-100
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            
            /* ESPAÇAMENTO DO ÍCONE */
            ${icon ? 'pl-10' : ''} 
            
            /* MODO ERRO */
            ${error ? '!border-red-500 !ring-2 !ring-red-500/30' : ''} 
            ${className}
          `}
          {...props}
        />
      </div>
      
      {error && <span className="text-xs text-red-500 font-medium mt-1">{error}</span>}
    </div>
  );
}
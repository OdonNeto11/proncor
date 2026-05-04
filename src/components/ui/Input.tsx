import React, { forwardRef } from 'react'; // <-- Única mudança no import
import { themeClasses } from './Typography'; 

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; 
  error?: string;
  icon?: React.ReactNode; 
}

// <-- Envelopado com forwardRef
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className={`text-sm font-semibold ${themeClasses.text}`}>
            {label} {props.required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
              {icon}
            </div>
          )}
          
          <input 
            ref={ref} // <-- A MÁGICA ACONTECE AQUI
            className={`
              w-full rounded-lg px-3 py-2.5 text-sm transition-all duration-200 
              
              /* BORDAS E SOMBRAS VISÍVEIS RESTAURADAS */
              appearance-none outline-none border shadow-sm
              border-slate-300 dark:border-slate-600
              
              /* ESTADOS VISUAIS DE FOCO (LINHA E ANEL AZUL) */
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 
              dark:focus:border-blue-500 dark:focus:ring-blue-500/40
              disabled:cursor-not-allowed disabled:opacity-50
              
              /* CORES BASE */
              bg-white dark:bg-slate-800
              ${themeClasses.text} ${themeClasses.placeholder}
              
              /* BLINDAGEM CONTRA O FUNDO BRANCO DO AUTOFILL */
              [&:autofill]:shadow-[inset_0_0_0px_1000px_#ffffff]
              dark:[&:autofill]:shadow-[inset_0_0_0px_1000px_#1e293b]
              dark:[&:autofill]:[-webkit-text-fill-color:#f8fafc]
              
              /* ESPAÇAMENTO DO ÍCONE */
              ${icon ? 'pl-10' : ''} 
              
              /* MODO ERRO */
              ${error ? '!border-red-500 !ring-2 !ring-red-500/30' : ''} 
              ${className}
            `}
            {...props}
          />
        </div>
        
        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
      </div>
    );
  }
);

// Nome amigável para debug no React DevTools
Input.displayName = 'Input';
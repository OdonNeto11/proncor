import React from 'react';
import { themeClasses } from './Typography'; // INJETADO PARA CORES

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; // <-- CORRIGIDO: O ponto de interrogação salva as outras telas (opcional)
  error?: string;
  icon?: React.ReactNode; 
}

export function Input({ label, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Condicional adicionada: só desenha a label se ela for enviada */}
      {label && (
        <label className={`text-sm font-semibold ${themeClasses.text}`}>
          {label} {props.required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Ícone posicionado à esquerda (Intocado) */}
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}
        
        <input 
          className={`
            w-full rounded-lg border px-3 py-2 text-sm 
            focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 
            disabled:cursor-not-allowed disabled:opacity-50
            /* CORES INJETADAS DO TEMA AQUI */
            bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700
            ${themeClasses.text} ${themeClasses.placeholder}
            /* MANTIDO SEU PL-10 ORIGINAL PARA NÃO EMPURRAR O TEXTO PRO MEIO */
            ${icon ? 'pl-10' : ''} 
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} 
            ${className}
          `}
          {...props}
        />
      </div>
      
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
}
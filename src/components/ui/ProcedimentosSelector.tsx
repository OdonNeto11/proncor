// src/components/ui/ProcedimentosSelector.tsx
import React from 'react';
import { Activity } from 'lucide-react';
import { themeClasses } from './Typography';

interface ProcedimentosSelectorProps {
  opcoes: string[];
  selecionados: string[];
  onToggle: (opcao: string) => void;
  label?: string;
}

export function ProcedimentosSelector({ opcoes, selecionados, onToggle, label = "Procedimentos" }: ProcedimentosSelectorProps) {
  return (
    <div className="w-full">
       <label className={`text-sm font-semibold mb-2 block ${themeClasses.text}`}>{label}</label>
       <div className="flex flex-wrap gap-2">
         {opcoes.map((proc) => {
           const isSelected = selecionados.includes(proc);
           return (
             <button
               key={proc}
               type="button"
               onClick={() => onToggle(proc)}
               className={`
                 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-all flex items-center gap-1.5
                 ${isSelected 
                     ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50' 
                     : `bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 ${themeClasses.text}`
                 }
               `}
             >
               <Activity size={14} className={isSelected ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'} />
               {proc}
             </button>
           )
         })}
       </div>
    </div>
  );
}
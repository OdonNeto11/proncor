import React, { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface ActionListItemProps {
  icon: ReactNode;
  title: string;
  onClick: () => void;
  colorTheme?: 'blue' | 'green' | 'purple' | 'indigo' | 'orange' | 'red' | 'gray';
  hideChevron?: boolean;
}

export function ActionListItem({ icon, title, onClick, colorTheme = 'gray', hideChevron = false }: ActionListItemProps) {
  
  // Mapeamento das classes de cores usando os padrões que já utilizamos
  const themeStyles = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    purple: 'border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100',
    orange: 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100',
    red: 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100',
    gray: 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
  };

  const chevronColors = {
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    purple: 'text-purple-400',
    indigo: 'text-indigo-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
    gray: 'text-slate-400',
  };

  return (
    <button 
      onClick={onClick} 
      type="button"
      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all group active:scale-[0.98] ${themeStyles[colorTheme]}`}
    >
      <span className="font-bold flex items-center gap-3">
        {icon} 
        {title}
      </span>
      {!hideChevron && (
        <ChevronRight size={18} className={`${chevronColors[colorTheme]} group-hover:translate-x-1 transition-transform`}/>
      )}
    </button>
  );
}
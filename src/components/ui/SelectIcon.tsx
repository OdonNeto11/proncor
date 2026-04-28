// Componente de seleção (dropdown) customizado com um ícone posicionado à esquerda.
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SelectIconProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon: LucideIcon;
  options: { value: string | number; label: string }[];
}

export function SelectIcon({ icon: Icon, options, className = '', ...props }: SelectIconProps) {
  return (
    <div className="relative w-full">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
      <select 
        className={`w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none bg-white dark:bg-slate-800 dark:text-slate-200 h-10 shadow-sm transition-all ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
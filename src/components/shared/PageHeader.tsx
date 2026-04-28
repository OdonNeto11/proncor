// Componente estrutural que padroniza o topo das páginas, exibindo o módulo, título e descrição.
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Title, Description } from '../ui/Typography';

interface PageHeaderProps {
  module: string;
  title: string;
  description: string;
  icon: LucideIcon;
  themeColor?: 'blue' | 'purple';
}

export function PageHeader({ module, title, description, icon: Icon, themeColor = 'blue' }: PageHeaderProps) {
  const colorClass = themeColor === 'purple' ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400';
  
  return (
    <div className="mb-8">
      <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-widest mb-2 ${colorClass}`}>
        <Icon size={16} /> Módulo: {module}
      </div>
      <Title className="mb-2">{title}</Title>
      <Description>{description}</Description>
    </div>
  );
}
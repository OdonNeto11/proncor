// Exibe uma interface amigável (ícone + mensagem + ação) para quando uma lista ou busca não retorna resultados.
import React from 'react';
import { LucideIcon, RefreshCw } from 'lucide-react';
import { Description } from './Typography';
import { Card } from './Card';

interface EmptyStateProps {
  message: string;
  icon: LucideIcon;
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyState({ message, icon: Icon, onAction, actionLabel = "Limpar Filtros" }: EmptyStateProps) {
  return (
    <Card className="text-center py-20 border-dashed border-slate-300 dark:border-slate-700 shadow-none bg-transparent">
      <Icon size={48} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
      <Description className="font-medium mb-4">{message}</Description>
      {onAction && (
        <button 
          onClick={onAction} 
          className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center justify-center gap-2 mx-auto"
        >
          <RefreshCw size={16} /> {actionLabel}
        </button>
      )}
    </Card>
  );
}
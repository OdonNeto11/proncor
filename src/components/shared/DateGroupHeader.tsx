// Divisor visual para listas agrupadas, que identifica se a data é Hoje, Amanhã ou exibe o dia formatado.
import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateGroupHeaderProps {
  date: string;
  theme?: 'blue' | 'purple';
}

export function DateGroupHeader({ date, theme = 'blue' }: DateGroupHeaderProps) {
  const isBlue = theme === 'blue';
  const bgClass = isBlue ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-purple-50 dark:bg-purple-900/20';
  const borderClass = isBlue ? 'border-blue-100 dark:border-blue-900/30' : 'border-purple-100 dark:border-purple-900/30';
  const iconClass = isBlue ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400';

  return (
    <div className={`flex items-center gap-3 mb-4 p-2 rounded-lg w-full border shadow-sm ${bgClass} ${borderClass}`}>
      <CalendarIcon className={iconClass} size={18} />
      <h2 className="font-bold text-gray-800 dark:text-slate-200 capitalize text-sm">
        {isToday(parseISO(date)) ? 'Hoje' : isTomorrow(parseISO(date)) ? 'Amanhã' : format(parseISO(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
      </h2>
    </div>
  );
}
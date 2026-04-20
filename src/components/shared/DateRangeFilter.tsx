// Componente de seleção de intervalo de datas (Início e Fim) utilizando o react-datepicker.
import React from 'react';
import DatePicker from 'react-datepicker';
import { Calendar as CalendarIcon } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
}

export function DateRangeFilter({ startDate, endDate, onStartDateChange, onEndDateChange }: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-2 w-full lg:w-auto">
      <div className="relative flex-1">
        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={16} />
        <DatePicker 
          selected={startDate} 
          onChange={onStartDateChange} 
          locale="pt-BR" 
          dateFormat="dd/MM/yyyy" 
          placeholderText="Início" 
          className="custom-datepicker-input !h-10 !text-sm !pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" 
          onFocus={(e) => e.target.blur()} 
        />
      </div>
      <span className="text-gray-400 text-sm font-medium">até</span>
      <div className="relative flex-1">
        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={16} />
        <DatePicker 
          selected={endDate} 
          onChange={onEndDateChange} 
          locale="pt-BR" 
          dateFormat="dd/MM/yyyy" 
          placeholderText="Fim" 
          className="custom-datepicker-input !h-10 !text-sm !pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" 
          onFocus={(e) => e.target.blur()} 
        />
      </div>
    </div>
  );
}
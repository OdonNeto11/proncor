import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DatePickerProps {
  value: string; // Espera o formato 'yyyy-MM-dd'
  onChange: (e: { target: { value: string } }) => void; // Simula o evento nativo para manter a compatibilidade
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = "Selecione uma data", className = '' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? parseISO(value) : new Date());
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? parseISO(value) : null;

  // Fecha o calendário ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const onDateClick = (day: Date) => {
    // Retorna no formato YYYY-MM-DD (padrão de banco de dados e do input nativo)
    onChange({ target: { value: format(day, 'yyyy-MM-dd') } });
    setIsOpen(false);
  };

  // Renderiza o cabeçalho (Mês e Ano)
  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <button type="button" onClick={prevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button type="button" onClick={nextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>
    );
  };

  // Renderiza os dias da semana (D, S, T, Q, Q, S, S)
  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth);
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 w-8 h-8 flex items-center justify-center">
          {format(addDays(startDate, i), 'EEEEE', { locale: ptBR })}
        </div>
      );
    }
    return <div className="flex w-full justify-between mb-2">{days}</div>;
  };

  // Renderiza a grade de dias
  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        
        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());

        days.push(
          <div key={day.toString()} className="w-8 h-8 flex items-center justify-center">
            <button
              type="button"
              onClick={() => onDateClick(cloneDay)}
              className={`
                w-7 h-7 rounded-full text-sm flex items-center justify-center transition-colors
                ${!isCurrentMonth ? 'text-slate-300 dark:text-slate-600 hover:text-slate-500' : ''}
                ${isCurrentMonth && !isSelected ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700' : ''}
                ${isSelected ? 'bg-emerald-500 text-white font-bold shadow-sm' : ''}
                ${isToday && !isSelected ? 'border border-emerald-500 text-emerald-600 dark:text-emerald-400' : ''}
              `}
            >
              {formattedDate}
            </button>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="flex w-full justify-between mt-1" key={day.toString()}>{days}</div>);
      days = [];
    }
    return <div className="flex flex-col">{rows}</div>;
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* INPUT VISUAL FALSO (Apenas para mostrar a data bonitinha) */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 pl-10 pr-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm flex items-center transition-all cursor-pointer shadow-sm hover:border-emerald-400 dark:hover:border-emerald-600 ${isOpen ? 'border-emerald-500 ring-1 ring-emerald-500' : ''} ${className}`}
      >
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500 dark:text-emerald-400">
          <CalendarIcon size={18} />
        </div>
        <span className={value ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400'}>
          {value ? format(parseISO(value), 'dd/MM/yyyy') : placeholder}
        </span>
      </div>

      {/* POPUP DO CALENDÁRIO */}
      {isOpen && (
        <div className="absolute z-[100] mt-2 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-2 w-72 left-0 md:right-0 md:left-auto">
          {renderHeader()}
          {renderDays()}
          {renderCells()}
        </div>
      )}
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar as CalendarIcon, ChevronDown, Search } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  
  statusValue?: string;
  onStatusChange?: (status: string) => void;
  statusOptions?: { value: string; label: string }[];

  // === NOVOS PROPS PARA A BUSCA ===
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export function DateRangeFilter({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange,
  statusValue,
  onStatusChange,
  statusOptions,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar..."
}: DateRangeFilterProps) {
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const selectedOption = statusOptions?.find(opt => opt.value === statusValue) || statusOptions?.[0];

  return (
    <div className="flex flex-col xl:flex-row items-center gap-4 w-full">
      
      {/* 1. CAMPO DE BUSCA (Estica para preencher o vazio com flex-1) */}
      {onSearchChange && (
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
          <input 
            type="text"
            value={searchValue || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
          />
        </div>
      )}

      {/* 2. FILTRO DE DATAS (Tamanho fixo) */}
      <div className="flex items-center gap-2 w-full xl:w-auto flex-shrink-0">
        <div className="relative flex-1 xl:w-36">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={16} />
          <DatePicker 
            selected={startDate} 
            onChange={onStartDateChange} 
            locale="pt-BR" 
            dateFormat="dd/MM/yyyy" 
            placeholderText="Início" 
            className="custom-datepicker-input w-full !h-10 !text-sm !pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" 
            onFocus={(e) => e.target.blur()} 
          />
        </div>
        <span className="text-gray-400 text-sm font-medium">até</span>
        <div className="relative flex-1 xl:w-36">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={16} />
          <DatePicker 
            selected={endDate} 
            onChange={onEndDateChange} 
            locale="pt-BR" 
            dateFormat="dd/MM/yyyy" 
            placeholderText="Fim" 
            className="custom-datepicker-input w-full !h-10 !text-sm !pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" 
            onFocus={(e) => e.target.blur()} 
          />
        </div>
      </div>

      {/* 3. FILTRO DE STATUS (Tamanho fixo) */}
      {statusOptions && onStatusChange && (
        <div className="relative w-full xl:w-auto flex-shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between gap-3 w-full xl:w-auto min-w-[220px] h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <span className="truncate">{selectedOption?.label || 'Filtrar por Status'}</span>
            <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 xl:left-0 top-full mt-2 w-full xl:w-64 max-h-[300px] overflow-y-auto bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100">
              {statusOptions.map((opt) => {
                const isSelected = statusValue === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onStatusChange(opt.value);
                      setIsDropdownOpen(false);
                    }}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 font-medium'
                    }`}
                  >
                    {opt.label}
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
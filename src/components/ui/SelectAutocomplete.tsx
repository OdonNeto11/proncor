import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronDown, Search } from 'lucide-react';

interface SelectAutocompleteProps {
  label?: string;
  tableName: string;
  columnName: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function SelectAutocomplete({ 
  label, 
  tableName, 
  columnName, 
  value, 
  onChange, 
  placeholder = "Selecione ou digite...", 
  required 
}: SelectAutocompleteProps) {
  
  const [options, setOptions] = useState<string[]>([]);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Busca inicial dos dados no Supabase
  useEffect(() => {
    const fetchOptions = async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select(columnName)
        .order(columnName);
        
      if (!error && data) {
        const uniqueOptions = Array.from(new Set(data.map((item: any) => item[columnName])));
        setOptions(uniqueOptions as string[]);
        setFilteredOptions(uniqueOptions as string[]);
      }
    };
    fetchOptions();
  }, [tableName, columnName]);

  // Sincroniza o valor externo com o input interno
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fecha o menu se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Se o usuário digitou algo novo e clicou fora, a gente ACEITA esse valor
        if (inputValue.trim() !== '' && inputValue !== value) {
          onChange(inputValue);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, value, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    setIsOpen(true);
    
    const filtered = options.filter(opt => 
      opt.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredOptions(filtered);
    
    // Atualiza o valor externo em tempo real, permitindo texto livre
    onChange(text);
  };

  const handleSelectOption = (option: string) => {
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className="w-full flex flex-col gap-1.5 relative" ref={wrapperRef}>
      {label && (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex gap-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search size={18} />
        </div>
        
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            setFilteredOptions(options);
          }}
          placeholder={placeholder}
          className="w-full h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all outline-none pl-10 pr-10 shadow-sm"
        />
        
        <div 
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 cursor-pointer hover:text-purple-500 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto top-full animate-in fade-in slide-in-from-top-2">
          {filteredOptions.map((opt, index) => (
            <li 
              key={index}
              onClick={() => handleSelectOption(opt)}
              className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-slate-700 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
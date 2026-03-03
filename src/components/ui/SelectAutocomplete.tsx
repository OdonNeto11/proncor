import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { normalizeString } from '../../utils/stringUtils';
import { Search } from 'lucide-react';
import { Input } from './Input';

interface Props {
  value: string;
  onChange: (val: string) => void;
  label: string;
  tableName: string;  // NOVO: Qual tabela buscar?
  columnName: string; // NOVO: Qual coluna exibir?
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function SelectAutocomplete({ value, onChange, label, tableName, columnName, placeholder, required, error }: Props) {
  const [options, setOptions] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

// A CONSULTA AGORA É DINÂMICA E TIPADA
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from(tableName).select(columnName).eq('situacao', 1);
      if (data) {
        // CORREÇÃO: Tipamos o 'item' como Record<string, any> para o TypeScript aceitar a busca dinâmica
        setOptions(data.map((item: Record<string, any>) => item[columnName]));
      }
    };
    fetchData();
  }, [tableName, columnName]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    onChange(term);
    
    if (term.length > 0) {
      const normalizedTerm = normalizeString(term);
      const matches = options.filter(opt => 
        normalizeString(opt).includes(normalizedTerm)
      );
      setFiltered(matches);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      if (value && value.trim() !== '') {
        const match = options.find(opt => normalizeString(opt) === normalizeString(value));
        if (match) {
          onChange(match);
        } else {
          onChange('');
        }
      }
    }, 200);
  };

  return (
    <div className="relative w-full">
      <Input
        label={label}
        required={required}
        value={value}
        onChange={handleInputChange}
        onFocus={() => value.length > 0 && setIsOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        icon={<Search size={18} />}
        error={error}
      />

      {isOpen && filtered.length > 0 && (
        <ul className="absolute z-[100] w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {filtered.map((opt, i) => (
            <li 
              key={i}
              onMouseDown={(e) => {
                e.preventDefault(); 
                onChange(opt);
                setIsOpen(false);
              }}
              className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
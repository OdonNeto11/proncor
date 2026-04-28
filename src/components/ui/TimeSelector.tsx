import React from 'react';
import { format } from 'date-fns';
import { themeClasses } from './Typography';

interface TimeSelectorProps {
  horarios: string[];
  selectedTime: Date | null;
  onSelectTime: (time: string) => void;
  checkIsDisabled: (time: string) => boolean;
  isLoading?: boolean;
  error?: string;
  gridClassName?: string; // NOVO: Permite mudar o tamanho da grade de fora
}

export function TimeSelector({ 
  horarios, 
  selectedTime, 
  onSelectTime, 
  checkIsDisabled, 
  isLoading, 
  error,
  gridClassName = "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3" // Padrão tela cheia
}: TimeSelectorProps) {
  return (
    <div className="w-full">
      <label className={`text-sm font-semibold mb-3 flex items-center gap-2 ${themeClasses.text}`}>
          Selecione o Horário <span className="text-red-500">*</span>
          {selectedTime && <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Selecionado: {format(selectedTime, 'HH:mm')}</span>}
      </label>
      
      {isLoading || horarios.length === 0 ? (
        <p className={`text-sm italic ${themeClasses.text}`}>Carregando horários...</p>
      ) : (
        <div className={`grid ${gridClassName} p-1 rounded-xl ${error ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30' : ''}`}>
            {horarios.map((horario) => {
                const isDisabled = checkIsDisabled(horario);
                const isSelected = selectedTime && format(selectedTime, 'HH:mm') === horario;

                return (
                    <button
                        key={horario}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => onSelectTime(horario)}
                        className={`
                            py-2 px-2 rounded-lg text-sm font-semibold border shadow-sm transition-all duration-200
                            ${isDisabled 
                                ? 'bg-slate-50 dark:bg-slate-900/50 text-slate-300 dark:text-slate-700 border-slate-100 dark:border-slate-800 cursor-not-allowed shadow-none'
                                : isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                    : `bg-white dark:bg-slate-800 hover:border-blue-400 border-slate-300 dark:border-slate-600 hover:text-blue-600 hover:shadow-md ${themeClasses.text}`
                            }
                        `}
                    >
                        <div className="flex items-center justify-center gap-1">
                            {horario}
                        </div>
                    </button>
                );
            })}
        </div>
      )}
      {error && <span className="text-xs text-red-500 mt-1 block font-medium">{error}</span>}
    </div>
  );
}
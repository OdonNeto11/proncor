import React from 'react';
import { MessageCircle, Activity } from 'lucide-react';

interface AtendimentoCardProps {
  id: number;
  badgeTopLeft: string; 
  badgeTopRight: string;
  badgeTopRightColorClasses: string;
  numeroAtendimento?: string;
  nomePaciente: string;
  telefone?: string;
  planoSaude?: string;
  crm?: string;
  origem?: string;
  tagsLabel: string;
  tags: string[];
  onClick: () => void;
  indicadorCor?: string;
}

export function AtendimentoCard({
  badgeTopLeft,
  badgeTopRight,
  badgeTopRightColorClasses,
  numeroAtendimento,
  nomePaciente,
  telefone,
  planoSaude,
  crm,
  origem,
  tagsLabel,
  tags,
  onClick,
  indicadorCor = 'bg-slate-300 dark:bg-slate-600'
}: AtendimentoCardProps) {
  return (
    <div 
      onClick={onClick} 
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden group transition-all flex flex-col hover:border-blue-400 dark:hover:border-blue-500"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${indicadorCor}`} /> 
      
      <div className="pl-3 flex flex-col">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-start mb-2.5 gap-2">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-[11px] uppercase tracking-wide whitespace-nowrap">
               {badgeTopLeft}
            </span>
            
            {origem && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-md border uppercase whitespace-nowrap ${origem === 'PA' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                {origem}
              </span>
            )}

            {numeroAtendimento && (
              <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500">#{numeroAtendimento}</span>
            )}
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase border whitespace-nowrap tracking-wide ${badgeTopRightColorClasses}`}>
            {badgeTopRight}
          </span>
        </div>

        {/* CORPO */}
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[15px] leading-tight mb-2 line-clamp-1" title={nomePaciente}>
            {nomePaciente}
        </h3>
        
        <div className="flex flex-wrap gap-2 items-center mb-3">
            {telefone && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                    <MessageCircle size={12} /> {telefone}
                </p>
            )}
            {planoSaude && planoSaude.trim() !== '' && (
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-800/50 uppercase">
                    {planoSaude}
                </span>
            )}
            {crm && (
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 uppercase">
                    CRM {crm}
                </span>
            )}
        </div>

        {/* EXAMES */}
        {tags && tags.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">{tagsLabel}:</p>
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                  <Activity size={10} className="text-blue-500 dark:text-blue-400" /> {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center">+{tags.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {/* RODAPÉ */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center mt-auto">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300 transition-colors flex items-center gap-1">
            Ver Detalhes <span className="text-sm leading-none">&rarr;</span>
          </span>
        </div>

      </div>
    </div>
  );
}
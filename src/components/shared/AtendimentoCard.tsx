import React from 'react';
import { MessageCircle, Activity } from 'lucide-react';

interface AtendimentoCardProps {
  id: number | string;
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
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden group transition-all flex flex-col h-full hover:border-blue-400 dark:hover:border-blue-500"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${indicadorCor}`} /> 
      
      <div className="pl-3 flex flex-col h-full">
        
        {/* PRIMEIRA LINHA: Data e Status */}
        <div className="flex justify-between items-start mb-2 gap-2">
          {/* Data Maior */}
          <span className="font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-sm uppercase tracking-wide whitespace-nowrap">
             {badgeTopLeft}
          </span>
          
          {/* Status Menor */}
          <span className={`text-[11px] font-bold px-2 py-1 rounded-md uppercase border whitespace-nowrap tracking-wide ${badgeTopRightColorClasses}`}>
            {badgeTopRight}
          </span>
        </div>

        {/* SEGUNDA LINHA: Origem e Número (conforme sua foto) */}
        {(origem || numeroAtendimento) && (
          <div className="flex flex-wrap gap-2 items-center mb-3">
            {origem && (
              <span className={`text-[11px] font-bold px-2 py-1 rounded-md border uppercase whitespace-nowrap ${origem === 'PA' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                {origem}
              </span>
            )}
            {numeroAtendimento && (
              <span className="text-sm font-mono font-bold text-slate-400 dark:text-slate-500">#{numeroAtendimento}</span>
            )}
          </div>
        )}

        {/* CORPO: Nome do Paciente */}
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight mb-2 line-clamp-2" title={nomePaciente}>
            {nomePaciente}
        </h3>
        
        {/* CONTATOS E INFO */}
        <div className="flex flex-wrap gap-2 items-center mb-4">
            {telefone && (
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
                    <MessageCircle size={14} /> {telefone}
                </p>
            )}
            {crm && (
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 uppercase tracking-wide">
                    CRM {crm}
                </span>
            )}
            {planoSaude && planoSaude.trim() !== '' && (
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-800/50 uppercase tracking-wide">
                    {planoSaude}
                </span>
            )}
        </div>

        {/* EXAMES */}
        {tags && tags.length > 0 && (
          <div className="mb-3 mt-auto">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">{tagsLabel}:</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold px-2 py-1 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                  <Activity size={12} className="text-blue-500 dark:text-blue-400" /> {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold flex items-center">+{tags.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {/* RODAPÉ */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center mt-auto">
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300 transition-colors flex items-center gap-1 group-hover:translate-x-1">
            Ver Detalhes <span className="text-lg leading-none">&rarr;</span>
          </span>
        </div>

      </div>
    </div>
  );
}
import React from 'react';
import { Mail, Shield, Building2, Edit2, Trash2, XCircle, CheckCircle2 } from 'lucide-react';

interface ItemUsuarioProps {
  user: any;
  onEdit: (user: any) => void;
  onDelete: (user: any) => void;
  onToggleStatus: (id: string, status: boolean) => void;
}

export function ItemUsuario({ user, onEdit, onDelete, onToggleStatus }: ItemUsuarioProps) {
  // Pegamos as alocações da nova tabela
  const alocacoes = user.usuario_alocacoes || [];

  return (
    <div className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${user.is_active ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'bg-red-50/50 dark:bg-red-900/10 opacity-75'}`}>
      
      {/* COLUNA 1: DADOS BÁSICOS */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className={`font-bold text-base ${user.is_active ? 'text-gray-800 dark:text-slate-200' : 'text-gray-500 line-through'}`}>{user.nome}</h4>
{/* Exemplo de onde aplicar (ao lado do nome do usuário): */}
<span className={`
  px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md border
  ${user.is_active 
    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
    : 'bg-red-100 text-red-700 border-red-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
  }
`}>
  {user.is_active ? 'Ativo' : 'Bloqueado'}
</span>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <span className="flex items-center gap-1"><Mail size={14}/> {user.email}</span>
          {user.crm && <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">CRM: {user.crm}</span>}
        </div>
      </div>

{/* COLUNA 2: CARGO (Valores únicos) */}
<div className="flex-1 md:text-center text-sm">
  {alocacoes.length > 0 ? (
    <div className="space-y-1">
      {Array.from(new Set(alocacoes.map((a: any) => a.roles?.nome))).map((roleNome: any, idx: number) => (
        <div key={idx} className="font-semibold text-gray-700 dark:text-slate-300 flex items-center md:justify-center gap-1 text-xs">
          <Shield size={12} className="text-blue-500"/> {roleNome}
        </div>
      ))}
    </div>
  ) : (
    <span className="text-red-400 text-xs font-bold italic">Sem cargo</span>
  )}
</div>

      {/* COLUNA 3: SETOR (NOVA COLUNA SEPARADA) */}
      <div className="flex-1 md:text-center text-sm">
        {alocacoes.length > 0 ? (
          <div className="space-y-1">
            {alocacoes.map((aloc: any, idx: number) => (
              <div key={idx} className="text-slate-500 dark:text-slate-400 flex items-center md:justify-center gap-1 text-[11px] font-medium">
                <Building2 size={12}/> {aloc.setores?.nome}
              </div>
            ))}
          </div>
        ) : (
          <span className="text-red-400 text-xs font-bold italic">Sem setor</span>
        )}
      </div>

      {/* COLUNA 4: AÇÕES */}
      <div className="flex items-center justify-end gap-2 md:w-72">
        <button onClick={() => onEdit(user)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-200"><Edit2 size={18} /></button>
        <button onClick={() => onDelete(user)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-200"><Trash2 size={18} /></button>
        <button onClick={() => onToggleStatus(user.id, user.is_active)} className={`text-sm font-semibold flex items-center gap-1 px-3 py-2 rounded-lg transition-colors border w-28 justify-center ${user.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
          {user.is_active ? <><XCircle size={14}/> Bloquear</> : <><CheckCircle2 size={14}/> Desbloquear</>}
        </button>
      </div>
    </div>
  );
}
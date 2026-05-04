import React from 'react';
import { Edit, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '../../../components/ui/Button';
import { ModalDetalhesLayout } from '../../../components/shared/ModalDetalhesLayout';

const STATUS_CONFIG: Record<number, { label: string, color: string, border: string }> = {
  1: { label: 'Agendado', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  2: { label: 'Reagendado', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
  3: { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  4: { label: 'Não respondeu após reagendamento', color: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400', border: 'border-gray-200 dark:border-slate-700' },
  5: { label: 'Finalizado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
  6: { label: 'Encaminhado PA', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  7: { label: 'Retorno ao PA', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
};

interface ModalDetalhesProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: any;
  podeEditar: boolean;
  podeAtualizar: boolean;
  podeReagendar: boolean;
  podeCancelar: boolean;
  podeWhatsApp: boolean;
  onAction: (mode: 'edit' | 'reschedule' | 'update_status' | 'cancel') => void;
}

export function ModalDetalhes({ 
  isOpen, onClose, agendamento, podeEditar, podeAtualizar, podeReagendar, podeCancelar, podeWhatsApp, onAction 
}: ModalDetalhesProps) {
  if (!agendamento) return null;

  const statusInfo = STATUS_CONFIG[agendamento.status_id || 1];
  const isPendente = !agendamento.status_id || agendamento.status_id === 1 || agendamento.status_id === 2 || agendamento.status?.agrupamento === 'pendente';

  return (
    <ModalDetalhesLayout 
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="line-clamp-1 dark:text-slate-100">{agendamento.nome_paciente}</span>
          {isPendente && podeEditar && (
            <button onClick={() => onAction('edit')} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 rounded-lg">
              <Edit size={18} />
            </button>
          )}
        </div>
      }
      infoBoxes={[
        { label: 'Data', value: format(parseISO(agendamento.data_agendamento), 'dd/MM'), theme: 'blue' },
        { label: 'Hora', value: agendamento.hora_agendamento, theme: 'blue' },
        { label: 'Atendimento', value: `#${agendamento.numero_atendimento}`, theme: 'blue' }
      ]}
      statusLabel={statusInfo?.label || 'Desconhecido'}
      statusClasses={{ color: statusInfo?.color, border: statusInfo?.border }}
      tagsLabel="Procedimentos"
      tags={agendamento.procedimentos || []}
      phoneForWhats={podeWhatsApp ? agendamento.telefone_paciente : undefined}
      obsLabel="Diagnóstico / Condutas"
      obsText={agendamento.diagnostico || 'Sem observações.'}
      actionButtons={
        isPendente ? (
          <>
            {podeAtualizar && <Button variant="primary" fullWidth onClick={() => onAction('update_status')} icon={<CheckCircle2 size={18} />}>Atualizar Status</Button>}
            {podeReagendar && <Button variant="warning" fullWidth onClick={() => onAction('reschedule')} icon={<AlertTriangle size={18} />}>Reagendar</Button>}
          </>
        ) : undefined
      }
      footerButtons={
        isPendente && podeCancelar ? (
          <Button variant="textDanger" size="sm" fullWidth className="mt-1" onClick={() => onAction('cancel')}>Cancelar agendamento</Button>
        ) : undefined
      }
    />
  );
}
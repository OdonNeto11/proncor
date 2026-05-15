import React from 'react';
import { Edit, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '../../../components/ui/Button';
import { ModalDetalhesLayout } from '../../../components/shared/ModalDetalhesLayout';

import { STATUS_CONFIG } from '../../../constants/status';
import { Agendamento } from '../../../types/agendamento';
interface ModalDetalhesProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: Agendamento | null;
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
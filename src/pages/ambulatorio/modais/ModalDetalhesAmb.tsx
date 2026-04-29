import React from 'react';
import { Download, CheckCircle2, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../../lib/supabase';

// COMPONENTES UI
import { Button } from '../../../components/ui/Button';
import { ModalDetalhesLayout } from '../../../components/shared/ModalDetalhesLayout';

// HOOKS
import { usePermissoes } from '../../../hooks/usePermissoes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  encaminhamento: any;
  statusConfig: { label: string; color: string; border: string };
  onEdit: () => void;
  onUpdateStatus: () => void;
  onCancel: () => void;
}

export function ModalDetalhesAmb({ 
  isOpen, 
  onClose, 
  encaminhamento, 
  statusConfig,
  onEdit,
  onUpdateStatus,
  onCancel
}: Props) {
  const { podeEditarAmb, podeGerenciarStatusAmb, podeCancelarAmb } = usePermissoes();

  if (!encaminhamento) return null;

  const handleDownloadAnexo = () => {
    const { data } = supabase.storage.from('anexos').getPublicUrl(encaminhamento.anexo_url);
    window.open(data.publicUrl, '_blank');
  };

  return (
    <ModalDetalhesLayout 
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="line-clamp-1 dark:text-slate-100">
            {encaminhamento.nome_paciente || 'Nome não informado'}
          </span>
          {[13, 1].includes(encaminhamento.status_id) && podeEditarAmb && (
            <button 
              onClick={onEdit} 
              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors"
            >
              <Edit size={18} />
            </button>
          )}
        </div>
      }
      infoBoxes={[
        { 
          label: 'Solicitado em', 
          value: format(parseISO(encaminhamento.created_at), "dd/MM · HH:mm"), 
          theme: 'purple' 
        },
        { 
          label: 'Origem', 
          value: encaminhamento.origem, 
          theme: encaminhamento.origem === 'PA' ? 'blue' : 'slate' 
        },
        { 
          label: 'Atendimento', 
          value: encaminhamento.numero_atendimento ? `#${encaminhamento.numero_atendimento}` : 'N/A', 
          theme: 'slate' 
        }
      ]}
      statusLabel={statusConfig?.label}
      statusClasses={{ color: statusConfig?.color, border: statusConfig?.border }}
      tagsLabel="Exames"
      tags={encaminhamento.exames_especialidades}
      phoneForWhats={encaminhamento.telefone_paciente}
      obsText={encaminhamento.observacoes || 'Sem observações.'}
      
      actionButtons={
        <div className="flex flex-col gap-3 w-full">
          {encaminhamento.anexo_url && (
            <Button 
              variant="secondary" 
              fullWidth 
              icon={<Download size={18} />} 
              onClick={handleDownloadAnexo}
            >
              Ver / Baixar Anexo
            </Button>
          )}
          
          {[13, 1].includes(encaminhamento.status_id) && podeGerenciarStatusAmb && (
            <Button 
              variant="primary" 
              fullWidth 
              icon={<CheckCircle2 size={18} />} 
              onClick={onUpdateStatus}
            >
              Atualizar Status
            </Button>
          )}

          {podeCancelarAmb && [1, 9, 13].includes(encaminhamento.status_id) && (
            <Button 
              variant="textDanger" 
              size="sm" 
              fullWidth 
              className="mt-1"
              onClick={onCancel}
            >
              Cancelar Pedido
            </Button>
          )}
        </div>
      }
    />
  );
}
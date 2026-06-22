import React, { useState, useEffect } from 'react';
import { CheckCircle2, ArrowRightCircle, Stethoscope, AlertCircle, ChevronLeft, ExternalLink } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

// React Hook Form + Zod
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// IMPORT DAS REGRAS PADRONIZADAS
import { zCrm } from '../../../utils/validations';

// IMPORT DA FUNÇÃO DO WHATSAPP (NOVO)
import { abrirWhatsAppPesquisa } from '../../../utils/whatsapp';

// Componentes
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ToastError } from '../../../components/ui/ToastError';

import { STATUS_CONFIG } from '../../../constants/status';
import { Agendamento } from '../../../types/agendamento';

const formSchema = z.object({
  crm: zCrm('Seu CRM'),
});

type StatusFormType = z.infer<typeof formSchema>;

interface ModalAtualizaStatusProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: Agendamento | null;
  onSuccess: () => void;
  statusDireto?: number; 
}

export function ModalAtualizaStatus({ isOpen, onClose, agendamento, onSuccess, statusDireto }: ModalAtualizaStatusProps) {
  const { user } = useAuth();
  
  const [step, setStep] = useState<'selecionar' | 'confirmar'>('selecionar');
  const [statusSelecionado, setStatusSelecionado] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<StatusFormType>({
    resolver: zodResolver(formSchema),
    defaultValues: { crm: '' }
  });

  useEffect(() => {
    if (isOpen) {
      if (statusDireto) {
        setStatusSelecionado(statusDireto);
        setStep('confirmar');
      } else {
        setStep('selecionar');
        setStatusSelecionado(null);
      }
      reset({ crm: '' });
      setErrorMsg('');
    }
  }, [isOpen, statusDireto, reset]);

  const handleSelectStatus = (id: number) => {
    setStatusSelecionado(id);
    setStep('confirmar');
  };

  const onSubmit = async (data: StatusFormType) => {
    if (!agendamento || !statusSelecionado) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.from('agendamentos').update({ 
        status_id: statusSelecionado, 
        crm_responsavel: data.crm 
      }).eq('id', agendamento.id);

      if (error) throw error;

      if (statusSelecionado === 6) {
        const examesParaAmbulatorio = agendamento.procedimentos && agendamento.procedimentos.length > 0 
          ? agendamento.procedimentos 
          : ['Avaliação pós-PA'];
          
        await supabase.from('encaminhamentos_ambulatorio').insert([{
          numero_atendimento: agendamento.numero_atendimento || '',
          nome_paciente: agendamento.nome_paciente,
          telefone_paciente: agendamento.telefone_paciente,
          plano_saude: '',
          exames_especialidades: examesParaAmbulatorio,
          observacoes: `Diagnóstico prévio: ${agendamento.diagnostico || 'Não informado.'}`,
          status_id: 1, 
          criado_por: user?.id,
          origem: 'PA',
          crm_solicitante: data.crm
        }]);
      }

      // ---> LÓGICA DE ENVIO DO WHATSAPP DO PACIENTE <---
      if (statusSelecionado === 5) {
        abrirWhatsAppPesquisa(
          agendamento.telefone_paciente,
          agendamento.nome_paciente,
          agendamento.id
        );
      }

      onSuccess();
    } catch (e: any) {
      setErrorMsg('Erro de comunicação com o banco de dados: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCrmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 5);
    setValue('crm', val, { shouldValidate: true });
  };

  const handleSimularSatisfacao = () => {
    if (!agendamento) return;
    const urlPublica = `${window.location.origin}/satisfacao/${agendamento.id}`;
    window.open(urlPublica, '_blank');
  };

  if (!isOpen || !agendamento) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={<span className="text-blue-600 dark:text-blue-400 font-bold">Atualizar Status</span>}
    >
      <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
        
        <div className="text-center mb-6">
          <span className="text-sm text-slate-500 block mb-1">Paciente selecionado:</span>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 break-words">
            {agendamento.nome_paciente || 'Nome não informado'}
          </div>
        </div>

        {step === 'selecionar' && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-slate-500 mb-2 text-center">Para qual status deseja movê-lo?</p>
            
            <Button variant="success" fullWidth justify="start" onClick={() => handleSelectStatus(5)} icon={<CheckCircle2 size={18}/>}>
              Finalizado
            </Button>
            <Button variant="purple" fullWidth justify="start" onClick={() => handleSelectStatus(6)} icon={<ArrowRightCircle size={18}/>}>
              Encaminhado ao Ambulatório
            </Button>
            <Button variant="indigo" fullWidth justify="start" onClick={() => handleSelectStatus(7)} icon={<Stethoscope size={18}/>}>
              Retorno ao PA
            </Button>
            
            {agendamento?.status_id === 2 && (
              <Button variant="secondary" fullWidth justify="start" onClick={() => handleSelectStatus(4)} icon={<AlertCircle size={18}/>}>
                Não respondeu após reagendamento
              </Button>
            )}

            <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
              <Button variant="secondary" fullWidth justify="center" onClick={handleSimularSatisfacao} icon={<ExternalLink size={16}/>} className="text-xs border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">
                [Dev] Testar Tela de Satisfação
              </Button>
            </div>
          </div>
        )}

        {step === 'confirmar' && statusSelecionado && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-center mb-4 border border-slate-100 dark:border-slate-800">
                <span className="text-sm text-slate-500 block mb-1">Novo status selecionado:</span>
                <span className={`font-bold text-lg ${STATUS_CONFIG[statusSelecionado]?.color}`}>
                    {STATUS_CONFIG[statusSelecionado]?.label}
                </span>
            </div>

            <div id="status-crm">
                <Input 
                  label="Seu CRM *" 
                  icon={<Stethoscope size={18} />} 
                  placeholder="Apenas números (Ex: 12345)" 
                  maxLength={5}
                  required={true}
                  error={errors.crm?.message || ''}
                  {...register('crm')}
                  onChange={handleCrmChange}
                />
            </div>

            <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />

            <div className="flex gap-2 pt-2">
              {!statusDireto && (
                <Button variant="secondary" className="px-3" type="button" onClick={() => setStep('selecionar')}>
                  <ChevronLeft size={20} />
                </Button>
              )}
              <Button variant="secondary" className="flex-1" type="button" onClick={onClose}>Cancelar</Button>
              <Button variant="primary" className="flex-1" type="submit" disabled={loading}>
                {loading ? 'Confirmando...' : 'Confirmar'}
              </Button>
            </div>
          </form>
        )}

      </div>
    </Modal>
  );
}
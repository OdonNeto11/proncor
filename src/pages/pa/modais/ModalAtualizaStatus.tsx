import React, { useState, useEffect } from 'react';
import { CheckCircle2, ArrowRightCircle, Stethoscope, AlertCircle, ChevronLeft } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

// React Hook Form + Zod
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// Componentes (Caminhos ajustados para a pasta)
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ToastError } from '../../../components/ui/ToastError';

const STATUS_CONFIG: Record<number, { label: string, color: string }> = {
  4: { label: 'Não respondeu após reagendamento', color: 'text-gray-600' },
  5: { label: 'Finalizado', color: 'text-green-600 dark:text-green-400' },
  6: { label: 'Encaminhado PA', color: 'text-purple-600 dark:text-purple-400' },
  7: { label: 'Retorno ao PA', color: 'text-indigo-600 dark:text-indigo-400' },
  3: { label: 'Cancelado', color: 'text-red-600 dark:text-red-400' } 
};

// === 1. SCHEMA DO ZOD PARA CONFIRMAÇÃO DO CRM ===
const formSchema = z.object({
  crm: z.string()
    .min(4, "O CRM deve ter pelo menos 4 dígitos")
    .max(5, "O CRM deve ter no máximo 5 dígitos")
    .regex(/^[0-9]+$/, "Apenas números permitidos"),
});

type StatusFormType = z.infer<typeof formSchema>;

interface ModalAtualizaStatusProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: any;
  onSuccess: () => void;
  statusDireto?: number; // Permite pular direto para a tela de CRM (ex: botão de Cancelar passa o 3)
}

export function ModalAtualizaStatus({ isOpen, onClose, agendamento, onSuccess, statusDireto }: ModalAtualizaStatusProps) {
  const { user } = useAuth();
  
  // Controle de fluxo interno do Modal
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

  // Reseta o estado sempre que o modal abre
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

      // Regra de negócio isolada: Se for 6, joga pro Ambulatório
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

      onSuccess(); // Grita pra Agenda que finalizou
    } catch (e: any) {
      setErrorMsg('Erro de comunicação com o banco de dados: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !agendamento) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={<span className="text-blue-600 dark:text-blue-400 font-bold">Atualizar Status</span>}
    >
      <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
        
        {/* ETAPA 1: ESCOLHER O STATUS */}
        {step === 'selecionar' && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-slate-500 mb-2">Para qual status deseja mover o paciente <strong className="text-slate-700 dark:text-slate-300">{agendamento.nome_paciente}</strong>?</p>
            
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
          </div>
        )}

        {/* ETAPA 2: CONFIRMAR COM O CRM */}
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
                  label="Seu CRM (Obrigatório) *" 
                  icon={<Stethoscope size={18} />} 
                  placeholder="Apenas números (Ex: 12345)" 
                  maxLength={5}
                  error={errors.crm?.message as string}
                  {...register('crm')}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('crm', e.target.value.replace(/\D/g, '').slice(0, 5), { shouldValidate: true })}
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
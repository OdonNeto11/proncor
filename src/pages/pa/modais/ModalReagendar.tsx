import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Stethoscope } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format, setHours, setMinutes } from 'date-fns';
import { supabase } from '../../../lib/supabase'; 

// React Hook Form + Zod
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';

// Componentes (Caminhos ajustados para a nova pasta)
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { TimeSelector } from '../../../components/ui/TimeSelector';
import { ToastError } from '../../../components/ui/ToastError';
import { useHorarios } from '../../../hooks/useHorarios';

// === 1. SCHEMA DO ZOD ESPECÍFICO PARA REAGENDAR ===
const formSchema = z.object({
  nova_data: z.any().refine((val) => val instanceof Date && !isNaN(val.getTime()), { 
    message: "A nova data é obrigatória" 
  }),
  novo_horario: z.any().refine((val) => val instanceof Date && !isNaN(val.getTime()), { 
    message: "O novo horário é obrigatório" 
  }),
  motivo: z.string().optional(),
  crm: z.string()
    .min(4, "O CRM deve ter pelo menos 4 dígitos")
    .max(5, "O CRM deve ter no máximo 5 dígitos")
    .regex(/^[0-9]+$/, "Apenas números"),
});

type ReagendarFormType = z.infer<typeof formSchema>;

// Props que este modal precisa receber da Agenda
interface ModalReagendarProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: any; // Recebe o agendamento completo selecionado
  onSuccess: () => void; // Função para atualizar a lista da tela principal
}

export function ModalReagendar({ isOpen, onClose, agendamento, onSuccess }: ModalReagendarProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors }
  } = useForm<ReagendarFormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nova_data: new Date(), // Já inicia no dia atual
      novo_horario: undefined,
      motivo: '',
      crm: ''
    }
  });

  const watchData = watch('nova_data');
  const watchHorario = watch('novo_horario');

  // Puxa a inteligência de horários baseada na nova data selecionada
  const { horariosDisponiveis, checkIsDisabled, isLoadingHorarios, refreshBookedTimes } = useHorarios(watchData);

  // Reseta o form toda vez que o modal for aberto para um novo paciente
  useEffect(() => {
    if (isOpen) {
      reset({ nova_data: new Date(), novo_horario: undefined, motivo: '', crm: '' });
      setErrorMsg('');
    }
  }, [isOpen, reset]);

  // Handle de Horário
  const handleSelectTime = (timeStr: string) => {
    if (!watchData) return;
    const [h, m] = timeStr.split(':').map(Number);
    setValue('novo_horario', setHours(setMinutes(new Date(watchData), m), h), { shouldValidate: true });
  };

  // Envio para o Banco
  const onSubmit = async (data: ReagendarFormType) => {
    if (!agendamento) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const dataStr = format(data.nova_data, 'yyyy-MM-dd');
      const horaStr = format(data.novo_horario, 'HH:mm');
      
      // Concatena o motivo novo no diagnóstico antigo, como você havia estruturado
      const novoDiagnostico = (agendamento.diagnostico || '') + 
        `\n[Reagendado em ${format(new Date(), 'dd/MM')}]: ${data.motivo || 'Sem motivo informado.'}`;

      const { error } = await supabase.from('agendamentos').update({
        data_agendamento: dataStr,
        hora_agendamento: horaStr,
        diagnostico: novoDiagnostico,
        status_id: 2, // Reagendado
        crm_responsavel: data.crm
      }).eq('id', agendamento.id);

      if (error) throw error;
      
      refreshBookedTimes();
      onSuccess(); // Grita pra Agenda: "Deu certo, atualiza a lista e fecha o modal!"
      
    } catch (error: any) {
      setErrorMsg('Erro ao salvar reagendamento no banco: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onError = (errosIncorretos: any) => {
    const firstErrorField = Object.keys(errosIncorretos)[0];
    const element = document.getElementById(`reagendar-${firstErrorField}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setErrorMsg("Por favor, preencha corretamente os campos em vermelho.");
  };

  if (!isOpen || !agendamento) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={<span className="text-orange-600 dark:text-orange-400 font-bold">Reagendamento: {agendamento.nome_paciente}</span>} 
      maxWidth="2xl"
    >
       <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        <div className="bg-orange-50 dark:bg-orange-500/10 p-4 rounded-xl border border-orange-100 dark:border-orange-500/30 shadow-sm">
            <p className="text-sm text-orange-800 dark:text-orange-400 text-center font-bold tracking-wide uppercase">
                Selecione a nova data e horário
            </p>
        </div>              
        
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div id="reagendar-nova_data">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nova Data <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={20} />
                        <Controller
                            control={control}
                            name="nova_data"
                            render={({ field }) => (
                                <DatePicker 
                                    selected={field.value} 
                                    onChange={(d: Date | null) => {
                                        field.onChange(d);
                                        setValue('novo_horario', undefined as any);
                                    }} 
                                    minDate={new Date()} 
                                    locale="pt-BR" 
                                    dateFormat="dd/MM/yyyy" 
                                    placeholderText="Selecione o dia" 
                                    className={`w-full pl-10 pr-3 py-3 rounded-xl border shadow-sm outline-none focus:ring-4 focus:ring-blue-500/10 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 ${errors.nova_data ? 'border-red-500 ring-2 ring-red-500/30' : ''}`} 
                                    onFocus={(e: React.FocusEvent<HTMLInputElement>) => (e.target as HTMLInputElement).blur()} 
                                />
                            )}
                        />
                    </div>
                    {errors.nova_data && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.nova_data.message as string}</span>}
                </div>
                
                <div id="reagendar-novo_horario">
                    {!watchData ? (
                      <div><label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Novo Horário <span className="text-red-500">*</span></label><div className="h-10 flex items-center text-slate-400 text-sm italic">Selecione uma data primeiro.</div></div>
                    ) : (
                      <TimeSelector 
                        horarios={horariosDisponiveis} 
                        selectedTime={watchHorario} 
                        onSelectTime={handleSelectTime} 
                        checkIsDisabled={checkIsDisabled} 
                        isLoading={isLoadingHorarios} 
                        gridClassName="grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2" 
                        error={errors.novo_horario?.message as string}
                      />
                    )}
                </div>
            </div>

            <div id="reagendar-motivo">
                <Textarea 
                  label="Motivo do Reagendamento (Opcional)" 
                  placeholder="Ex.: Paciente pediu para remarcar." 
                  rows={2} 
                  {...register('motivo')}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setValue('motivo', e.target.value)}
                />
            </div>

            <div id="reagendar-crm">
                <Input 
                  label="Seu CRM (Obrigatório) *" 
                  icon={<Stethoscope size={18} />} 
                  placeholder="Apenas números" 
                  maxLength={5}
                  error={errors.crm?.message as string}
                  {...register('crm')}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('crm', e.target.value.replace(/\D/g, '').slice(0, 5), { shouldValidate: true })}
                />
            </div>
            
            <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />

            <div className="flex gap-2 pt-2">
                <Button variant="secondary" className="flex-1" type="button" onClick={onClose}>Voltar</Button>
                <Button variant="warning" className="flex-1" type="submit" disabled={loading}>
                    {loading ? 'Confirmando...' : 'Confirmar'}
                </Button>
            </div>
        </form>
       </div>
    </Modal>
  );
}
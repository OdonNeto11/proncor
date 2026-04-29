import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

// React Hook Form + Zod
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, Controller } from 'react-hook-form';

import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Description } from '../../../components/ui/Typography';
import { DatePicker } from '../../../components/ui/DatePicker';
import { ToastError } from '../../../components/ui/ToastError';

// === SCHEMA PADRONIZADO PARA O ARRAY DE EXAMES ===
const formSchema = z.object({
  is_concluding: z.boolean(),
  exames: z.array(z.object({
    id: z.union([z.number(), z.string()]),
    nome: z.string(),
    status_id: z.string().optional(),
    data_agendamento: z.string().optional()
  }))
}).superRefine((data, ctx) => {
  const dataHoje = new Date().toISOString().split('T')[0];

  data.exames.forEach((ex, index) => {
    // Regra da Data: obrigatória e no futuro se o status for 'Agendado' (9)
    if (Number(ex.status_id) === 9) {
      if (!ex.data_agendamento) {
        ctx.addIssue({ code: 'custom', message: 'O campo "Data" é obrigatório', path: ['exames', index, 'data_agendamento'] });
      } else if (ex.data_agendamento < dataHoje) {
        ctx.addIssue({ code: 'custom', message: 'O campo "Data" está incompleto', path: ['exames', index, 'data_agendamento'] });
      }
    }
    // Regra do Status: obrigatória para todos se for 'Salvar e Concluir'
    if (data.is_concluding && !ex.status_id) {
      ctx.addIssue({ code: 'custom', message: 'O campo "Status" é obrigatório', path: ['exames', index, 'status_id'] });
    }
  });
});

type StatusExamesFormType = z.infer<typeof formSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  encaminhamento: any;
  onSuccess: (message?: string) => void;
  onSaveProgress: () => void;
}

export function ModalStatusExames({ isOpen, onClose, encaminhamento, onSuccess, onSaveProgress }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<StatusExamesFormType>({
    resolver: zodResolver(formSchema),
    defaultValues: { is_concluding: false, exames: [] }
  });

  const { fields } = useFieldArray({ control, name: "exames" });

  useEffect(() => {
    if (isOpen && encaminhamento) {
      const fetchExames = async () => {
        const { data, error } = await supabase
          .from('encaminhamento_exames')
          .select('id, nome_customizado, data_agendamento, status_id, exames_especialidades(nome)')
          .eq('encaminhamento_id', encaminhamento.id);

        if (data && data.length > 0) {
          const payload = data.map(d => ({
            id: d.id,
            nome: (d.exames_especialidades as any)?.nome || d.nome_customizado || 'Exame/Especialidade',
            data_agendamento: d.data_agendamento || '',
            status_id: d.status_id ? String(d.status_id) : ''
          }));
          reset({ is_concluding: false, exames: payload });
        }
      };
      fetchExames();
      setErrorMsg('');
    }
  }, [isOpen, encaminhamento, reset]);

  const onSubmit = async (data: StatusExamesFormType) => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Atualiza cada exame individualmente no banco
      const updates = data.exames
        .filter(ex => typeof ex.id === 'number') 
        .map(ex => supabase.from('encaminhamento_exames').update({ 
          status_id: ex.status_id ? Number(ex.status_id) : null, 
          data_agendamento: Number(ex.status_id) === 9 ? ex.data_agendamento : null 
        }).eq('id', ex.id));
      
      const results = await Promise.all(updates);
      const hasDatabaseError = results.some(r => r.error);
      if (hasDatabaseError) throw new Error("Erro ao atualizar registros de exames.");

      // 2. Se for 'Salvar e Concluir', atualiza o status principal do ticket
      if (data.is_concluding) {
        const { error: errorFinal } = await supabase.from('encaminhamentos_ambulatorio').update({ 
            status_id: 14, 
            updated_at: new Date().toISOString() 
        }).eq('id', encaminhamento.id);
        
        if (errorFinal) throw errorFinal;
        onSuccess('Exames atualizados e ticket concluído!');
      } else {
        // 3. Se for apenas 'Salvar', avisa a fila para recarregar e fecha
        onSaveProgress();
      }
      
    } catch (e: any) { 
        setErrorMsg('Erro de comunicação: ' + e.message); 
    } finally { 
        setLoading(false); 
    }
  };

  const onError = (erros: any) => {
    const isConcludingError = erros.exames?.some((ex: any) => ex?.status_id);
    const msg = isConcludingError
      ? 'Para concluir o ticket, todos os exames precisam ter um status.' 
      : 'Por favor, preencha corretamente os campos em vermelho.';
    setErrorMsg(msg);
  };

  if (!encaminhamento || !isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={<span className="text-purple-600 dark:text-purple-500 font-bold text-lg">Status por Exame/Especialidade</span>}
    >
      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4 animate-in zoom-in-95 duration-200" noValidate>
        
        {/* BLOCO DO NOME DO PACIENTE EM EVIDÊNCIA */}
        <div className="text-center mb-2">
          <span className="text-sm text-slate-500 block mb-1">Paciente selecionado:</span>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400 break-words">
            {encaminhamento.nome_paciente || 'Nome não informado'}
          </div>
        </div>

        <Description className="text-center mb-6">
          Atualize o status individual de cada solicitação abaixo:
        </Description>

        <div className="space-y-4 min-h-[300px] max-h-[450px] overflow-y-auto pr-1 pb-10">
          {fields.map((field, index) => {
            const exameErrors = errors.exames?.[index];
            const hasError = !!exameErrors?.status_id || !!exameErrors?.data_agendamento;

            return (
              <div 
                key={field.id} 
                className={`bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border transition-all ${hasError ? 'border-red-500 shadow-sm shadow-red-500/20' : 'border-slate-200 dark:border-slate-700/50'}`}
              >
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-3">{field.nome}</span>
                
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 flex flex-col">
                    <Controller control={control} name={`exames.${index}.status_id`} render={({ field: f }) => (
                      <select 
                        value={f.value || ''}
                        onChange={(e) => { 
                            f.onChange(e); 
                            setValue(`exames.${index}.data_agendamento`, '', { shouldValidate: true }); 
                        }}
                        className={`w-full px-3 py-2.5 rounded-lg border bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm outline-none transition-colors focus:ring-2 focus:ring-purple-500 ${exameErrors?.status_id ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        <option value="">Aguardando tratativa...</option>
                        <option value="9">Agendado</option>
                        <option value="10">Plano não Atendido</option>
                        <option value="11">Sem Especialidade</option>
                        <option value="12">Sem Contato</option>
                      </select>
                    )} />
                    {exameErrors?.status_id && (
                      <span className="text-xs text-red-500 font-medium mt-1">{exameErrors.status_id.message as string}</span>
                    )}
                  </div>

                  <Controller control={control} name={`exames.${index}.status_id`} render={({ field: statusField }) => (
                    Number(statusField.value) === 9 ? (
                      <div className="flex-1 flex-shrink-0 animate-in fade-in duration-200 flex flex-col">
                        <Controller control={control} name={`exames.${index}.data_agendamento`} render={({ field: f }) => (
                          <DatePicker value={f.value || ''} onChange={f.onChange} />
                        )} />
                        {exameErrors?.data_agendamento && (
                          <span className="text-xs text-red-500 font-medium mt-1">{exameErrors.data_agendamento.message as string}</span>
                        )}
                      </div>
                    ) : <></>
                  )} />
                </div>
              </div>
            );
          })}
        </div>

        <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />

        <div className="flex flex-col md:flex-row gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" fullWidth onClick={onClose} type="button" disabled={loading}>Voltar</Button>
          <Button variant="primary" fullWidth type="submit" onClick={() => setValue('is_concluding', false)} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button variant="success" fullWidth type="submit" onClick={() => setValue('is_concluding', true)} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar e Concluir'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
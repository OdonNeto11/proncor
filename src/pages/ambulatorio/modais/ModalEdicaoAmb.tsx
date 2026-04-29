import React, { useEffect, useState } from 'react';
import { User, Phone, Hash, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// React Hook Form + Zod
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';

// IMPORT DAS REGRAS PADRONIZADAS E COMPONENTIZADAS
import { zObrigatorio, zTelefoneOpcional } from '../../../utils/validations';
import { maskPhone, capitalizeName } from '../../../utils/formUtils';

import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { ToastError } from '../../../components/ui/ToastError';
import { SelectAutocomplete } from '../../../components/ui/SelectAutocomplete';

// === SCHEMA 100% COMPONENTIZADO ===
const formSchema = z.object({
  nome_paciente: zObrigatorio('Nome do Paciente'),
  telefone_paciente: zTelefoneOpcional('Telefone / WhatsApp'),
  plano_saude: z.string().optional(),
  numero_atendimento: z.string().max(10, "Máximo de 10 caracteres").optional(),
  observacoes: z.string().optional(),
});

type EdicaoAmbFormType = z.infer<typeof formSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  encaminhamento: any;
  onSuccess: () => void;
}

export function ModalEdicaoAmb({ isOpen, onClose, encaminhamento, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, setValue, reset, control, formState: { errors } } = useForm<EdicaoAmbFormType>({
    resolver: zodResolver(formSchema)
  });

  useEffect(() => {
    if (isOpen && encaminhamento) {
      reset({
        nome_paciente: encaminhamento.nome_paciente || '',
        telefone_paciente: encaminhamento.telefone_paciente || '',
        plano_saude: encaminhamento.plano_saude || '',
        numero_atendimento: encaminhamento.numero_atendimento || '',
        observacoes: encaminhamento.observacoes || ''
      });
      setErrorMsg('');
    }
  }, [isOpen, encaminhamento, reset]);

  const onSubmit = async (data: EdicaoAmbFormType) => {
    setLoading(true);
    setErrorMsg('');
    
    try {
      const { error } = await supabase.from('encaminhamentos_ambulatorio').update({ 
        nome_paciente: data.nome_paciente,
        telefone_paciente: data.telefone_paciente,
        plano_saude: data.plano_saude,
        numero_atendimento: data.numero_atendimento,
        observacoes: data.observacoes,
        updated_at: new Date().toISOString() 
      }).eq('id', encaminhamento.id);
      
      if (error) throw error;
      
      onSuccess();
    } catch (error: any) {
      setErrorMsg('Erro ao salvar no banco: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={<span className="text-purple-600 dark:text-purple-500 font-bold text-lg">Editar Encaminhamento</span>}>
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 animate-in zoom-in-95 duration-200" noValidate>
       
       
        <div id="nome_paciente">
          <Input 
            label="Nome do Paciente *" 
            icon={<User size={18} />} 
            error={errors.nome_paciente?.message as string} 
            {...register('nome_paciente')} 
            onChange={e => setValue('nome_paciente', capitalizeName(e.target.value), { shouldValidate: true })} 
          />
        </div>
        
        <Input 
          label="Telefone / WhatsApp" 
          icon={<Phone size={18} />} 
          maxLength={15}
          error={errors.telefone_paciente?.message as string} 
          {...register('telefone_paciente')} 
          onChange={e => setValue('telefone_paciente', maskPhone(e.target.value), { shouldValidate: true })} 
        />
        
        <Controller 
          control={control} 
          name="plano_saude" 
          render={({ field }) => (
            <SelectAutocomplete 
              label="Plano de Saúde (Opcional)" 
              placeholder="Ex: Unimed, Cassems..." 
              tableName="planos_saude" 
              columnName="nome" 
              value={field.value || ''} 
              onChange={field.onChange} 
            />
          )} 
        />
        
        <Input 
          label="Nº Atendimento" 
          icon={<Hash size={18} />} 
          maxLength={10}
          error={errors.numero_atendimento?.message as string}
          {...register('numero_atendimento')} 
          onChange={e => setValue('numero_atendimento', e.target.value.replace(/\D/g, ''), { shouldValidate: true })}
        />
        
        <Textarea 
          label="Observações" 
          rows={3} 
          icon={<FileText size={18} />} 
          error={errors.observacoes?.message as string}
          {...register('observacoes')} 
          onChange={e => setValue('observacoes', e.target.value)}
        />
        
        <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />

        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" fullWidth onClick={onClose} type="button" disabled={loading}>Cancelar</Button>
          <Button variant="primary" fullWidth type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
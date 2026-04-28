import React, { useEffect } from 'react';
import { User, Phone, Hash, FileText } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { supabase } from '../../../lib/supabase';

import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { ToastError } from '../../../components/ui/ToastError';
import { zObrigatorio } from '../../../utils/validations';
import { maskPhone, capitalizeName } from '../../../utils/formUtils';

const formSchema = z.object({
  nome_paciente: zObrigatorio('Nome do Paciente'),
  telefone_paciente: z.string().optional(),
  plano_saude: z.string().optional(),
  numero_atendimento: z.string().optional(),
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
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<EdicaoAmbFormType>({
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
    }
  }, [isOpen, encaminhamento, reset]);

  const onSubmit = async (data: EdicaoAmbFormType) => {
    const { error } = await supabase.from('encaminhamentos_ambulatorio').update({ ...data, updated_at: new Date().toISOString() }).eq('id', encaminhamento.id);
    if (error) return;
    onSuccess();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Encaminhamento">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div id="nome_paciente">
          <Input label="Nome do Paciente *" icon={<User size={18} />} error={errors.nome_paciente?.message as string} {...register('nome_paciente')} onChange={e => setValue('nome_paciente', capitalizeName(e.target.value), { shouldValidate: true })} />
        </div>
        <Input label="Telefone" icon={<Phone size={18} />} {...register('telefone_paciente')} onChange={e => setValue('telefone_paciente', maskPhone(e.target.value))} />
        <Input label="Plano de Saúde" {...register('plano_saude')} />
        <Input label="Nº Atendimento" icon={<Hash size={18} />} {...register('numero_atendimento')} />
        <Textarea label="Observações" rows={3} icon={<FileText size={18} />} {...register('observacoes')} />
        <div className="flex gap-3 pt-4"><Button variant="secondary" fullWidth onClick={onClose} type="button">Cancelar</Button><Button variant="primary" fullWidth type="submit">Salvar</Button></div>
      </form>
    </Modal>
  );
}
import React, { useState, useEffect } from 'react';
import { User, Phone, FileText, Hash, Stethoscope } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// React Hook Form + Zod
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// === IMPORT DAS REGRAS PADRONIZADAS ===
import { zObrigatorio, zCrm, zTelefone } from '../../../utils/validations';

// Componentes (Ajuste os caminhos ../../../ se necessário)
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { ToastError } from '../../../components/ui/ToastError';
import { ProcedimentosSelector } from '../../../components/ui/ProcedimentosSelector';

// Utils
import { maskPhone, capitalizeName } from '../../../utils/formUtils';

const OPCOES_PROCEDIMENTOS = ["Exames", "RX", "Tomografia"];

// === 1. SCHEMA DO ZOD CORRIGIDO PARA O PADRÃO ===
const formSchema = z.object({
  numero_atendimento: zObrigatorio('Número do Atendimento').max(10, "Máximo de 10 caracteres"),
  nome_paciente: zObrigatorio('Nome do Paciente'),
  telefone_paciente: zTelefone('Telefone / WhatsApp'),
  diagnostico: z.string().optional(),
  procedimentos: z.array(z.string()).optional(),
  crm_responsavel: zCrm('CRM'), 
});

type EdicaoFormType = z.infer<typeof formSchema>;

// Props do Modal
interface ModalEdicaoProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: any;
  onSuccess: () => void;
}

export function ModalEdicao({ isOpen, onClose, agendamento, onSuccess }: ModalEdicaoProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<EdicaoFormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero_atendimento: '',
      nome_paciente: '',
      telefone_paciente: '',
      diagnostico: '',
      procedimentos: [],
      crm_responsavel: ''
    }
  });

  // Preenche o formulário assim que o modal abre com os dados do paciente
  useEffect(() => {
    if (isOpen && agendamento) {
      reset({
        numero_atendimento: agendamento.numero_atendimento || '',
        nome_paciente: agendamento.nome_paciente || '',
        telefone_paciente: agendamento.telefone_paciente || '',
        diagnostico: agendamento.diagnostico || '',
        procedimentos: agendamento.procedimentos || [],
        crm_responsavel: '' // Sempre em branco para obrigar a assinatura
      });
      setErrorMsg('');
    }
  }, [isOpen, agendamento, reset]);

  const toggleProcedimento = (opcao: string) => {
    const atuais = watch('procedimentos') || [];
    const jaExiste = atuais.includes(opcao);
    setValue('procedimentos', jaExiste ? atuais.filter((p: string) => p !== opcao) : [...atuais, opcao]);
  };

  const onSubmit = async (data: EdicaoFormType) => {
    if (!agendamento) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.from('agendamentos').update({
        numero_atendimento: data.numero_atendimento,
        nome_paciente: data.nome_paciente,
        telefone_paciente: data.telefone_paciente,
        diagnostico: data.diagnostico,
        procedimentos: data.procedimentos,
        crm_responsavel: data.crm_responsavel
      }).eq('id', agendamento.id);

      if (error) throw error;
      
      onSuccess(); // Grita pra Agenda que salvou
    } catch (e: any) {
      setErrorMsg('Erro ao salvar os dados no banco: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const onError = (errosIncorretos: any) => {
    const firstErrorField = Object.keys(errosIncorretos)[0];
    const element = document.getElementById(`editar-${firstErrorField}`);
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
      title={<span className="text-blue-600 dark:text-blue-400 font-bold">Editando dados</span>}
    >
      <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4" noValidate>
          
          <div id="editar-numero_atendimento">
            <Input 
              label="Nº Atendimento *" 
              icon={<Hash size={18} />} 
              maxLength={10}
              error={errors.numero_atendimento?.message as string}
              {...register('numero_atendimento')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('numero_atendimento', e.target.value.replace(/\D/g, ''), { shouldValidate: true })}
            />
          </div>

          <div id="editar-nome_paciente">
            <Input 
              label="Nome do Paciente *" 
              icon={<User size={18} />} 
              error={errors.nome_paciente?.message as string}
              {...register('nome_paciente')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('nome_paciente', capitalizeName(e.target.value), { shouldValidate: true })}
            />
          </div>

          <div id="editar-telefone_paciente">
            <Input 
              label="Telefone / WhatsApp *" 
              icon={<Phone size={18} />} 
              maxLength={15}
              error={errors.telefone_paciente?.message as string}
              {...register('telefone_paciente')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('telefone_paciente', maskPhone(e.target.value), { shouldValidate: true })}
            />
          </div>

          <div id="editar-diagnostico">
            <Textarea 
              label="Diagnóstico / Condutas" 
              rows={3} 
              {...register('diagnostico')}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setValue('diagnostico', e.target.value)}
            />
          </div>

          <ProcedimentosSelector 
            opcoes={OPCOES_PROCEDIMENTOS} 
            selecionados={watch('procedimentos') || []} 
            onToggle={toggleProcedimento} 
          />

          <div id="editar-crm_responsavel">
            <Input 
              label="Seu CRM (Obrigatório para salvar) *" 
              icon={<Stethoscope size={18} />} 
              placeholder="Apenas números" 
              maxLength={5}
              error={errors.crm_responsavel?.message as string}
              {...register('crm_responsavel')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('crm_responsavel', e.target.value.replace(/\D/g, '').slice(0, 5), { shouldValidate: true })}
            />
          </div>

          <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" fullWidth type="button" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" fullWidth type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Dados'}
            </Button>
          </div>

        </form>
      </div>
    </Modal>
  );
}
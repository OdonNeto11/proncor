import React, { useState, useEffect } from 'react';
import { Calendar, User, Phone, FileText, Hash, Activity, AlertCircle } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import { format, setHours, setMinutes } from 'date-fns';
import imageCompression from 'browser-image-compression';
import { Link } from 'react-router-dom';

// IMPORT DAS REGRAS PADRONIZADAS
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { zObrigatorio, zCrm, zTelefone, zDataObrigatoria } from '../../utils/validations';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { ToastError } from '../../components/ui/ToastError';
import { SelectAutocomplete } from '../../components/ui/SelectAutocomplete';
import { Title, Description, themeClasses } from '../../components/ui/Typography'; 
import { TimeSelector } from '../../components/ui/TimeSelector';
import { ProcedimentosSelector } from '../../components/ui/ProcedimentosSelector';
import { FileUpload } from '../../components/ui/FileUpload';

import { maskPhone, capitalizeName } from '../../utils/formUtils';
import { supabase } from '../../lib/supabase';
import { usePermissoes } from '../../hooks/usePermissoes'; 
import { useHorarios } from '../../hooks/useHorarios';

registerLocale('pt-BR', ptBR);
const OPCOES_PROCEDIMENTOS = ["Exames", "RX", "Tomografia"];

// === SCHEMA DE VALIDAÇÃO COMPONENTIZADO ===
const formSchema = z.object({
  data_agendamento: zDataObrigatoria('Data'),
  hora_agendamento: zDataObrigatoria('Horário'),
  crm_responsavel: zCrm('CRM'),
  numero_atendimento: zObrigatorio('Número do Atendimento').max(10, "Máximo de 10 caracteres"),
  nome_paciente: zObrigatorio('Nome do Paciente'),
  telefone_paciente: zTelefone('Telefone / WhatsApp'),
  plano_saude: z.string().optional(),
  diagnostico: z.string().optional(),
  procedimentos: z.array(z.string()).optional(), 
});

type AgendamentoFormType = z.infer<typeof formSchema>;

const carregarRascunho = () => {
  try {
    const rascunho = localStorage.getItem('agendamento_pa_draft');
    return rascunho ? JSON.parse(rascunho) : null;
  } catch (e) {
    return null;
  }
};

export function Agendar() {
  const { podeCriarPA } = usePermissoes(); 
  const rascunho = carregarRascunho();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors }
  } = useForm<AgendamentoFormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero_atendimento: rascunho?.formData?.numero_atendimento || '',
      nome_paciente: rascunho?.formData?.nome_paciente || '',
      telefone_paciente: rascunho?.formData?.telefone_paciente || '',
      plano_saude: rascunho?.formData?.plano_saude || '',
      diagnostico: rascunho?.formData?.diagnostico || '',
      procedimentos: rascunho?.formData?.procedimentos || [],
      crm_responsavel: rascunho?.formData?.crm_responsavel || '',
      data_agendamento: rascunho?.selectedDate ? new Date(rascunho.selectedDate) : new Date(),
      hora_agendamento: rascunho?.selectedTime ? new Date(rascunho.selectedTime) : undefined,
    }
  });

  const formValues = watch();
  const selectedDate = watch('data_agendamento');
  const selectedTime = watch('hora_agendamento');

  const [arquivos, setArquivos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState(''); 

  useEffect(() => {
    localStorage.setItem('agendamento_pa_draft', JSON.stringify({
      formData: {
        numero_atendimento: formValues.numero_atendimento,
        nome_paciente: formValues.nome_paciente,
        telefone_paciente: formValues.telefone_paciente,
        plano_saude: formValues.plano_saude,
        diagnostico: formValues.diagnostico,
        procedimentos: formValues.procedimentos,
        crm_responsavel: formValues.crm_responsavel
      },
      selectedDate: formValues.data_agendamento?.toISOString(),
      selectedTime: formValues.hora_agendamento?.toISOString()
    }));
  }, [formValues]);

  const { 
    horariosDisponiveis, 
    checkIsDisabled, 
    isLoadingHorarios, 
    marcarHorarioComoOcupado 
  } = useHorarios(selectedDate);

  const handleSelectTime = (timeStr: string) => {
    if (!selectedDate) return;
    const [h, m] = timeStr.split(':').map(Number);
    setValue('hora_agendamento', setHours(setMinutes(new Date(selectedDate), m), h), { shouldValidate: true });
  };

  const toggleProcedimento = (opcao: string) => {
    const atuais = watch('procedimentos') || [];
    const jaExiste = atuais.includes(opcao);
    setValue('procedimentos', jaExiste ? atuais.filter((p: string) => p !== opcao) : [...atuais, opcao]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const novosArquivos = Array.from(e.target.files);
      if (arquivos.length + novosArquivos.length > 5) { alert("Máximo de 5 arquivos."); return; }
      setArquivos(prev => [...prev, ...novosArquivos]);
    }
  };

  const removerArquivo = (index: number) => {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadArquivoUnico = async (file: File) => {
    let fileToUpload = file;

    if (file.type.startsWith('image/')) {
      const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1920, useWebWorker: true };
      try {
        fileToUpload = await imageCompression(file, options);
      } catch (error) {
        console.error("Erro ao comprimir imagem, enviando original: ", error);
      }
    }

    const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error } = await supabase.storage.from('anexos').upload(fileName, fileToUpload);
    if (error) throw error;
    
    const { data } = supabase.storage.from('anexos').getPublicUrl(fileName);
    return { nome: file.name, url: data.publicUrl };
  };

  const onSubmit = async (data: AgendamentoFormType) => {
    setLoading(true);
    setErrorMsg('');
    
    try {
      const listaAnexos = [];
      if (arquivos.length > 0) {
        const uploads = await Promise.all(arquivos.map(file => uploadArquivoUnico(file)));
        listaAnexos.push(...uploads);
      }
      
      const dataFormatada = format(data.data_agendamento, 'yyyy-MM-dd');
      const horaFormatada = format(data.hora_agendamento, 'HH:mm');

      const { error } = await supabase.from('agendamentos').insert([{
        data_agendamento: dataFormatada,
        hora_agendamento: horaFormatada,
        numero_atendimento: data.numero_atendimento, 
        nome_paciente: data.nome_paciente,
        telefone_paciente: data.telefone_paciente,
        plano_saude: data.plano_saude, 
        diagnostico: data.diagnostico,
        procedimentos: data.procedimentos || [],
        status_id: 1, 
        anexos: listaAnexos,
        crm_responsavel: data.crm_responsavel
      }]);
      
      if (error) throw error;
      
      setShowToast(true);
      
      reset({
        numero_atendimento: '', nome_paciente: '', telefone_paciente: '', plano_saude: '', 
        diagnostico: '', procedimentos: [], crm_responsavel: '',
        data_agendamento: new Date(), hora_agendamento: undefined
      });
      setArquivos([]);
      localStorage.removeItem('agendamento_pa_draft');
      
      marcarHorarioComoOcupado(horaFormatada);
      
    } catch (error: any) { 
        setErrorMsg('Erro ao salvar no banco: ' + error.message);
    } finally { 
        setLoading(false); 
    }
  };

  const onError = (errosIncorretos: any) => {
    const firstErrorField = Object.keys(errosIncorretos)[0];
    const element = document.getElementById(firstErrorField);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setErrorMsg("Por favor, preencha corretamente os campos em vermelho.");
  };

  if (!podeCriarPA) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 bg-white dark:bg-slate-900 rounded-xl border shadow-sm mt-8 animate-in zoom-in-95 duration-300">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-6" />
        <Title className="mb-2">Acesso Negado</Title>
        <Link to="/" className="inline-block mt-8 px-6 py-2 bg-slate-100 rounded-lg font-bold">Voltar para Início</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 relative">
      
      <div className="flex items-center gap-6 mb-8 border-b border-gray-200 dark:border-slate-800 px-2">
        <Link to="/novo" className="pb-3 text-sm font-bold border-b-2 border-blue-600 text-blue-600">Novo Agendamento</Link>
        <Link to="/agenda" className={`pb-3 text-sm font-bold border-b-2 border-transparent opacity-60 hover:opacity-100 ${themeClasses.text}`}>Ver Agenda</Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest mb-2">
           <Activity size={16} /> Módulo: Pronto Atendimento
        </div>
        <Title className="mb-2">Novo Agendamento (Retorno)</Title>
        <Description>Preencha os dados a seguir para agendar um retorno ao PA.</Description>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6 p-6" noValidate>
          <div className="flex flex-col gap-6">
            <div className="w-full" id="data_agendamento">
                <label className={`text-sm font-semibold mb-2 block ${themeClasses.text}`}>Selecione a Data <span className="text-red-500">*</span></label>
                <div className="relative max-w-sm">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10"><Calendar size={20} /></div>
                    
                    <Controller
                      control={control}
                      name="data_agendamento"
                      render={({ field }) => (
                        <DatePicker
                            selected={field.value}
                            onChange={(date: Date | null) => {
                               field.onChange(date);
                               setValue('hora_agendamento', undefined as any); 
                            }}
                            minDate={new Date()}
                            locale="pt-BR"
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Selecione o dia"
                            className={`w-full pl-10 pr-4 py-3 rounded-xl border shadow-sm bg-white dark:bg-slate-800 ${themeClasses.text} ${themeClasses.placeholder} ${errors.data_agendamento ? 'border-red-500 ring-2 ring-red-500/30' : 'border-slate-300 dark:border-slate-600'} outline-none focus:ring-2 focus:ring-blue-500`}
                            onFocus={(e) => e.target.blur()}
                        />
                      )}
                    />
                </div>
                {errors.data_agendamento && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.data_agendamento.message as string}</span>}
            </div>

            <div id="hora_agendamento">
              <TimeSelector 
                horarios={horariosDisponiveis}
                selectedTime={selectedTime}
                onSelectTime={handleSelectTime}
                checkIsDisabled={checkIsDisabled}
                isLoading={isLoadingHorarios}
                error={errors.hora_agendamento?.message as string}
              />
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>

          <div className="space-y-6">
            <div id="crm_responsavel">
              <Input 
                label="Seu CRM *" 
                icon={<User size={20} />} 
                error={errors.crm_responsavel?.message as string} 
                placeholder="Apenas números (Ex: 12345)" 
                maxLength={5} 
                {...register('crm_responsavel')} 
                onChange={(e) => setValue('crm_responsavel', e.target.value.replace(/\D/g, '').slice(0, 5), { shouldValidate: true })} 
              />
            </div>

            <div id="numero_atendimento">
              <Input 
                label="Número do Atendimento *" 
                icon={<Hash size={20} />} 
                error={errors.numero_atendimento?.message as string} 
                placeholder="Somente números" 
                maxLength={10} 
                {...register('numero_atendimento')} 
                onChange={(e) => setValue('numero_atendimento', e.target.value.replace(/\D/g, '').slice(0, 10), { shouldValidate: true })} 
              />
            </div>

            <div id="nome_paciente">
              <Input 
                label="Nome do Paciente *" 
                icon={<User size={20} />} 
                error={errors.nome_paciente?.message as string} 
                {...register('nome_paciente')} 
                onChange={(e) => setValue('nome_paciente', capitalizeName(e.target.value), { shouldValidate: true })} 
              />
            </div>

            <div id="telefone_paciente">
              <Input 
                label="Telefone / WhatsApp *" 
                placeholder="(xx) xxxxx-xxxx" 
                maxLength={15} 
                icon={<Phone size={20} />} 
                error={errors.telefone_paciente?.message as string} 
                {...register('telefone_paciente')} 
                onChange={(e) => setValue('telefone_paciente', maskPhone(e.target.value), { shouldValidate: true })} 
              />
            </div>

            <Controller control={control} name="plano_saude" render={({ field }) => (
              <SelectAutocomplete 
                label="Plano de Saúde (Opcional)" 
                placeholder="Ex: Unimed, Cassems..." 
                tableName="planos_saude" 
                columnName="nome" 
                value={field.value || ''} 
                onChange={field.onChange} 
              />
            )} />

            <Textarea 
              label="Diagnóstico / Condutas" 
              rows={3} 
              icon={<FileText size={20} />} 
              {...register('diagnostico')} 
              onChange={(e) => setValue('diagnostico', e.target.value)} 
            />
            
            <ProcedimentosSelector 
              opcoes={OPCOES_PROCEDIMENTOS} 
              selecionados={watch('procedimentos') || []} 
              onToggle={toggleProcedimento} 
            />
            
            <FileUpload arquivos={arquivos} onFileChange={handleFileChange} onRemoveArquivo={removerArquivo} />
          </div>

          <Button type="submit" disabled={loading} fullWidth>{loading ? 'Salvando...' : 'Confirmar Agendamento'}</Button>
        </form>
      </Card>

      {showToast && <Toast message="Agendamento realizado com sucesso!" onClose={() => setShowToast(false)} />}
      <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />
    </div>
  );
}
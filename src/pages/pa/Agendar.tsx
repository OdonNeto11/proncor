import React, { useState, FormEvent, useEffect } from 'react';
import { Calendar, User, Phone, FileText, Hash, Activity, AlertCircle } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import { format, setHours, setMinutes } from 'date-fns';
import imageCompression from 'browser-image-compression';

import { Link } from 'react-router-dom';


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

import { maskPhone, validateFields, capitalizeName } from '../../utils/formUtils';
import { supabase } from '../../lib/supabase';
import { usePermissoes } from '../../hooks/usePermissoes'; 
import { useHorarios } from '../../hooks/useHorarios';

registerLocale('pt-BR', ptBR);
const OPCOES_PROCEDIMENTOS = ["Exames", "RX", "Tomografia"];

// Função auxiliar para carregar o rascunho de forma síncrona
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
  
  // === RASCUNHO AUTOMÁTICO SÍNCRONO ===
  const rascunho = carregarRascunho();

  const [selectedDate, setSelectedDate] = useState<Date | null>(rascunho?.selectedDate ? new Date(rascunho.selectedDate) : new Date());
  const [selectedTime, setSelectedTime] = useState<Date | null>(rascunho?.selectedTime ? new Date(rascunho.selectedTime) : null);
  
  const [formData, setFormData] = useState(rascunho?.formData || {
    numero_atendimento: '', 
    nome_paciente: '',
    telefone_paciente: '',
    plano_saude: '', 
    diagnostico: '',
    procedimentos: [] as string[],
    crm_responsavel: '' 
  });
  // ====================================

  const [arquivos, setArquivos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState(''); 

  // Salva no localStorage sempre que algo for digitado
  useEffect(() => {
    localStorage.setItem('agendamento_pa_draft', JSON.stringify({
      formData,
      selectedDate: selectedDate?.toISOString(),
      selectedTime: selectedTime?.toISOString()
    }));
  }, [formData, selectedDate, selectedTime]);

  const { 
    horariosDisponiveis, 
    checkIsDisabled, 
    isLoadingHorarios, 
    marcarHorarioComoOcupado 
  } = useHorarios(selectedDate);

  const handleSelectTime = (timeStr: string) => {
    if (!selectedDate) return;
    const [h, m] = timeStr.split(':').map(Number);
    setSelectedTime(setHours(setMinutes(new Date(selectedDate), m), h));
    if(errors.hora_agendamento) setErrors({...errors, hora_agendamento: ''});
  };

  const toggleProcedimento = (opcao: string) => {
    setFormData((prev: typeof formData) => {
      const jaExiste = prev.procedimentos.includes(opcao);
      return { 
        ...prev, 
        procedimentos: jaExiste 
          ? prev.procedimentos.filter((p: string) => p !== opcao) 
          : [...prev.procedimentos, opcao] 
      };
    });
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

    // COMPRESSOR ADICIONADO AQUI
    if (file.type.startsWith('image/')) {
      const options = {
        maxSizeMB: 0.3, // Limita a ~300KB
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setErrors({});
    
    const camposObrigatorios = ['numero_atendimento', 'nome_paciente', 'telefone_paciente', 'crm_responsavel'];
    const { errors: valErrors } = validateFields(formData, camposObrigatorios);
    
    const novosErros: Record<string, string> = { ...valErrors };
    if (!selectedDate) novosErros.data_agendamento = 'Data obrigatória';
    if (!selectedTime) novosErros.hora_agendamento = 'Selecione um horário';
    if (formData.telefone_paciente && formData.telefone_paciente.length < 14) novosErros.telefone_paciente = 'Telefone inválido';
    
    if (!formData.crm_responsavel || !/^[0-9]{4,5}$/.test(formData.crm_responsavel)) {
        novosErros.crm_responsavel = 'O CRM deve ter 4 ou 5 dígitos';
    }

    if (Object.keys(novosErros).length > 0) {
      setErrors(novosErros);
      setErrorMsg("Por favor, preencha corretamente os campos em vermelho.");
      setLoading(false); 
      return; // O componente ToastError se encarrega do scroll a partir daqui
    }

    try {
      const listaAnexos = [];
      if (arquivos.length > 0) {
        const uploads = await Promise.all(arquivos.map(file => uploadArquivoUnico(file)));
        listaAnexos.push(...uploads);
      }
      
      const dataFormatada = format(selectedDate!, 'yyyy-MM-dd');
      const horaFormatada = format(selectedTime!, 'HH:mm');

      const { error } = await supabase.from('agendamentos').insert([{
        data_agendamento: dataFormatada,
        hora_agendamento: horaFormatada,
        numero_atendimento: formData.numero_atendimento, 
        nome_paciente: formData.nome_paciente,
        telefone_paciente: formData.telefone_paciente,
        plano_saude: formData.plano_saude, 
        diagnostico: formData.diagnostico,
        procedimentos: formData.procedimentos,
        status_id: 1, 
        anexos: listaAnexos,
        crm_responsavel: formData.crm_responsavel
      }]);
      
      if (error) throw error;
      
      setShowToast(true);
      setFormData({ numero_atendimento: '', nome_paciente: '', telefone_paciente: '', plano_saude: '', diagnostico: '', procedimentos: [], crm_responsavel: '' });
      setSelectedTime(null);
      setArquivos([]);
      
      // Limpa o rascunho permanentemente após sucesso
      localStorage.removeItem('agendamento_pa_draft');
      
      marcarHorarioComoOcupado(horaFormatada);
      
    } catch (error: any) { 
        setErrorMsg('Erro ao salvar no banco: ' + error.message);
    } finally { 
        setLoading(false); 
    }
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
        <form onSubmit={handleSubmit} className="space-y-6 p-6" noValidate>
          <div className="flex flex-col gap-6">
            <div className="w-full" id="data_agendamento">
                <label className={`text-sm font-semibold mb-2 block ${themeClasses.text}`}>Selecione a Data <span className="text-red-500">*</span></label>
                <div className="relative max-w-sm">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10"><Calendar size={20} /></div>
                    <DatePicker
                        selected={selectedDate}
                        onChange={(date: Date | null) => {
                           setSelectedDate(date);
                           setSelectedTime(null); 
                           if(errors.data_agendamento) setErrors({...errors, data_agendamento: ''});
                        }}
                        minDate={new Date()}
                        locale="pt-BR"
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Selecione o dia"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border shadow-sm bg-white dark:bg-slate-800 ${themeClasses.text} ${themeClasses.placeholder} ${errors.data_agendamento ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} outline-none focus:ring-2 focus:ring-blue-500`}
                        onFocus={(e) => e.target.blur()}
                    />
                </div>
                {errors.data_agendamento && <span className="text-xs text-red-500 mt-1 block">{errors.data_agendamento}</span>}
            </div>

            <div id="hora_agendamento">
              <TimeSelector 
                horarios={horariosDisponiveis}
                selectedTime={selectedTime}
                onSelectTime={handleSelectTime}
                checkIsDisabled={checkIsDisabled}
                isLoading={isLoadingHorarios}
                error={errors.hora_agendamento}
              />
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>

          <div className="space-y-6">
            <Input label="Seu CRM *" name="crm_responsavel" value={formData.crm_responsavel} onChange={(e) => setFormData({ ...formData, crm_responsavel: e.target.value.replace(/\D/g, '').slice(0, 5) })} icon={<User size={20} />} error={errors.crm_responsavel} placeholder="Apenas números (Ex: 12345)" maxLength={5} required />
            <Input label="Número do Atendimento *" name="numero_atendimento" value={formData.numero_atendimento} onChange={(e) => setFormData({ ...formData, numero_atendimento: e.target.value.replace(/\D/g, '').slice(0, 10) })} icon={<Hash size={20} />} error={errors.numero_atendimento} placeholder="Somente números" maxLength={10} required />
            <Input label="Nome do Paciente *" name="nome_paciente" value={formData.nome_paciente} onChange={(e) => setFormData({ ...formData, nome_paciente: capitalizeName(e.target.value) })} icon={<User size={20} />} error={errors.nome_paciente} required />
            <Input label="Telefone / WhatsApp *" name="telefone_paciente" value={formData.telefone_paciente} onChange={(e) => setFormData({ ...formData, telefone_paciente: maskPhone(e.target.value) })} placeholder="(xx) xxxxx-xxxx" maxLength={15} icon={<Phone size={20} />} error={errors.telefone_paciente} required />
            <SelectAutocomplete label="Plano de Saúde (Opcional)" placeholder="Ex: Unimed, Cassems..." tableName="planos_saude" columnName="nome" value={formData.plano_saude} onChange={(val) => setFormData({ ...formData, plano_saude: val })} />
            <Textarea label="Diagnóstico / Condutas" name="diagnostico" value={formData.diagnostico} onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })} rows={3} icon={<FileText size={20} />} />
            
            <ProcedimentosSelector opcoes={OPCOES_PROCEDIMENTOS} selecionados={formData.procedimentos} onToggle={toggleProcedimento} />
            <FileUpload arquivos={arquivos} onFileChange={handleFileChange} onRemoveArquivo={removerArquivo} />
          </div>

          <Button type="submit" disabled={loading} fullWidth>{loading ? 'Salvando...' : 'Confirmar Agendamento'}</Button>
        </form>
      </Card>

      {showToast && <Toast message="Agendamento realizado com sucesso!" onClose={() => setShowToast(false)} />}
      
      {/* NOVO COMPONENTE DE ERRO COM SCROLL AUTOMÁTICO */}
      <ToastError 
        message={errorMsg} 
        errors={errors} 
        onClose={() => setErrorMsg('')} 
      />
    </div>
  );
}
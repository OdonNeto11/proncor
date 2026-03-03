import React, { useState, FormEvent, useEffect } from 'react';
import { Calendar, Clock, User, Phone, FileText, Upload, Paperclip, Trash2, Hash, Activity, AlertCircle } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import { format, isSameDay, setHours, setMinutes } from 'date-fns';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Card } from '../components/ui/Card';
import { Toast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';

registerLocale('pt-BR', ptBR);

const HORARIOS_FIXOS = [
  "07:30", "08:00", "08:30", "09:00",
  "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "19:30", "19:45", "20:00", "20:15", 
  "20:30", "20:45", "21:00", "21:15", "21:30"
];

const OPCOES_PROCEDIMENTOS = ["Exames", "RX", "Tomografia"];

export function Agendar() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    numero_atendimento: '', 
    nome_paciente: '',
    telefone_paciente: '',
    diagnostico: '',
    procedimentos: [] as string[],
    crm_responsavel: '' 
  });

  const [arquivos, setArquivos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState(''); 

  useEffect(() => {
    const fetchBookedTimes = async () => {
      if (!selectedDate) return;
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('agendamentos')
        .select('hora_agendamento')
        .eq('data_agendamento', dateStr)
        .in('status', ['agendado', 'reagendado']);

      if (error) { console.error(error); return; }

      if (data) {
        const times = data.map(item => item.hora_agendamento.substring(0, 5));
        setBookedTimes(times);
      }
    };
    setBookedTimes([]); 
    setSelectedTime(null);
    fetchBookedTimes();
  }, [selectedDate]);

  const checkIsDisabled = (timeStr: string) => {
    if (!selectedDate) return true;
    if (bookedTimes.includes(timeStr)) return true;
    if (isSameDay(selectedDate, new Date())) {
      const [hora, minuto] = timeStr.split(':').map(Number);
      const dataHoraOpcao = new Date(selectedDate);
      dataHoraOpcao.setHours(hora, minuto, 0, 0);
      const agora = new Date();
      if (dataHoraOpcao.getTime() < agora.getTime() - 60000) return true;
    }
    return false;
  };

  const handleSelectTime = (timeStr: string) => {
    if (!selectedDate) return;
    const [h, m] = timeStr.split(':').map(Number);
    const newTime = setHours(setMinutes(new Date(selectedDate), m), h);
    setSelectedTime(newTime);
    if(errors.hora_agendamento) setErrors({...errors, hora_agendamento: ''});
  };
  
  const handleNumeroAtendimentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); 
    setFormData(prev => ({ ...prev, numero_atendimento: value }));
    if (errors.numero_atendimento) setErrors(prev => ({ ...prev, numero_atendimento: '' }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "").substring(0, 11);
    if (value.length > 10) value = value.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    else if (value.length > 6) value = value.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    else if (value.length > 0) value = value.replace(/^(\d*)/, "($1");
    setFormData(prev => ({ ...prev, telefone_paciente: value }));
    if (errors.telefone_paciente) setErrors(prev => ({ ...prev, telefone_paciente: '' }));
  };

  const handleCrmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setFormData(prev => ({ ...prev, crm_responsavel: value }));
    if (errors.crm_responsavel) setErrors(prev => ({ ...prev, crm_responsavel: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const toggleProcedimento = (opcao: string) => {
    setFormData(prev => {
        const jaExiste = prev.procedimentos.includes(opcao);
        let novosProcedimentos;
        if (jaExiste) {
            novosProcedimentos = prev.procedimentos.filter(p => p !== opcao);
        } else {
            novosProcedimentos = [...prev.procedimentos, opcao];
        }
        return { ...prev, procedimentos: novosProcedimentos };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const novosArquivos = Array.from(e.target.files);
      const total = arquivos.length + novosArquivos.length;
      if (total > 5) { alert("Máximo de 5 arquivos permitidos."); return; }
      setArquivos(prev => [...prev, ...novosArquivos]);
    }
  };

  const removerArquivo = (index: number) => {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadArquivoUnico = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from('anexos').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('anexos').getPublicUrl(fileName);
    return { nome: file.name, url: data.publicUrl };
  };

  const isValidCrm = (crm: string) => /^[0-9]{4,5}$/.test(crm);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    const novosErros: Record<string, string> = {};
    if (!selectedDate) novosErros.data_agendamento = 'Data obrigatória';
    if (!selectedTime) novosErros.hora_agendamento = 'Selecione um horário';
    if (!formData.numero_atendimento) novosErros.numero_atendimento = 'Nº Atendimento obrigatório'; 
    if (!formData.nome_paciente) novosErros.nome_paciente = 'Nome obrigatório';
    if (!formData.telefone_paciente || formData.telefone_paciente.length < 14) novosErros.telefone_paciente = 'Telefone inválido';
    if (!isValidCrm(formData.crm_responsavel)) novosErros.crm_responsavel = 'CRM inválido';
    
    if (selectedTime) {
      const timeStr = format(selectedTime, 'HH:mm');
      if (bookedTimes.includes(timeStr)) {
        novosErros.hora_agendamento = 'Este horário acabou de ser ocupado.';
      }
    }

    if (Object.keys(novosErros).length > 0) {
      setErrors(novosErros);
      setErrorMsg("Por favor, preencha corretamente os campos destacados em vermelho.");
      setLoading(false); 
      return;
    }

    try {
      const listaAnexos = [];
      if (arquivos.length > 0) {
        const uploads = await Promise.all(arquivos.map(file => uploadArquivoUnico(file)));
        listaAnexos.push(...uploads);
      }
      const dataFormatada = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
      const horaFormatada = selectedTime ? format(selectedTime, 'HH:mm') : '';

      const { error } = await supabase.from('agendamentos').insert([{
        data_agendamento: dataFormatada,
        hora_agendamento: horaFormatada,
        numero_atendimento: formData.numero_atendimento, 
        nome_paciente: formData.nome_paciente,
        telefone_paciente: formData.telefone_paciente,
        diagnostico: formData.diagnostico,
        procedimentos: formData.procedimentos,
        status: 'agendado',
        anexos: listaAnexos,
        crm_responsavel: formData.crm_responsavel
      }]);
      
      if (error) throw error;
      
      setShowToast(true);
      setFormData({ 
        numero_atendimento: '', 
        nome_paciente: '', 
        telefone_paciente: '', 
        diagnostico: '', 
        procedimentos: [],
        crm_responsavel: ''
      });
      setSelectedTime(null);
      setArquivos([]);
      setBookedTimes([...bookedTimes, horaFormatada]);
    } catch (error: any) { 
        setErrorMsg('Erro de conexão ao salvar no banco: ' + error.message);
    } finally { 
        setLoading(false); 
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Novo Agendamento</h1>
        <p className="text-gray-600">Preencha os dados a seguir:</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6 p-6" noValidate>
          
          <div className="flex flex-col gap-6">
            
            <div className="w-full">
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Selecione a Data <span className="text-red-500">*</span></label>
                <div className="relative max-w-sm">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10"><Calendar size={20} /></div>
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
                        popperPlacement="bottom-start"
                        className={`custom-datepicker-input ${errors.data_agendamento ? '!border-red-500 !ring-red-100' : ''}`}
                        onFocus={(e) => e.target.blur()}
                    />
                </div>
                {errors.data_agendamento && <span className="text-xs text-red-500 mt-1 block">{errors.data_agendamento}</span>}
            </div>

            <div className="w-full">
                <label className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    Selecione o Horário <span className="text-red-500">*</span>
                    {selectedTime && <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Selecionado: {format(selectedTime, 'HH:mm')}</span>}
                </label>
                
                <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 p-2 rounded-xl ${errors.hora_agendamento ? 'bg-red-50 border border-red-200' : ''}`}>
                    {HORARIOS_FIXOS.map((horario) => {
                        const isDisabled = checkIsDisabled(horario);
                        const isSelected = selectedTime && format(selectedTime, 'HH:mm') === horario;

                        return (
                            <button
                                key={horario}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => handleSelectTime(horario)}
                                className={`
                                    py-2 px-1 rounded-lg text-sm font-semibold border transition-all duration-200
                                    ${isDisabled 
                                        ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed decoration-slate-300'
                                        : isSelected
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600 hover:shadow-sm'
                                    }
                                `}
                            >
                                <div className="flex items-center justify-center gap-1">
                                    {horario}
                                </div>
                            </button>
                        );
                    })}
                </div>
                {errors.hora_agendamento && <span className="text-xs text-red-500 mt-1 block font-medium">{errors.hora_agendamento}</span>}
            </div>

          </div>

          <div className="h-px bg-slate-100 my-2"></div>

          {/* CRM REMOVIDO DA DIV E ALINHADO COM OS DEMAIS INPUTS */}
          <Input 
             label="Seu CRM" 
             name="crm_responsavel" 
             value={formData.crm_responsavel} 
             onChange={handleCrmChange} 
             icon={<User size={20} />} 
             error={errors.crm_responsavel}
             placeholder="Apenas números (Ex: 12345)"
             maxLength={5}
             required
          />

          <Input 
             label="Número do Atendimento" 
             name="numero_atendimento" 
             value={formData.numero_atendimento} 
             onChange={handleNumeroAtendimentoChange} 
             icon={<Hash size={20} />} 
             error={errors.numero_atendimento}
             placeholder="Somente números"
             maxLength={10}
             required
          />

          <Input 
             label="Nome do Paciente" 
             name="nome_paciente" 
             value={formData.nome_paciente} 
             onChange={handleChange} 
             icon={<User size={20} />} 
             error={errors.nome_paciente} 
             required
          />

          <Input 
             label="Telefone / WhatsApp" 
             name="telefone_paciente" 
             value={formData.telefone_paciente} 
             onChange={handlePhoneChange} 
             placeholder="(xx) xxxxx-xxxx" 
             maxLength={15} 
             icon={<Phone size={20} />} 
             error={errors.telefone_paciente} 
             required
          />
          
          <div className="space-y-3">
            <Textarea 
                label="Diagnóstico / Condutas" 
                name="diagnostico" 
                value={formData.diagnostico} 
                onChange={handleChange} 
                rows={3} 
                icon={<FileText size={20} />} 
            />

            <div className="pl-1">
                <div className="flex flex-wrap gap-2">
                    {OPCOES_PROCEDIMENTOS.map((proc) => {
                        const isSelected = formData.procedimentos.includes(proc);
                        return (
                            <button
                                key={proc}
                                type="button"
                                onClick={() => toggleProcedimento(proc)}
                                className={`
                                    px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5
                                    ${isSelected 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' 
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }
                                `}
                            >
                                <Activity size={14} className={isSelected ? 'text-emerald-500' : 'text-slate-400'} />
                                {proc}
                            </button>
                        )
                    })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Selecione os procedimentos adicionais, se houver.</p>
            </div>
          </div>

          <div className="w-full">
            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Anexos (Máx: 5)</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 p-6 hover:bg-white hover:border-blue-400 transition-colors relative text-center">
               <input type="file" multiple onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,image/*" />
               <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Upload size={32} className="text-blue-400" />
                  <p className="text-sm font-medium">Clique ou arraste arquivos aqui</p>
                  <p className="text-xs text-slate-400">PDF ou Imagens</p>
               </div>
            </div>
            {arquivos.length > 0 && (
                <div className="mt-3 space-y-2">
                    {arquivos.map((arq, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip size={16} className="text-blue-600 flex-shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{arq.name}</span>
                        </div>
                        <button type="button" onClick={() => removerArquivo(index)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"><Trash2 size={16} /></button>
                    </div>
                    ))}
                </div>
            )}
          </div>

          {errorMsg && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center gap-3 animate-in fade-in">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  <span className="font-semibold">{errorMsg}</span>
              </div>
          )}

          <Button type="submit" disabled={loading} fullWidth>
            {loading ? 'Salvando Agendamento...' : 'Confirmar Agendamento'}
          </Button>
        </form>
      </Card>
      {showToast && <Toast message="Agendamento realizado com sucesso!" onClose={() => setShowToast(false)} />}
    </div>
  );
}

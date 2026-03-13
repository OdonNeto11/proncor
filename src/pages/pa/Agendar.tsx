import React, { useState, FormEvent, useEffect } from 'react';
import { Calendar, User, Phone, FileText, Hash, Activity, AlertCircle } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import { format, isSameDay, setHours, setMinutes } from 'date-fns';
import { Link } from 'react-router-dom';

// COMPONENTES UI IMPORTADOS
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { SelectAutocomplete } from '../../components/ui/SelectAutocomplete';
import { Title, Description, themeClasses } from '../../components/ui/Typography'; 
import { TimeSelector } from '../../components/ui/TimeSelector';
import { FileUpload } from '../../components/ui/FileUpload';

import { maskPhone, validateFields, capitalizeName } from '../../utils/formUtils';
import { supabase } from '../../lib/supabase';
import { usePermissoes } from '../../hooks/usePermissoes'; 

registerLocale('pt-BR', ptBR);

const OPCOES_PROCEDIMENTOS = ["Exames", "RX", "Tomografia"];

export function Agendar() {
  const { podeCriarPA } = usePermissoes(); 
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    numero_atendimento: '', 
    nome_paciente: '',
    telefone_paciente: '',
    plano_saude: '', 
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
    const fetchHorarios = async () => {
      const { data, error } = await supabase
        .from('config_horarios')
        .select('horario')
        .eq('ativo', true)
        .order('horario', { ascending: true });
        
      if (data && !error) {
        setHorariosDisponiveis(data.map(h => h.horario.substring(0, 5)));
      }
    };
    fetchHorarios();
  }, []);

  useEffect(() => {
    const fetchBookedTimes = async () => {
      if (!selectedDate) return;
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('agendamentos')
        .select('hora_agendamento')
        .eq('data_agendamento', dateStr)
        .in('status_id', [1, 2]);

      if (data && !error) {
        setBookedTimes(data.map(item => item.hora_agendamento.substring(0, 5)));
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
      return dataHoraOpcao.getTime() < new Date().getTime() - 60000;
    }
    return false;
  };

  const handleSelectTime = (timeStr: string) => {
    if (!selectedDate) return;
    const [h, m] = timeStr.split(':').map(Number);
    setSelectedTime(setHours(setMinutes(new Date(selectedDate), m), h));
    if(errors.hora_agendamento) setErrors({...errors, hora_agendamento: ''});
  };

  const toggleProcedimento = (opcao: string) => {
    setFormData(prev => {
      const jaExiste = prev.procedimentos.includes(opcao);
      const novosProcedimentos = jaExiste 
        ? prev.procedimentos.filter(p => p !== opcao)
        : [...prev.procedimentos, opcao];
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    const camposObrigatorios = ['numero_atendimento', 'nome_paciente', 'telefone_paciente', 'crm_responsavel'];
    const { errors: valErrors } = validateFields(formData, camposObrigatorios);
    
    const novosErros: Record<string, string> = { ...valErrors };
    if (!selectedDate) novosErros.data_agendamento = 'Data obrigatória';
    if (!selectedTime) novosErros.hora_agendamento = 'Selecione um horário';
    if (formData.telefone_paciente && formData.telefone_paciente.length < 14) {
      novosErros.telefone_paciente = 'Telefone inválido';
    }

    if (!formData.crm_responsavel || !/^[0-9]{4,5}$/.test(formData.crm_responsavel)) {
      novosErros.crm_responsavel = 'Favor preencher um CRM válido (4 ou 5 números)';
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
      setBookedTimes([...bookedTimes, horaFormatada]);
    } catch (error: any) { 
        setErrorMsg('Erro de conexão ao salvar no banco: ' + error.message);
    } finally { 
        setLoading(false); 
    }
  };

  if (!podeCriarPA) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm mt-8 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={48} className="text-red-400" />
        </div>
        <Title className="mb-2">Acesso Negado</Title>
        <Description className="max-w-sm mx-auto">
          O seu perfil não tem permissão para registrar novos agendamentos no Pronto Atendimento.
        </Description>
        <Link to="/" className="inline-block mt-8 px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-200 transition-colors">
          Voltar para Início
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      
      <div className="flex items-center gap-6 mb-8 border-b border-gray-200 dark:border-slate-800 px-2">
        <Link to="/novo" className="pb-3 text-sm font-bold border-b-2 border-blue-600 text-blue-600">
          Novo Agendamento
        </Link>
        <Link to="/agenda" className={`pb-3 text-sm font-bold border-b-2 border-transparent transition-colors opacity-60 hover:opacity-100 ${themeClasses.text}`}>
          Ver Agenda
        </Link>
      </div>

      <div className="mb-8">
        <Title className="mb-2">Novo Agendamento</Title>
        <Description>Preencha os dados a seguir:</Description>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6 p-6" noValidate>
          <div className="flex flex-col gap-6">
            <div className="w-full">
                <label className={`text-sm font-semibold mb-2 block ${themeClasses.text}`}>Selecione a Data <span className="text-red-500">*</span></label>
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
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border shadow-sm bg-white dark:bg-slate-800 ${themeClasses.text} ${themeClasses.placeholder} ${errors.data_agendamento ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} outline-none focus:ring-2 focus:ring-blue-500`}
                        onFocus={(e) => e.target.blur()}
                    />
                </div>
                {errors.data_agendamento && <span className="text-xs text-red-500 mt-1 block">{errors.data_agendamento}</span>}
            </div>

            {/* COMPONENTE INJETADO */}
            <TimeSelector 
              horarios={horariosDisponiveis}
              selectedTime={selectedTime}
              onSelectTime={handleSelectTime}
              checkIsDisabled={checkIsDisabled}
              error={errors.hora_agendamento}
            />
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>

          <div className="space-y-6">
            <Input 
              label="Seu CRM" 
              name="crm_responsavel" 
              value={formData.crm_responsavel} 
              onChange={(e) => setFormData({ ...formData, crm_responsavel: e.target.value.replace(/\D/g, '').slice(0, 5) })} 
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
             onChange={(e) => setFormData({ ...formData, numero_atendimento: e.target.value.replace(/\D/g, '').slice(0, 10) })} 
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
              onChange={(e) => setFormData({ ...formData, nome_paciente: capitalizeName(e.target.value) })} 
              icon={<User size={20} />} 
              error={errors.nome_paciente} 
              required
            />

            <Input 
              label="Telefone / WhatsApp" 
              name="telefone_paciente" 
              value={formData.telefone_paciente} 
              onChange={(e) => setFormData({ ...formData, telefone_paciente: maskPhone(e.target.value) })} 
              placeholder="(xx) xxxxx-xxxx" 
              maxLength={15} 
              icon={<Phone size={20} />} 
              error={errors.telefone_paciente} 
              required
            />

            <SelectAutocomplete 
              label="Plano de Saúde (Opcional)"
              placeholder="Ex: Unimed, Cassems..."
              tableName="planos_saude"
              columnName="nome"
              value={formData.plano_saude}
              onChange={(val) => setFormData({ ...formData, plano_saude: val })}
              error={errors.plano_saude}
            />

            <Textarea 
                label="Diagnóstico / Condutas" 
                name="diagnostico" 
                value={formData.diagnostico} 
                onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })} 
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
                                        : `bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 ${themeClasses.text}`
                                    }
                                `}
                            >
                                <Activity size={14} className={isSelected ? 'text-emerald-500' : 'text-slate-400'} />
                                {proc}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* COMPONENTE INJETADO */}
            <FileUpload 
              arquivos={arquivos}
              onFileChange={handleFileChange}
              onRemoveArquivo={removerArquivo}
            />
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
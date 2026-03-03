import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, CheckCircle2, 
  Search, MessageCircle, AlertTriangle, ListChecks, Edit, RefreshCw, AlertCircle, FileDown, 
  Hash, Activity, Stethoscope, ArrowRightCircle, HelpCircle, User, Phone, FileText
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isSameDay, endOfMonth, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DatePicker, { registerLocale } from 'react-datepicker'; 
import "react-datepicker/dist/react-datepicker.css"; 
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

// IMPORTANDO NOSSOS COMPONENTES ARQUITETURAIS E UI
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { SelectAutocomplete } from '../../components/ui/SelectAutocomplete';
import { Modal } from '../../components/ui/Modal';
import { ActionListItem } from '../../components/ui/ActionListItem';
import { ModalDetalhesLayout } from '../../components/shared/ModalDetalhesLayout';
import { ModalConfirmacaoCancelamentoLayout } from '../../components/shared/ModalConfirmacaoCancelamentoLayout';
import { maskPhone, capitalizeName } from '../../utils/formUtils';
import { ModalAtualizarStatusLayout } from '../../components/shared/ModalAtualizarStatusLayout';
import { ModalConfirmacaoStatusLayout } from '../../components/shared/ModalConfirmacaoStatusLayout';

registerLocale('pt-BR', ptBR); 

const OPCOES_PROCEDIMENTOS = ["Exames", "RX", "Tomografia"];

const STATUS_CONFIG: Record<number, { label: string, color: string, border: string, icon: any }> = {
  1: { label: 'Agendado', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200', icon: Clock },
  2: { label: 'Reagendado', color: 'bg-orange-100 text-orange-700', border: 'border-orange-200', icon: AlertTriangle },
  3: { label: 'Cancelado', color: 'bg-red-100 text-red-700', border: 'border-red-200', icon: AlertCircle },
  4: { label: 'Não respondeu após reagendamento', color: 'bg-gray-100 text-gray-600', border: 'border-gray-200', icon: HelpCircle },
  5: { label: 'Finalizado', color: 'bg-green-100 text-green-700', border: 'border-green-200', icon: CheckCircle2 },
  6: { label: 'Encaminhado PA', color: 'bg-purple-100 text-purple-700', border: 'border-purple-200', icon: ArrowRightCircle },
  7: { label: 'Retorno ao PA', color: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200', icon: Stethoscope },
};

type Anexo = { nome: string; url: string; };

type StatusItem = {
  id: number;
  nome: string;
  agrupamento: string;
};

type Agendamento = {
  id: number;
  data_agendamento: string;
  hora_agendamento: string;
  numero_atendimento: string; 
  nome_paciente: string;
  telefone_paciente: string;
  plano_saude?: string; 
  diagnostico: string;
  procedimentos: string[] | null; 
  status_id: number;
  status: StatusItem; 
  anexos: Anexo[] | null;
  medico_id: number | null;
  crm_responsavel?: string;
};

type ModalView = 'details' | 'edit' | 'reschedule' | 'update_status' | 'confirm_status_update' | 'confirm_cancel';

export function Agenda() {
  const { permissoes, user } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('padrao'); 
  const [dataInicio, setDataInicio] = useState<Date | null>(new Date()); 
  const [dataFim, setDataFim] = useState<Date | null>(endOfMonth(new Date())); 
  
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [viewMode, setViewMode] = useState<ModalView>('details');
  const [showToast, setShowToast] = useState({ visible: false, message: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const [reagendarDate, setReagendarDate] = useState<Date | null>(null);
  const [reagendarTime, setReagendarTime] = useState<Date | null>(null);
  const [reagendarMotivo, setReagendarMotivo] = useState('');
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [tempStatusId, setTempStatusId] = useState<number | null>(null);
  
  const [actionCrm, setActionCrm] = useState(''); 
  
  const [editForm, setEditForm] = useState({ 
    numero_atendimento: '',
    nome: '', 
    telefone: '', 
    plano_saude: '',
    diagnostico: '',
    procedimentos: [] as string[],
    crm_responsavel: ''
  });

  useEffect(() => {
    const fetchHorarios = async () => {
      const { data, error } = await supabase.from('config_horarios').select('horario').eq('ativo', true).order('horario', { ascending: true });
      if (data && !error) setHorariosDisponiveis(data.map(h => h.horario.substring(0, 5)));
    };
    fetchHorarios();
  }, []);

  const fetchAgendamentos = async () => {
    setLoading(true);
    try {
      const inicioStr = dataInicio ? format(dataInicio, 'yyyy-MM-dd') : '';
      const fimStr = dataFim ? format(dataFim, 'yyyy-MM-dd') : '';

      let query = supabase.from('agendamentos').select('*, status:status_id(*)').order('data_agendamento', { ascending: true }).order('hora_agendamento', { ascending: true });

      if (inicioStr) query = query.gte('data_agendamento', inicioStr);
      if (fimStr) query = query.lte('data_agendamento', fimStr);

      const { data, error } = await query;
      if (error) throw error;
      if (data) setAgendamentos(data as any);
    } catch (error) { console.error('Erro:', error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAgendamentos(); }, [dataInicio, dataFim]);

  useEffect(() => {
    const fetchBookedTimesForReschedule = async () => {
      if (!reagendarDate) return;
      const { data, error } = await supabase.from('agendamentos').select('hora_agendamento').eq('data_agendamento', format(reagendarDate, 'yyyy-MM-dd')).in('status_id', [1, 2]);
      if (data && !error) setBookedTimes(data.map(item => item.hora_agendamento.substring(0, 5)));
    };
    if (viewMode === 'reschedule') { setBookedTimes([]); setReagendarTime(null); fetchBookedTimesForReschedule(); }
  }, [reagendarDate, viewMode]);

  useEffect(() => { setErrorMsg(''); }, [viewMode]);

  const checkIsDisabled = (timeStr: string) => {
    if (!reagendarDate) return true; 
    if (bookedTimes.includes(timeStr)) return true;
    if (isSameDay(reagendarDate, new Date())) {
      const [hora, minuto] = timeStr.split(':').map(Number);
      const dataHoraOpcao = new Date(reagendarDate);
      dataHoraOpcao.setHours(hora, minuto, 0, 0);
      return dataHoraOpcao.getTime() < new Date().getTime() - 60000;
    }
    return false;
  };

  const handleSelectRescheduleTime = (timeStr: string) => {
    if (!reagendarDate) return;
    const [h, m] = timeStr.split(':').map(Number);
    setReagendarTime(setHours(setMinutes(new Date(reagendarDate), m), h));
  };

  const agendamentosFiltrados = agendamentos.filter(ag => {
    const termo = busca.toLowerCase();
    const matchNome = ag.nome_paciente?.toLowerCase().includes(termo);
    const termoLimpoBusca = termo.replace(/\D/g, '');
    const matchTelefone = ag.telefone_paciente?.includes(termo) || (termoLimpoBusca.length > 0 && (ag.telefone_paciente?.replace(/\D/g, '') || '').includes(termoLimpoBusca));
    const matchNumero = ag.numero_atendimento?.toLowerCase().includes(termo);
    const matchCrm = ag.crm_responsavel?.toLowerCase().includes(termo);

    let matchStatus = true;
    if (filtroStatus === 'padrao') matchStatus = ag.status?.agrupamento === 'pendente';
    else if (filtroStatus === 'todos_ativos') matchStatus = ag.status?.agrupamento !== 'perdido'; 
    else if (filtroStatus !== '') matchStatus = ag.status_id === parseInt(filtroStatus);
    
    return (matchNome || matchTelefone || matchNumero || matchCrm) && matchStatus;
  });

  const grupos = agendamentosFiltrados.reduce((acc, curr) => {
    (acc[curr.data_agendamento] = acc[curr.data_agendamento] || []).push(curr); return acc;
  }, {} as Record<string, Agendamento[]>);

  const solicitarAtualizacaoStatus = (novoStatusId: number) => {
      setTempStatusId(novoStatusId);
      setViewMode('confirm_status_update');
  };

  const isValidCrm = (crm: string) => /^[0-9]{4,5}$/.test(crm);

  const executarAtualizacaoStatus = async () => {
    setErrorMsg('');
    if (!tempStatusId || !selectedAgendamento) return;
    if (!isValidCrm(actionCrm)) { setErrorMsg("Informe um CRM válido"); return; }

    try {
        const { error } = await supabase.from('agendamentos').update({ status_id: tempStatusId, crm_responsavel: actionCrm }).eq('id', selectedAgendamento.id);
        if (error) throw error;
        
        if (tempStatusId === 6) {
           await supabase.from('encaminhamentos_ambulatorio').insert([{
             numero_atendimento: selectedAgendamento.numero_atendimento || '',
             nome_paciente: selectedAgendamento.nome_paciente,
             telefone_paciente: selectedAgendamento.telefone_paciente,
             plano_saude: selectedAgendamento.plano_saude || 'Oriundo do PA',
             exames_especialidades: selectedAgendamento.procedimentos && selectedAgendamento.procedimentos.length > 0 ? selectedAgendamento.procedimentos : ['Avaliação pós-PA'],
             observacoes: `Diagnóstico prévio: ${selectedAgendamento.diagnostico || 'Não informado.'}`,
             status_id: 1, 
             criado_por: user?.id,
             origem: 'PA', 
             crm_solicitante: actionCrm 
           }]);
        }
        setShowToast({ visible: true, message: `Status alterado para: ${STATUS_CONFIG[tempStatusId]?.label}` });
        setSelectedAgendamento(null);
        fetchAgendamentos();
    } catch (e) { setErrorMsg('Erro de comunicação com o banco de dados. Tente novamente.'); }
  };

  const confirmarReagendamento = async () => {
    setErrorMsg('');
    if (!reagendarDate || !reagendarTime) { setErrorMsg("Preencha a nova data e o novo horário."); return; }
    if (!isValidCrm(actionCrm)) { setErrorMsg("Informe um CRM válido."); return; }

    try {
      const novoDiagnostico = (selectedAgendamento?.diagnostico || '') + `\n[Reagendado em ${format(new Date(), 'dd/MM')}]: ${reagendarMotivo || 'Sem motivo informado.'}`;
      const { error } = await supabase.from('agendamentos').update({
        data_agendamento: format(reagendarDate, 'yyyy-MM-dd'),
        hora_agendamento: format(reagendarTime, 'HH:mm'),
        diagnostico: novoDiagnostico,
        status_id: 2, 
        crm_responsavel: actionCrm 
      }).eq('id', selectedAgendamento!.id);
      
      if (error) throw error;
      setShowToast({ visible: true, message: 'Reagendado com sucesso!' });
      setSelectedAgendamento(null);
      fetchAgendamentos();
    } catch (error) { setErrorMsg("Erro ao salvar reagendamento no banco. Tente novamente."); }
  };

  const confirmarEdicao = async () => {
     setErrorMsg('');
     if (!selectedAgendamento) return;
     if (!isValidCrm(editForm.crm_responsavel)) { setErrorMsg("Informe um CRM válido."); return; }

     try {
       const { error } = await supabase.from('agendamentos').update({
           numero_atendimento: editForm.numero_atendimento,
           nome_paciente: editForm.nome,
           telefone_paciente: editForm.telefone,
           plano_saude: editForm.plano_saude,
           diagnostico: editForm.diagnostico,
           procedimentos: editForm.procedimentos,
           crm_responsavel: editForm.crm_responsavel 
       }).eq('id', selectedAgendamento.id);
       
       if (error) throw error;
       setShowToast({ visible: true, message: 'Dados atualizados!' });
       setViewMode('details');
       fetchAgendamentos();
       setSelectedAgendamento(null);
     } catch (e) { setErrorMsg('Erro ao salvar os dados no banco. Tente novamente.'); }
  };

  const abrirModal = (item: Agendamento) => {
    setSelectedAgendamento(item);
    setViewMode('details');
    setReagendarDate(null);
    setReagendarTime(null);
    setReagendarMotivo('');
    setActionCrm(''); 
    setErrorMsg('');
    setEditForm({ 
        numero_atendimento: item.numero_atendimento || '',
        nome: item.nome_paciente, 
        telefone: item.telefone_paciente, 
        plano_saude: item.plano_saude || '', 
        diagnostico: item.diagnostico || '',
        procedimentos: item.procedimentos || [],
        crm_responsavel: '' 
    });
  };

  const limparFiltros = () => {
    setDataInicio(new Date()); 
    setDataFim(endOfMonth(new Date())); 
    setFiltroStatus('padrao');
    setBusca('');
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      
      <div className="flex items-center gap-6 mb-8 border-b border-slate-200 px-2">
        <Link to="/novo" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/novo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Novo Agendamento</Link>
        <Link to="/agenda" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/agenda' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Ver Agenda</Link>
      </div>
      
      <Card className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div><h1 className="text-2xl font-bold text-slate-800">Agenda de Consultas</h1><p className="text-slate-500 text-sm">Gerencie os atendimentos</p></div>
          <div className="w-full md:w-80 relative">
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome, telefone, nº ou CRM..." icon={<Search size={18} />} />
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-4 pt-4 border-t border-slate-50">
          <div className="flex items-center gap-2 lg:w-1/3">
            <div className="relative flex-1">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={16} />
                <DatePicker selected={dataInicio} onChange={(date: Date | null) => setDataInicio(date)} locale="pt-BR" dateFormat="dd/MM/yyyy" placeholderText="Início" className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none" onFocus={(e) => e.target.blur()} />
            </div>
            <span className="text-slate-400 text-sm">até</span>
            <div className="relative flex-1">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={16} />
                <DatePicker selected={dataFim} onChange={(date: Date | null) => setDataFim(date)} locale="pt-BR" dateFormat="dd/MM/yyyy" placeholderText="Fim" className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none" onFocus={(e) => e.target.blur()} />
            </div>
          </div>
          <div className="relative flex-1">
              <ListChecks className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none bg-white h-10">
                  <option value="padrao">Padrão (Pendentes)</option>
                  <option value="todos_ativos">Todos Ativos</option>
                  {Object.entries(STATUS_CONFIG).map(([id, config]) => (
                    <option key={id} value={id}>{config.label}</option>
                  ))}
              </select>
          </div>
        </div>
      </Card>

      {loading ? <div className="text-center py-20 text-slate-500">Carregando...</div> : 
        agendamentosFiltrados.length === 0 ? (
          <Card className="text-center py-20 bg-slate-50 border-dashed shadow-none">
            <h3 className="text-slate-600 font-medium">Nenhum agendamento encontrado</h3>
            <button onClick={limparFiltros} className="text-blue-600 font-medium hover:underline flex items-center justify-center gap-2 mx-auto mt-2"><RefreshCw size={16} /> Limpar Filtros</button>
          </Card>
        ) : (
        <div className="space-y-8">
          {Object.entries(grupos).map(([data, itens]) => (
            <div key={data} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 mb-4 bg-blue-50 p-2 rounded-xl w-full border border-blue-100 shadow-sm">
                <CalendarIcon className="text-blue-600" size={18} />
                <h2 className="font-bold text-slate-800 capitalize text-sm">
                    {isToday(parseISO(data)) ? 'Hoje' : isTomorrow(parseISO(data)) ? 'Amanhã' : format(parseISO(data), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {itens.map((item) => {
                  const statusInfo = STATUS_CONFIG[item.status_id] || STATUS_CONFIG[1];
                  return (
                    <div key={item.id} onClick={() => abrirModal(item)} className="bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden group transition-all">
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusInfo.color.split(' ')[0].replace('bg-', 'bg-opacity-100 bg-')}`} /> 
                        <div className="pl-3">
                        <div className="flex justify-between mb-2">
                            <span className="flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg text-xs"><Clock size={12} /> {item.hora_agendamento}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${statusInfo.color} ${statusInfo.border}`}>{statusInfo.label}</span>
                        </div>
                        
                        <div className="flex gap-2 items-center mb-1">
                            {item.numero_atendimento && (<span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">#{item.numero_atendimento}</span>)}
                            {item.crm_responsavel && (<span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">CRM {item.crm_responsavel}</span>)}
                        </div>

                        <h3 className="font-bold text-slate-800 truncate">{item.nome_paciente}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-2"><MessageCircle size={10} /> {item.telefone_paciente}</p>
                        
                        {item.plano_saude && (
                            <p className="text-[10px] font-semibold text-blue-600 bg-blue-50 inline-block px-1.5 py-0.5 rounded-md mt-1 border border-blue-100">{item.plano_saude}</p>
                        )}

                        {item.procedimentos && item.procedimentos.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {item.procedimentos.slice(0, 2).map((proc, i) => (<span key={i} className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md border border-emerald-100">{proc}</span>))}
                                {item.procedimentos.length > 2 && <span className="text-[9px] text-slate-400 font-bold">+{item.procedimentos.length - 2}</span>}
                            </div>
                        )}
                        </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAIS FLUTUANTES ISOLADOS E LIMPOS */}
      
      {/* 1. VIEW DETALHES (O MOLDE COMPARTILHADO) */}
      {selectedAgendamento && viewMode === 'details' && (
        <ModalDetalhesLayout 
          isOpen={true}
          onClose={() => setSelectedAgendamento(null)}
          title={
            <div className="flex items-center gap-2">
              <span className="line-clamp-1">{selectedAgendamento.nome_paciente}</span>
              {selectedAgendamento.status?.agrupamento === 'pendente' && permissoes.includes('editar_agendamento') && (
                <button onClick={() => setViewMode('edit')} className="p-1.5 bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors"><Edit size={18} /></button>
              )}
            </div>
          }
          infoBoxes={[
            { label: 'Data', value: format(parseISO(selectedAgendamento.data_agendamento), 'dd/MM'), theme: 'blue' },
            { label: 'Hora', value: selectedAgendamento.hora_agendamento, theme: 'blue' },
            { label: 'Atendimento', value: `#${selectedAgendamento.numero_atendimento}`, theme: 'slate' }
          ]}
          statusLabel={STATUS_CONFIG[selectedAgendamento.status_id]?.label || 'Desconhecido'}
          statusClasses={{ color: STATUS_CONFIG[selectedAgendamento.status_id]?.color || 'bg-slate-100 text-slate-700', border: STATUS_CONFIG[selectedAgendamento.status_id]?.border || 'border-slate-200' }}
          tagsLabel="Procedimentos"
          tags={selectedAgendamento.procedimentos || []}
          phoneForWhats={permissoes.includes('acionar_whatsapp') ? selectedAgendamento.telefone_paciente : undefined}
          obsLabel="Diagnóstico / Condutas"
          obsText={selectedAgendamento.diagnostico || 'Sem observações.'}
          customContent={
            selectedAgendamento.anexos && selectedAgendamento.anexos.length > 0 ? (
              <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Anexos</p>
                  {selectedAgendamento.anexos.map((anexo, idx) => (
                      <a key={idx} href={anexo.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 hover:bg-blue-100 transition-colors group">
                          <div className="flex items-center gap-2 overflow-hidden"><FileDown size={18} className="flex-shrink-0" /><span className="text-sm font-semibold truncate">{anexo.nome}</span></div>
                          <span className="text-xs bg-white px-2 py-1 rounded text-blue-500 font-medium group-hover:text-blue-700">Baixar</span>
                      </a>
                  ))}
              </div>
            ) : undefined
          }
          actionButtons={
            selectedAgendamento.status?.agrupamento === 'pendente' ? (
              <>
                {permissoes.includes('atualizar_status') && <Button variant="primary" fullWidth onClick={() => setViewMode('update_status')}><CheckCircle2 size={18} /> Atualizar Status</Button>}
                {permissoes.includes('reagendar_agendamento') && <Button variant="outline" fullWidth onClick={() => { setViewMode('reschedule'); setReagendarDate(new Date()); }}><AlertTriangle size={18} /> Reagendar</Button>}
              </>
            ) : undefined
          }
          footerButtons={
            selectedAgendamento.status?.agrupamento === 'pendente' && permissoes.includes('cancelar_agendamento') ? (
              <button onClick={() => { setTempStatusId(3); setViewMode('confirm_cancel'); }} className="w-full text-xs text-red-400 hover:text-red-600 py-2 font-bold">Cancelar agendamento</button>
            ) : undefined
          }
        />
      )}

{/* 2. VIEW ATUALIZAR STATUS */}
      {selectedAgendamento && viewMode === 'update_status' && (
        <ModalAtualizarStatusLayout
          isOpen={true}
          onClose={() => setViewMode('details')}
          nomePaciente={selectedAgendamento.nome_paciente}
          theme="blue"
        >
          <ActionListItem icon={<CheckCircle2 size={18}/>} title="Finalizado" colorTheme="green" onClick={() => solicitarAtualizacaoStatus(5)} />
          <ActionListItem icon={<ArrowRightCircle size={18}/>} title="Encaminhado ao Ambulatório" colorTheme="purple" onClick={() => solicitarAtualizacaoStatus(6)} />
          <ActionListItem icon={<Stethoscope size={18}/>} title="Retorno ao PA" colorTheme="indigo" onClick={() => solicitarAtualizacaoStatus(7)} />
          {selectedAgendamento?.status_id === 2 && (
              <ActionListItem icon={<AlertCircle size={18}/>} title="Não respondeu após reagendamento" colorTheme="gray" onClick={() => solicitarAtualizacaoStatus(4)} />
          )}
        </ModalAtualizarStatusLayout>
      )}

{/* 3. VIEW CONFIRMAÇÃO DE STATUS (FINALIZADO, ENCAMINHADO, ETC) */}
      {selectedAgendamento && viewMode === 'confirm_status_update' && tempStatusId && (
        <ModalConfirmacaoStatusLayout 
          isOpen={true}
          onClose={() => setViewMode('update_status')}
          onConfirm={executarAtualizacaoStatus}
          nomePaciente={selectedAgendamento.nome_paciente}
          statusNome={STATUS_CONFIG[tempStatusId]?.label || "Finalizado"}
          tipoStatus={tempStatusId === 5 ? "sucesso" : "neutro"}
          errorMsg={errorMsg}
          customInput={
            <Input 
              label="Seu CRM (Obrigatório)" 
              placeholder="Apenas números. Ex: 12345" 
              value={actionCrm} 
              onChange={(e) => setActionCrm(e.target.value.replace(/\D/g, '').slice(0, 5))} 
              icon={<Stethoscope size={18} />} 
            />
          }
        />
      )}

      {/* 4. VIEW EDITAR */}
      {selectedAgendamento && viewMode === 'edit' && (
        <Modal isOpen={true} onClose={() => setViewMode('details')} title={<span className="text-blue-600">Editando dados</span>}>
           <div className="space-y-4">
              <Input label="Nº Atendimento" value={editForm.numero_atendimento} onChange={e => setEditForm({ ...editForm, numero_atendimento: e.target.value.replace(/\D/g, '') })} icon={<Hash size={18} />} maxLength={10} />
              <Input label="Nome do Paciente" value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: capitalizeName(e.target.value) })} icon={<User size={18} />} />
              <Input label="Telefone / WhatsApp" value={editForm.telefone} onChange={e => setEditForm({ ...editForm, telefone: maskPhone(e.target.value) })} icon={<Phone size={18} />} maxLength={15} />
              
              <div className="relative z-50">
                  <SelectAutocomplete label="Plano de Saúde" tableName="planos_saude" columnName="nome" placeholder="Ex: Unimed, Cassems..." value={editForm.plano_saude} onChange={(val) => setEditForm({ ...editForm, plano_saude: val })} />
              </div>

              <Textarea label="Diagnóstico / Condutas" value={editForm.diagnostico} onChange={e => setEditForm({ ...editForm, diagnostico: e.target.value })} icon={<FileText size={18} />} rows={3} />
              
              <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">Procedimentos</label>
                  <div className="flex flex-wrap gap-2">
                      {OPCOES_PROCEDIMENTOS.map((proc) => {
                          const isSelected = editForm.procedimentos.includes(proc); 
                          return (
                              <button key={proc} onClick={() => setEditForm(prev => ({...prev, procedimentos: isSelected ? prev.procedimentos.filter(p=>p!==proc) : [...prev.procedimentos, proc]}))} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${isSelected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'}`}>
                                  <Activity size={14} /> {proc}
                              </button>
                          )
                      })}
                  </div>
              </div>
              
              <Input label="Seu CRM (Obrigatório para salvar)" value={editForm.crm_responsavel} onChange={e => setEditForm({ ...editForm, crm_responsavel: e.target.value.replace(/\D/g, '').slice(0, 5) })} icon={<Stethoscope size={18} />} placeholder="Apenas números" />

              {errorMsg && (
                <div className="mb-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center gap-2 animate-in fade-in"><AlertCircle size={18} className="flex-shrink-0" /><span className="font-bold">{errorMsg}</span></div>
              )}

              <div className="flex gap-2 pt-4 mt-4 border-t border-slate-100">
                  <Button variant="secondary" fullWidth onClick={() => setViewMode('details')}>Cancelar</Button>
                  <Button variant="primary" fullWidth onClick={confirmarEdicao}>Salvar Dados</Button>
              </div>
          </div>
        </Modal>
      )}

      {/* 5. VIEW REAGENDAR */}
      {selectedAgendamento && viewMode === 'reschedule' && (
        <Modal isOpen={true} onClose={() => setViewMode('details')} title={<span className="text-orange-600">Reagendamento</span>} maxWidth="2xl">
          <div className="space-y-6">
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100"><p className="text-sm text-orange-800 text-center font-bold">Selecione a nova data e horário</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nova Data</label>
                      <div className="relative">
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={20} />
                          <DatePicker selected={reagendarDate} onChange={(d: Date | null) => setReagendarDate(d)} minDate={new Date()} locale="pt-BR" dateFormat="dd/MM/yyyy" placeholderText="Selecione o dia" popperPlacement="bottom-start" className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none" onFocus={(e) => e.target.blur()} />
                      </div>
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Novo Horário</label>
                      {!reagendarDate ? (
                        <div className="h-10 flex items-center text-slate-400 text-sm italic">Selecione uma data primeiro.</div>
                      ) : horariosDisponiveis.length === 0 ? (
                        <div className="h-10 flex items-center text-slate-400 text-sm italic">Carregando horários...</div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                            {horariosDisponiveis.map((horario) => { 
                                const isDisabled = checkIsDisabled(horario); 
                                const isSelected = reagendarTime && format(reagendarTime, 'HH:mm') === horario; 
                                return (
                                    <button key={horario} type="button" disabled={isDisabled} onClick={() => handleSelectRescheduleTime(horario)} className={`py-1.5 px-1 rounded-md text-xs font-bold border transition-all ${isDisabled ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'}`}>
                                        {horario}
                                    </button>
                                );
                            })}
                        </div>
                      )}
                  </div>
              </div>
              <Textarea label="Motivo do reagendamento" value={reagendarMotivo} onChange={(e) => setReagendarMotivo(e.target.value)} placeholder="Ex.: Paciente pediu para remarcar." rows={2} />
              <Input label="Seu CRM (Obrigatório)" value={actionCrm} onChange={(e) => setActionCrm(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Apenas números. Ex.: 55123" icon={<Stethoscope size={18} />} />
              {errorMsg && (
                <div className="mb-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={18} className="flex-shrink-0" /><span className="font-bold">{errorMsg}</span></div>
              )}
              <div className="flex gap-2 pt-2">
                  <Button variant="secondary" fullWidth onClick={() => setViewMode('details')}>Voltar</Button>
                  <Button variant="primary" fullWidth onClick={confirmarReagendamento}>Confirmar Novo Horário</Button>
              </div>
          </div>
        </Modal>
      )}

      {/* 6. VIEW CANCELAR (USANDO O NOVO COMPONENTE DEDICADO) */}
      {selectedAgendamento && viewMode === 'confirm_cancel' && (
        <ModalConfirmacaoCancelamentoLayout 
          isOpen={true}
          onClose={() => setViewMode('details')}
          onConfirm={executarAtualizacaoStatus}
          nomePaciente={selectedAgendamento.nome_paciente}
          tipoAtendimento="agendamento"
          customInput={
            <Input label="Seu CRM (Obrigatório para cancelar)" value={actionCrm} onChange={(e) => setActionCrm(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Apenas números. Ex.: 55123" icon={<Stethoscope size={18} />} />
          }
          errorMsg={errorMsg}
        />
      )}

      {showToast.visible && <Toast message={showToast.message} onClose={() => setShowToast({ visible: false, message: '' })} />}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, CheckCircle2, 
  Search, AlertTriangle, ListChecks, Edit, RefreshCw, AlertCircle, FileDown, 
  Hash, Activity, Stethoscope, ArrowRightCircle, HelpCircle, User, Phone
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, endOfMonth, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DatePicker, { registerLocale } from 'react-datepicker'; 
import "react-datepicker/dist/react-datepicker.css"; 
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { Title, Description } from '../../components/ui/Typography';
import { Modal } from '../../components/ui/Modal';
import { ModalDetalhesLayout } from '../../components/shared/ModalDetalhesLayout';
import { ModalConfirmacaoCancelamentoLayout } from '../../components/shared/ModalConfirmacaoCancelamentoLayout';
import { ModalAtualizarStatusLayout } from '../../components/shared/ModalAtualizarStatusLayout';
import { ModalConfirmacaoStatusLayout } from '../../components/shared/ModalConfirmacaoStatusLayout';
import { AtendimentoCard } from '../../components/shared/AtendimentoCard';
import { TimeSelector } from '../../components/ui/TimeSelector';
import { ProcedimentosSelector } from '../../components/ui/ProcedimentosSelector';
import { maskPhone, capitalizeName } from '../../utils/formUtils';
import { usePermissoes } from '../../hooks/usePermissoes';

// IMPORTANDO O NOVO HOOK INTELIGENTE
import { useHorarios } from '../../hooks/useHorarios';

registerLocale('pt-BR', ptBR); 

const OPCOES_PROCEDIMENTOS = ["Exames", "RX", "Tomografia"];

const STATUS_CONFIG: Record<number, { label: string, color: string, border: string, icon: any }> = {
  1: { label: 'Agendado', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', icon: Clock },
  2: { label: 'Reagendado', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', icon: AlertTriangle },
  3: { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', border: 'border-red-200 dark:border-red-800', icon: AlertCircle },
  4: { label: 'Não respondeu após reagendamento', color: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400', border: 'border-gray-200 dark:border-slate-700', icon: HelpCircle },
  5: { label: 'Finalizado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', border: 'border-green-200 dark:border-green-800', icon: CheckCircle2 },
  6: { label: 'Encaminhado PA', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', icon: ArrowRightCircle },
  7: { label: 'Retorno ao PA', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', icon: Stethoscope },
};

type Anexo = { nome: string; url: string; };

type StatusItem = { id: number; nome: string; agrupamento: string; };

type Agendamento = {
  id: number; data_agendamento: string; hora_agendamento: string; numero_atendimento: string; 
  nome_paciente: string; telefone_paciente: string; diagnostico: string; procedimentos: string[] | null; 
  status_id: number; status: StatusItem; anexos: Anexo[] | null; medico_id: number | null; crm_responsavel?: string;
};

type ModalView = 'details' | 'edit' | 'reschedule' | 'update_status' | 'confirm_status_update' | 'confirm_cancel';

export function Agenda() {
  const { user } = useAuth();
  const { podeVerPA, podeEditarPA, podeAtualizarStatusPA, podeReagendarPA, podeCancelarPA, podeWhatsAppPA } = usePermissoes();

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [tempStatusId, setTempStatusId] = useState<number | null>(null);
  const [actionCrm, setActionCrm] = useState(''); 

  const [editForm, setEditForm] = useState({ 
    numero_atendimento: '', nome: '', telefone: '', diagnostico: '', procedimentos: [] as string[], crm_responsavel: ''
  });

  // === CONSUMINDO A INTELIGÊNCIA DO HOOK (APENAS PARA O REAGENDAR) ===
  const { 
    horariosDisponiveis, 
    checkIsDisabled, 
    isLoadingHorarios, 
    refreshBookedTimes 
  } = useHorarios(reagendarDate);
  // ====================================================================

  if (!podeVerPA) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed mt-10">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-6" />
        <Title className="mb-2">Acesso Negado</Title>
        <Description>Sem permissão para visualizar a agenda do PA.</Description>
        <Link to="/" className="inline-block mt-6 px-6 py-2 bg-gray-100 rounded-lg font-bold">Voltar para Home</Link>
      </div>
    );
  }

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
  useEffect(() => { setErrorMsg(''); }, [viewMode]);

  const handleSelectRescheduleTime = (timeStr: string) => {
    if (!reagendarDate) return;
    const [h, m] = timeStr.split(':').map(Number);
    setReagendarTime(setHours(setMinutes(new Date(reagendarDate), m), h));
  };

  const agendamentosFiltrados = agendamentos.filter(ag => {
    const termo = busca.toLowerCase();
    const matchNome = ag.nome_paciente?.toLowerCase().includes(termo);
    const telefoneLimpoBanco = ag.telefone_paciente?.replace(/\D/g, '') || '';
    const termoLimpoBusca = termo.replace(/\D/g, '');
    const matchTelefone = ag.telefone_paciente?.includes(termo) || (termoLimpoBusca.length > 0 && telefoneLimpoBanco.includes(termoLimpoBusca));
    const matchNumero = ag.numero_atendimento?.toLowerCase().includes(termo);
    const matchCrm = ag.crm_responsavel?.toLowerCase().includes(termo);

    let matchStatus = true;
    const statusId = ag.status_id;
    const agrupamento = ag.status?.agrupamento;

    if (filtroStatus === 'padrao') matchStatus = agrupamento === 'pendente';
    else if (filtroStatus === 'todos_ativos') matchStatus = agrupamento !== 'perdido'; 
    else if (filtroStatus !== '') matchStatus = statusId === parseInt(filtroStatus);

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
    if (!isValidCrm(actionCrm)) { setErrorMsg("Favor preencher um CRM válido (4 ou 5 números)."); return; }

    try {
        const { error } = await supabase.from('agendamentos').update({ status_id: tempStatusId, crm_responsavel: actionCrm }).eq('id', selectedAgendamento.id);
        if (error) throw error;

        if (tempStatusId === 6) {
           const examesParaAmbulatorio = selectedAgendamento.procedimentos && selectedAgendamento.procedimentos.length > 0 ? selectedAgendamento.procedimentos : ['Avaliação pós-PA'];
           await supabase.from('encaminhamentos_ambulatorio').insert([{
             numero_atendimento: selectedAgendamento.numero_atendimento || '',
             nome_paciente: selectedAgendamento.nome_paciente,
             telefone_paciente: selectedAgendamento.telefone_paciente,
             plano_saude: '',
             exames_especialidades: examesParaAmbulatorio,
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
    if (!isValidCrm(actionCrm)) { setErrorMsg("Favor preencher um CRM válido (4 ou 5 números)."); return; }

    try {
      const dataStr = format(reagendarDate, 'yyyy-MM-dd');
      const horaStr = format(reagendarTime, 'HH:mm');
      const novoDiagnostico = (selectedAgendamento?.diagnostico || '') + `\n[Reagendado em ${format(new Date(), 'dd/MM')}]: ${reagendarMotivo || 'Sem motivo informado.'}`;

      const { error } = await supabase.from('agendamentos').update({
        data_agendamento: dataStr, hora_agendamento: horaStr, diagnostico: novoDiagnostico, status_id: 2, crm_responsavel: actionCrm 
      }).eq('id', selectedAgendamento!.id);

      if (error) throw error;
      
      setShowToast({ visible: true, message: 'Reagendado com sucesso!' });
      setSelectedAgendamento(null);
      fetchAgendamentos();
      
      // Atualiza a inteligência do Hook para garantir que a grade estará correta depois
      refreshBookedTimes();
      
    } catch (error) { setErrorMsg("Erro ao salvar reagendamento no banco. Tente novamente."); }
  };

  const toggleProcedimentoEdit = (opcao: string) => {
    setEditForm(prev => {
        const jaExiste = prev.procedimentos.includes(opcao);
        return { ...prev, procedimentos: jaExiste ? prev.procedimentos.filter(p => p !== opcao) : [...prev.procedimentos, opcao] };
    });
  };

  const confirmarEdicao = async () => {
     setErrorMsg('');
     if (!selectedAgendamento) return;
     if (!isValidCrm(editForm.crm_responsavel)) { setErrorMsg("Favor preencher um CRM válido (4 ou 5 números)."); return; }

     try {
       const { error } = await supabase.from('agendamentos').update({
           numero_atendimento: editForm.numero_atendimento,
           nome_paciente: editForm.nome,
           telefone_paciente: editForm.telefone,
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

      <div className="flex items-center gap-6 mb-8 border-b border-gray-200 dark:border-slate-800 px-2">
        <Link to="/novo" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/novo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'}`}>Novo Agendamento</Link>
        <Link to="/agenda" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/agenda' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'}`}>Ver Agenda</Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest mb-2">
           <Activity size={16} /> Módulo: Pronto Atendimento
        </div>
        <Title className="mb-2">Agenda de Retornos</Title>
        <Description>Gerencie os retornos agendados da fila do PA.</Description>
      </div>

      <Card className="mb-8 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-1/3">
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome, telefone, nº ou CRM..." icon={<Search size={18} />} className="!h-10" />
          </div>
          <div className="flex items-center gap-2 lg:w-1/3">
            <div className="relative flex-1">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={16} />
                <DatePicker selected={dataInicio} onChange={(date: Date | null) => setDataInicio(date)} locale="pt-BR" dateFormat="dd/MM/yyyy" placeholderText="Início" className="custom-datepicker-input !h-10 !text-sm !pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" onFocus={(e) => e.target.blur()} />
            </div>
            <span className="text-gray-400 text-sm">até</span>
            <div className="relative flex-1">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={16} />
                <DatePicker selected={dataFim} onChange={(date: Date | null) => setDataFim(date)} locale="pt-BR" dateFormat="dd/MM/yyyy" placeholderText="Fim" className="custom-datepicker-input !h-10 !text-sm !pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" onFocus={(e) => e.target.blur()} />
            </div>
          </div>
          <div className="relative w-full lg:w-1/3">
              <ListChecks className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none bg-white dark:bg-slate-800 dark:text-slate-200 h-10 shadow-sm transition-all">
                  <option value="padrao">Padrão (Pendentes)</option>
                  <option value="todos_ativos">Todos Ativos</option>
                  {Object.entries(STATUS_CONFIG).map(([id, config]) => (<option key={id} value={id}>{config.label}</option>))}
              </select>
          </div>
        </div>
      </Card>

      {loading ? <div className="text-center py-20 text-gray-500 dark:text-slate-400">Carregando...</div> : 
        agendamentosFiltrados.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
            <h3 className="text-gray-600 dark:text-slate-300 font-medium">Nenhum agendamento encontrado</h3>
            <button onClick={limparFiltros} className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center justify-center gap-2 mx-auto mt-2"><RefreshCw size={16} /> Limpar Filtros</button>
          </div>
        ) : (
        <div className="space-y-8">
          {Object.entries(grupos).map(([data, itens]) => (
            <div key={data} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 mb-4 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg w-full border border-blue-100 dark:border-blue-900/30 shadow-sm">
                <CalendarIcon className="text-blue-600 dark:text-blue-400" size={18} />
                <h2 className="font-bold text-gray-800 dark:text-slate-200 capitalize text-sm">
                    {isToday(parseISO(data)) ? 'Hoje' : isTomorrow(parseISO(data)) ? 'Amanhã' : format(parseISO(data), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {itens.map((item) => {
                  const statusInfo = STATUS_CONFIG[item.status_id] || STATUS_CONFIG[1];
                  return (
                    <AtendimentoCard
                      key={item.id}
                      id={item.id}
                      badgeTopLeft={item.hora_agendamento}
                      badgeTopRight={statusInfo.label}
                      badgeTopRightColorClasses={`${statusInfo.color} ${statusInfo.border}`}
                      numeroAtendimento={item.numero_atendimento}
                      nomePaciente={item.nome_paciente}
                      telefone={item.telefone_paciente}
                      crm={item.crm_responsavel}
                      tagsLabel="Procedimentos"
                      tags={item.procedimentos || []}
                      onClick={() => abrirModal(item)}
                      indicadorCor={statusInfo.color.split(' ')[0]} 
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAgendamento && viewMode === 'details' && (
        <ModalDetalhesLayout 
          isOpen={true}
          onClose={() => setSelectedAgendamento(null)}
          title={
            <div className="flex items-center gap-2">
              <span className="line-clamp-1 dark:text-slate-100">{selectedAgendamento.nome_paciente}</span>
              {selectedAgendamento.status?.agrupamento === 'pendente' && podeEditarPA && (
                <button onClick={() => setViewMode('edit')} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 rounded-lg"><Edit size={18} /></button>
              )}
            </div>
          }
          infoBoxes={[
            { label: 'Data', value: format(parseISO(selectedAgendamento.data_agendamento), 'dd/MM'), theme: 'blue' },
            { label: 'Hora', value: selectedAgendamento.hora_agendamento, theme: 'blue' },
            { label: 'Atendimento', value: `#${selectedAgendamento.numero_atendimento}`, theme: 'blue' }
          ]}
          statusLabel={STATUS_CONFIG[selectedAgendamento.status_id]?.label || 'Desconhecido'}
          statusClasses={{ color: STATUS_CONFIG[selectedAgendamento.status_id]?.color, border: STATUS_CONFIG[selectedAgendamento.status_id]?.border }}
          tagsLabel="Procedimentos"
          tags={selectedAgendamento.procedimentos || []}
          phoneForWhats={podeWhatsAppPA ? selectedAgendamento.telefone_paciente : undefined}
          obsLabel="Diagnóstico / Condutas"
          obsText={selectedAgendamento.diagnostico || 'Sem observações.'}
          actionButtons={
            selectedAgendamento.status?.agrupamento === 'pendente' ? (
              <>
                {podeAtualizarStatusPA && <Button variant="primary" fullWidth onClick={() => setViewMode('update_status')}><CheckCircle2 size={18} /> Atualizar Status</Button>}
                {podeReagendarPA && <Button variant="warning" fullWidth onClick={() => { setViewMode('reschedule'); setReagendarDate(new Date()); }}><AlertTriangle size={18} /> Reagendar</Button>}
              </>
            ) : undefined
          }
          footerButtons={
            selectedAgendamento.status?.agrupamento === 'pendente' && podeCancelarPA ? (
              <Button variant="ghostDanger" fullWidth onClick={() => { setTempStatusId(3); setViewMode('confirm_cancel'); }}>Cancelar agendamento</Button>
            ) : undefined
          }
        />
      )}

      {selectedAgendamento && viewMode === 'update_status' && (
        <ModalAtualizarStatusLayout isOpen={true} onClose={() => setViewMode('details')} nomePaciente={selectedAgendamento.nome_paciente} theme="blue">
          <div className="flex flex-col gap-2">
            <Button variant="success" fullWidth justify="start" onClick={() => solicitarAtualizacaoStatus(5)}><CheckCircle2 size={18}/> Finalizado</Button>
            <Button variant="purple" fullWidth justify="start" onClick={() => solicitarAtualizacaoStatus(6)}><ArrowRightCircle size={18}/> Encaminhado ao Ambulatório</Button>
            <Button variant="indigo" fullWidth justify="start" onClick={() => solicitarAtualizacaoStatus(7)}><Stethoscope size={18}/> Retorno ao PA</Button>
            {selectedAgendamento?.status_id === 2 && (<Button variant="secondary" fullWidth justify="start" onClick={() => solicitarAtualizacaoStatus(4)}><AlertCircle size={18}/> Não respondeu após reagendamento</Button>)}
          </div>
        </ModalAtualizarStatusLayout>
      )}

      {selectedAgendamento && viewMode === 'confirm_status_update' && tempStatusId && (
        <ModalConfirmacaoStatusLayout isOpen={true} onClose={() => setViewMode('update_status')} onConfirm={executarAtualizacaoStatus} nomePaciente={selectedAgendamento.nome_paciente} statusNome={STATUS_CONFIG[tempStatusId]?.label || "Finalizado"} tipoStatus={tempStatusId === 5 ? "sucesso" : "neutro"} errorMsg={errorMsg} customInput={<Input label="Seu CRM (Obrigatório)" value={actionCrm} onChange={(e) => setActionCrm(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Apenas números" icon={<Stethoscope size={18} />} />} />
      )}

      {selectedAgendamento && viewMode === 'edit' && (
        <Modal isOpen={true} onClose={() => setViewMode('details')} title={<span className="text-blue-600 dark:text-blue-400">Editando dados</span>}>
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
               <Input label="Nº Atendimento" value={editForm.numero_atendimento} onChange={e => setEditForm({ ...editForm, numero_atendimento: e.target.value.replace(/\D/g, '') })} icon={<Hash size={18} />} maxLength={10} />
               <Input label="Nome do Paciente" value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: capitalizeName(e.target.value) })} icon={<User size={18} />} />
               <Input label="Telefone / WhatsApp" value={editForm.telefone} onChange={e => setEditForm({ ...editForm, telefone: maskPhone(e.target.value) })} icon={<Phone size={18} />} maxLength={15} />
               <Textarea label="Diagnóstico / Condutas" value={editForm.diagnostico} onChange={e => setEditForm({ ...editForm, diagnostico: e.target.value })} rows={3} />
               <ProcedimentosSelector opcoes={OPCOES_PROCEDIMENTOS} selecionados={editForm.procedimentos} onToggle={toggleProcedimentoEdit} />
               <Input label="Seu CRM (Obrigatório para salvar)" value={editForm.crm_responsavel} onChange={e => setEditForm({ ...editForm, crm_responsavel: e.target.value.replace(/\D/g, '').slice(0, 5) })} icon={<Stethoscope size={18} />} placeholder="Apenas números" />
               {errorMsg && (<div className="mb-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={18} /><span className="font-semibold">{errorMsg}</span></div>)}
               <div className="flex gap-2 pt-2"><Button variant="secondary" fullWidth onClick={() => setViewMode('details')}>Cancelar</Button><Button variant="primary" fullWidth onClick={confirmarEdicao}>Salvar Dados</Button></div>
            </div>
        </Modal>
      )}

      {selectedAgendamento && viewMode === 'reschedule' && (
        <Modal isOpen={true} onClose={() => setViewMode('details')} title={<span className="text-orange-600 dark:text-orange-400">Reagendamento</span>} maxWidth="2xl">
           <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
{/* AVISO DE INSTRUÇÃO COM BRILHO NO MODO DARK */}
<div className="bg-orange-50 dark:bg-orange-500/10 p-4 rounded-xl border border-orange-100 dark:border-orange-500/30 shadow-sm dark:shadow-[0_0_15px_rgba(249,115,22,0.1)]">
    <p className="text-sm text-orange-800 dark:text-orange-400 text-center font-bold tracking-wide uppercase">
        Selecione a nova data e horário
    </p>
</div>              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nova Data</label>
                      <div className="relative">
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={20} />
                          <DatePicker selected={reagendarDate} onChange={(d: Date | null) => setReagendarDate(d)} minDate={new Date()} locale="pt-BR" dateFormat="dd/MM/yyyy" placeholderText="Selecione o dia" popperPlacement="bottom-start" className="w-full pl-10 pr-3 py-3 rounded-xl border shadow-sm outline-none focus:ring-4 focus:ring-blue-500/10 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200" onFocus={(e) => e.target.blur()} />
                      </div>
                  </div>
                  <div>
                     {!reagendarDate ? (
                        <div><label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Novo Horário</label><div className="h-10 flex items-center text-slate-400 text-sm italic">Selecione uma data primeiro.</div></div>
                     ) : (
                        <TimeSelector 
                          horarios={horariosDisponiveis} 
                          selectedTime={reagendarTime} 
                          onSelectTime={handleSelectRescheduleTime} 
                          checkIsDisabled={checkIsDisabled} 
                          isLoading={isLoadingHorarios} 
                          gridClassName="grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2" 
                        />
                     )}
                  </div>
              </div>
              <Textarea label="Motivo do Reagendamento" placeholder="Ex.: Paciente pediu para remarcar." value={reagendarMotivo} onChange={e => setReagendarMotivo(e.target.value)} rows={2} />
              <Input label="Seu CRM (Obrigatório)" value={actionCrm} onChange={e => setActionCrm(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Apenas números" icon={<Stethoscope size={18} />} />
              {errorMsg && (<div className="mb-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={18} /><span className="font-semibold">{errorMsg}</span></div>)}
              <div className="flex gap-2 pt-2"><Button variant="secondary" className="flex-1" onClick={() => setViewMode('details')}>Voltar</Button><Button variant="warning" className="flex-1" onClick={confirmarReagendamento}>Confirmar</Button></div>
           </div>
        </Modal>
      )}

      {selectedAgendamento && viewMode === 'confirm_cancel' && (
        <ModalConfirmacaoCancelamentoLayout isOpen={true} onClose={() => setViewMode('details')} onConfirm={() => { setTempStatusId(3); executarAtualizacaoStatus(); }} nomePaciente={selectedAgendamento.nome_paciente} tipoAtendimento="agendamento" customInput={<Input label="Seu CRM (Obrigatório)" value={actionCrm} onChange={(e) => setActionCrm(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Apenas números" icon={<Stethoscope size={18} />} />} errorMsg={errorMsg} />
      )}

      {showToast.visible && <Toast message={showToast.message} onClose={() => setShowToast({ visible: false, message: '' })} />}
    </div>
  );
}
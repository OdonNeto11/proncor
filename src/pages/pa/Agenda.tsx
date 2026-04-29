import React, { useState, useEffect } from 'react';
import { 
  Clock, CheckCircle2, Search, AlertTriangle, ListChecks, AlertCircle, 
  Activity, Stethoscope, ArrowRightCircle, HelpCircle
} from 'lucide-react';
import { format, addDays } from 'date-fns'; // <-- addDays IMPORTADO AQUI
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

// COMPONENTES UI
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState'; 
import { Title, Description } from '../../components/ui/Typography'; 

// COMPONENTES SHARED
import { PageHeader } from '../../components/shared/PageHeader'; 
import { DateGroupHeader } from '../../components/shared/DateGroupHeader'; 
import { DateRangeFilter } from '../../components/shared/DateRangeFilter'; 
import { AtendimentoCard } from '../../components/shared/AtendimentoCard';

// HOOKS
import { usePermissoes } from '../../hooks/usePermissoes';

// NOVOS MODAIS COMPONENTIZADOS
import { ModalDetalhes } from './modais/ModalDetalhes';
import { ModalEdicao } from './modais/ModalEdicao';
import { ModalReagendar } from './modais/ModalReagendar';
import { ModalAtualizaStatus } from './modais/ModalAtualizaStatus';

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

type ModalView = 'details' | 'edit' | 'reschedule' | 'update_status' | 'cancel' | null;

export function Agenda() {
  const { user } = useAuth();
  const { podeVerPA, podeEditarPA, podeAtualizarStatusPA, podeReagendarPA, podeCancelarPA, podeWhatsAppPA } = usePermissoes();

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('padrao'); 
  
  // <-- LÓGICA DE D+30 CORRIGIDA AQUI -->
  const [dataInicio, setDataInicio] = useState<Date | null>(new Date()); 
  const [dataFim, setDataFim] = useState<Date | null>(addDays(new Date(), 30)); 

  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [viewMode, setViewMode] = useState<ModalView>(null);

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

  const agendamentosFiltrados = agendamentos.filter(ag => {
    const termo = busca.toLowerCase();
    const matchNome = ag.nome_paciente?.toLowerCase().includes(termo);
    const telefoneLimpoBanco = ag.telefone_paciente?.replace(/\D/g, '') || '';
    const termoLimpoBusca = termo.replace(/\D/g, '');
    const matchTelefone = ag.telefone_paciente?.includes(termo) || (termoLimpoBusca.length > 0 && telefoneLimpoBanco.includes(termoLimpoBusca));
    const matchNumero = ag.numero_atendimento?.toLowerCase().includes(termo);
    const matchCrm = ag.crm_responsavel?.toLowerCase().includes(termo);

    let matchStatus = true;
    const agrupamento = ag.status?.agrupamento?.toLowerCase() || '';
    
    let statusIdNum = Number(ag.status_id);
    if (!statusIdNum || isNaN(statusIdNum) || statusIdNum === 0) {
        statusIdNum = 1;
    }

    if (filtroStatus === 'padrao') {
        matchStatus = agrupamento.includes('pendent') || statusIdNum === 1 || statusIdNum === 2; 
    } 
    else if (filtroStatus === 'todos_ativos') {
        matchStatus = statusIdNum !== 3; 
    } 
    else if (filtroStatus !== '') {
        matchStatus = statusIdNum === Number(filtroStatus);
    }

    return (matchNome || matchTelefone || matchNumero || matchCrm) && matchStatus;
  });

  const grupos = agendamentosFiltrados.reduce((acc, curr) => {
    (acc[curr.data_agendamento] = acc[curr.data_agendamento] || []).push(curr); return acc;
  }, {} as Record<string, Agendamento[]>);

  const abrirModalDetalhes = (item: Agendamento) => {
    setSelectedAgendamento(item);
    setViewMode('details');
  };

  const limparFiltros = () => {
    setDataInicio(new Date()); 
    setDataFim(addDays(new Date(), 30)); // <-- LÓGICA DE D+30 CORRIGIDA NO CLEAR AQUI
    setFiltroStatus('padrao');
    setBusca('');
  };

  const handleSuccessAction = () => {
    setViewMode(null); 
    setSelectedAgendamento(null);
    fetchAgendamentos(); 
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">

      <div className="flex items-center gap-6 mb-8 border-b border-gray-200 dark:border-slate-800 px-2">
        <Link to="/novo" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/novo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'}`}>Novo Agendamento</Link>
        <Link to="/agenda" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/agenda' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'}`}>Ver Agenda</Link>
      </div>

      <PageHeader 
        module="Pronto Atendimento"
        title="Agenda de Retornos"
        description="Gerencie os retornos agendados da fila do PA."
        icon={Activity}
        themeColor="blue"
      />

<Card className="mb-8 p-4">
        <DateRangeFilter 
          searchValue={busca}
          onSearchChange={setBusca}
          searchPlaceholder="Nome, telefone, nº ou CRM..."
          startDate={dataInicio}
          endDate={dataFim}
          onStartDateChange={setDataInicio}
          onEndDateChange={setDataFim}
          statusValue={filtroStatus}
          onStatusChange={setFiltroStatus}
          statusOptions={[
            { value: 'padrao', label: 'Padrão (Pendentes)' },
            { value: 'todos_ativos', label: 'Todos Ativos' },
            ...Object.entries(STATUS_CONFIG).map(([id, config]) => ({ value: id, label: config.label }))
          ]}
        />
      </Card>

      {loading ? <div className="text-center py-20 text-gray-500 dark:text-slate-400 font-bold">Carregando...</div> : 
        agendamentosFiltrados.length === 0 ? (
          <EmptyState 
            message="Nenhum agendamento encontrado para os filtros selecionados."
            icon={Search}
            onAction={limparFiltros}
          />
        ) : (
        <div className="space-y-8">
          {Object.entries(grupos).map(([data, itens]) => (
            <div key={data} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <DateGroupHeader date={data} theme="blue" />
              
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
                      onClick={() => abrirModalDetalhes(item)}
                      indicadorCor={statusInfo.color.split(' ')[0]} 
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE DETALHES COMPONENTIZADO */}
      <ModalDetalhes 
        isOpen={viewMode === 'details'}
        onClose={() => { setViewMode(null); setSelectedAgendamento(null); }}
        agendamento={selectedAgendamento}
        podeEditar={podeEditarPA}
        podeAtualizar={podeAtualizarStatusPA}
        podeReagendar={podeReagendarPA}
        podeCancelar={podeCancelarPA}
        podeWhatsApp={podeWhatsAppPA}
        onAction={(mode) => setViewMode(mode)}
      />

      <ModalEdicao 
        isOpen={viewMode === 'edit'} 
        onClose={() => setViewMode('details')} 
        agendamento={selectedAgendamento} 
        onSuccess={handleSuccessAction} 
      />

      <ModalReagendar 
        isOpen={viewMode === 'reschedule'} 
        onClose={() => setViewMode('details')} 
        agendamento={selectedAgendamento} 
        onSuccess={handleSuccessAction} 
      />

      <ModalAtualizaStatus 
        isOpen={viewMode === 'update_status'} 
        onClose={() => setViewMode('details')} 
        agendamento={selectedAgendamento} 
        onSuccess={handleSuccessAction} 
      />

      <ModalAtualizaStatus 
        isOpen={viewMode === 'cancel'} 
        onClose={() => setViewMode('details')} 
        agendamento={selectedAgendamento} 
        onSuccess={handleSuccessAction} 
        statusDireto={3} 
      />

    </div>
  );
}
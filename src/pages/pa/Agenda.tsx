import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, CheckCircle2, Search, AlertTriangle, ListChecks, AlertCircle, 
  Activity, Stethoscope, ArrowRightCircle, HelpCircle
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Agendamento } from '../../types/agendamento';
import { STATUS_CONFIG } from '../../constants/status';
import { agendamentoService } from '../../services/agendamentoService';

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
import { useFiltrosAgenda } from '../../hooks/useFiltrosAgenda';

// IMPORT DA TELA GLOBAL DE ACESSO RESTRITO
import { AcessoRestrito } from '../core/AcessoRestrito';

// NOVOS MODAIS COMPONENTIZADOS
import { ModalDetalhes } from './modais/ModalDetalhes';
import { ModalEdicao } from './modais/ModalEdicao';
import { ModalReagendar } from './modais/ModalReagendar';
import { ModalAtualizaStatus } from './modais/ModalAtualizaStatus';

type ModalView = 'details' | 'edit' | 'reschedule' | 'update_status' | 'cancel' | null;

export function Agenda() {
  const { user } = useAuth();
  const location = useLocation();
  const { podeVerPA, podeEditarPA, podeAtualizarStatusPA, podeReagendarPA, podeCancelarPA, podeWhatsAppPA } = usePermissoes();

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  const { filtros, limparFiltros, agendamentosFiltrados, grupos } = useFiltrosAgenda(agendamentos);
  const { busca, setBusca, filtroStatus, setFiltroStatus, dataInicio, setDataInicio, dataFim, setDataFim } = filtros;

  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [viewMode, setViewMode] = useState<ModalView>(null);

  // === SOLUÇÃO AQUI: RETORNA O COMPONENTE GLOBAL SE NÃO TIVER PERMISSÃO ===
  if (!podeVerPA) {
    return <AcessoRestrito />;
  }

  const fetchAgendamentos = async () => {
    setLoading(true);
    try {
      const inicioStr = dataInicio ? format(dataInicio, 'yyyy-MM-dd') : '';
      const fimStr = dataFim ? format(dataFim, 'yyyy-MM-dd') : '';

      const data = await agendamentoService.fetchAgendamentos(inicioStr, fimStr);
      setAgendamentos(data);
    } catch (error) { console.error('Erro:', error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAgendamentos(); }, [dataInicio, dataFim]);

  const abrirModalDetalhes = (item: Agendamento) => {
    setSelectedAgendamento(item);
    setViewMode('details');
  };

  const handleSuccessAction = () => {
    setViewMode(null); 
    setSelectedAgendamento(null);
    fetchAgendamentos(); 
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">

      <div className="flex items-center gap-6 mb-8 border-b border-gray-200 dark:border-slate-800 px-2">
        <Link to="/novo" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${location.pathname === '/novo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'}`}>Novo Agendamento</Link>
        <Link to="/agenda" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${location.pathname === '/agenda' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'}`}>Ver Agenda</Link>
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
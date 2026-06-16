import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, CheckCircle2, AlertCircle, 
  HelpCircle, XCircle, Edit, Hash, User, Phone, ShieldOff, FileText, Activity, Download 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ambulatorioService } from '../../services/ambulatorioService';
import { EncaminhamentoAmbulatorio } from '../../types/ambulatorio';
import { STATUS_CONFIG_AMB } from '../../constants/status';

// COMPONENTES PADRONIZADOS
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { ToastError } from '../../components/ui/ToastError';
import { Title, Description } from '../../components/ui/Typography';

// COMPONENTES COMPARTILHADOS E MODAIS
import { AtendimentoCard } from '../../components/shared/AtendimentoCard';
import { ModalConfirmacaoCancelamentoLayout } from '../../components/shared/ModalConfirmacaoCancelamentoLayout';
import { DateRangeFilter } from '../../components/shared/DateRangeFilter'; 

// IMPORT DA TELA GLOBAL DE ACESSO RESTRITO
import { AcessoRestrito } from '../core/AcessoRestrito';

// IMPORTAÇÃO DOS MODAIS SEPARADOS
import { ModalEdicaoAmb } from './modais/ModalEdicaoAmb';
import { ModalStatusExames } from './modais/ModalStatusExames';
import { ModalDetalhesAmb } from './modais/ModalDetalhesAmb';

// FUNÇÕES UTILITÁRIAS E PERMISSÕES
import { usePermissoes } from '../../hooks/usePermissoes';
import { useFiltrosAmbulatorio } from '../../hooks/useFiltrosAmbulatorio';

export function Ambulatorio() {
  const { podeVerAmb, podeCriarAmb, podeGerenciarStatusAmb, podeEditarAmb, podeCancelarAmb } = usePermissoes();
  const navigate = useNavigate();

  const [lista, setLista] = useState<EncaminhamentoAmbulatorio[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ESTADOS DO FILTRO PADRONIZADO
  const { filtros, listaFiltrada } = useFiltrosAmbulatorio(lista);
  const { busca, setBusca, filtroTab, setFiltroTab, dataInicio, setDataInicio, dataFim, setDataFim } = filtros;
  
  const [selectedEnc, setSelectedEnc] = useState<EncaminhamentoAmbulatorio | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'details' | 'edit' | 'confirm_cancel' | 'agendar_exames'>('list');
  const [showToast, setShowToast] = useState({ visible: false, message: '' });
  const [errorMsg, setErrorMsg] = useState(''); 

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedEnc) {
        if (viewMode === 'details') {
          setSelectedEnc(null);
        } else {
          setViewMode('details');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEnc, viewMode]);

  const fetchEncaminhamentos = async () => {
    if (!podeVerAmb) return; 
    setLoading(true);
    try {
      const statusMap: Record<string, number[]> = { 
        pendentes: [13, 1], 
        sucesso: [9, 5, 14], 
        perdidos: [3, 10, 11, 12],
        todos: [] 
      };

      const dataInicioStr = dataInicio ? format(dataInicio, 'yyyy-MM-dd') : undefined;
      const dataFimStr = dataFim ? format(dataFim, 'yyyy-MM-dd') : undefined;

      const data = await ambulatorioService.fetchEncaminhamentos(
        statusMap[filtroTab] || [],
        dataInicioStr,
        dataFimStr
      );
      setLista(data);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (podeVerAmb) fetchEncaminhamentos(); 
  }, [filtroTab, dataInicio, dataFim, podeVerAmb]);

  const atualizarStatus = async (novoStatusId: number, msg: string) => {
    try {
      await ambulatorioService.updateStatus(selectedEnc!.id, novoStatusId);
      setShowToast({ visible: true, message: msg });
      setViewMode('list');
      setSelectedEnc(null);
      fetchEncaminhamentos();
    } catch (error) {
      setErrorMsg('Falha de comunicação com o banco ao atualizar o status global.');
    }
  };

  const abrirDetalhes = (item: EncaminhamentoAmbulatorio) => {
    setSelectedEnc(item);
    setViewMode('details');
    setErrorMsg('');
  };

  // === SOLUÇÃO AQUI: RETORNA O COMPONENTE GLOBAL SE NÃO TIVER PERMISSÃO ===
  if (!podeVerAmb) {
    return <AcessoRestrito />;
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20 relative">
      
      <div className="flex items-center gap-6 mb-8 border-b border-slate-200 dark:border-slate-800 px-2">
        {podeCriarAmb && (
          <Link to="/novo-ambulatorio" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/novo-ambulatorio' ? 'border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            Novo Encaminhamento
          </Link>
        )}
        
        {podeVerAmb && (
          <Link to="/ambulatorio" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/ambulatorio' ? 'border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            Fila/Pendentes
          </Link>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-widest mb-2">
           <Activity size={16} /> Módulo: Ambulatório
        </div>
        <Title className="mb-2">Fila do Ambulatório</Title>
        <Description>Gerencie as solicitações de exames e consultas.</Description>
      </div>

      <Card className="mb-8 p-4">
        {/* COMPONENTE DE FILTRO PADRONIZADO */}
        <DateRangeFilter 
          searchValue={busca}
          onSearchChange={setBusca}
          searchPlaceholder="Paciente, atendimento ou CRM..."
          startDate={dataInicio}
          endDate={dataFim}
          onStartDateChange={setDataInicio}
          onEndDateChange={setDataFim}
          statusValue={filtroTab}
          onStatusChange={setFiltroTab}
          statusOptions={[
            { value: 'pendentes', label: 'Pendentes' },
            { value: 'sucesso', label: 'Agendados/Concluídos' },
            { value: 'perdidos', label: 'Perdidos' },
            { value: 'todos', label: 'Todos' }
          ]}
        />
      </Card>

      {loading ? (
        <div className="text-center py-20 font-bold"><Description>Buscando registros...</Description></div>
      ) : listaFiltrada.length === 0 ? (
        <Card className="text-center py-20 border-dashed border-slate-300 dark:border-slate-700 shadow-none bg-transparent">
            <AlertCircle size={48} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <Description className="font-medium">Nenhum registro encontrado para esta aba.</Description>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listaFiltrada.map((item: EncaminhamentoAmbulatorio) => {
            const statusConfig = STATUS_CONFIG_AMB[item.status_id] || STATUS_CONFIG_AMB[13];
            return (
              <AtendimentoCard 
                key={item.id}
                id={item.id}
                onClick={() => abrirDetalhes(item)}
                indicadorCor={statusConfig.color.split(' ')[0].replace('bg-', 'bg-opacity-100 bg-')} 
                badgeTopLeft={format(parseISO(item.created_at), "dd MMM · HH:mm", { locale: ptBR })}
                badgeTopRight={statusConfig.label}
                badgeTopRightColorClasses={`${statusConfig.color} ${statusConfig.border}`}
                numeroAtendimento={item.numero_atendimento}
                nomePaciente={item.nome_paciente || 'Nome não informado'}
                telefone={item.telefone_paciente}
                planoSaude={item.plano_saude}
                crm={item.crm_solicitante}
                origem={item.origem} 
                tagsLabel="Exames/Especialidades"
                tags={item.exames_especialidades || []}
              />
            );
          })}
        </div>
      )}

      {/* MODAL DE DETALHES REFATORADO */}
      {selectedEnc && viewMode === 'details' && (
        <ModalDetalhesAmb 
          isOpen={true}
          onClose={() => setSelectedEnc(null)}
          encaminhamento={selectedEnc}
          statusConfig={STATUS_CONFIG_AMB[selectedEnc.status_id] || STATUS_CONFIG_AMB[13]}
          onEdit={() => setViewMode('edit')}
          onUpdateStatus={() => setViewMode('agendar_exames')}
          onCancel={() => setViewMode('confirm_cancel')}
        />
      )}

      {/* MODAL DE EDIÇÃO */}
      {selectedEnc && viewMode === 'edit' && (
        <ModalEdicaoAmb
          isOpen={true}
          onClose={() => setViewMode('details')}
          encaminhamento={selectedEnc}
          onSuccess={() => {
            setShowToast({ visible: true, message: 'Dados atualizados com sucesso!' });
            setViewMode('details');
            fetchEncaminhamentos();
          }}
        />
      )}

{/* MODAL DE STATUS DE EXAMES */}
{selectedEnc && viewMode === 'agendar_exames' && (
  <ModalStatusExames
    isOpen={true}
    onClose={() => setViewMode('details')}
    encaminhamento={selectedEnc}
    onSuccess={(message?: string) => {
      // Este encerra o fluxo completo, mantemos o comportamento original
      if (message) setShowToast({ visible: true, message });
      setViewMode('list'); 
      setSelectedEnc(null);
      fetchEncaminhamentos();
    }}
    onSaveProgress={() => {
      // MANTEMOS O MODAL ABERTO:
      // Apenas atualizamos a lista de dados silenciosamente
      fetchEncaminhamentos(); 
      // O Toast de sucesso aparecerá via componente filho (ModalStatusExames)
    }}
  />
)}

      {/* MODAL DE CANCELAMENTO */}
      {selectedEnc && viewMode === 'confirm_cancel' && (
        <ModalConfirmacaoCancelamentoLayout 
          isOpen 
          onClose={() => setViewMode('details')} 
          onConfirm={() => atualizarStatus(3, 'Cancelado.')} 
          nomePaciente={selectedEnc.nome_paciente || 'Nome não informado'} 
          tipoAtendimento="encaminhamento" 
        />
      )}

      {showToast.visible && <Toast message={showToast.message} onClose={() => setShowToast({ ...showToast, visible: false })} />}
      <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />
    </div>
  );
}
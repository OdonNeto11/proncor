import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, CheckCircle2, AlertCircle, 
  HelpCircle, XCircle, Edit, Hash, User, Phone, ShieldOff, FileText, Activity, Download 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';

// COMPONENTES PADRONIZADOS
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { ToastError } from '../../components/ui/ToastError';
import { Title, Description } from '../../components/ui/Typography';

// COMPONENTES COMPARTILHADOS E MODAIS
import { AtendimentoCard } from '../../components/shared/AtendimentoCard';
import { ModalConfirmacaoCancelamentoLayout } from '../../components/shared/ModalConfirmacaoCancelamentoLayout';
import { DateRangeFilter } from '../../components/shared/DateRangeFilter'; // NOVO IMPORT

// IMPORTAÇÃO DOS MODAIS SEPARADOS
import { ModalEdicaoAmb } from './modais/ModalEdicaoAmb';
import { ModalStatusExames } from './modais/ModalStatusExames';
import { ModalDetalhesAmb } from './modais/ModalDetalhesAmb';

// FUNÇÕES UTILITÁRIAS E PERMISSÕES
import { usePermissoes } from '../../hooks/usePermissoes';

const STATUS_CONFIG_AMB: Record<number, { label: string, color: string, border: string, icon: any }> = {
  1: { label: 'Aguardando Atendimento', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800/50', icon: AlertCircle },
  13: { label: 'Aguardando Agendamento', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800/50', icon: AlertCircle },
  3: { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', border: 'border-red-200 dark:border-red-800/50', icon: XCircle },
  5: { label: 'Finalizado', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/50', icon: CheckCircle2 },
  9: { label: 'Agendado', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/50', icon: CheckCircle2 },
  10: { label: 'Plano não Atendido', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800/50', icon: ShieldOff },
  11: { label: 'Sem Especialidade', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800/50', icon: AlertCircle },
  12: { label: 'Sem Contato', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', icon: HelpCircle },
  14: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/50', icon: CheckCircle2 },
};

export function Ambulatorio() {
  const { podeVerAmb, podeCriarAmb, podeGerenciarStatusAmb, podeEditarAmb, podeCancelarAmb } = usePermissoes();
  const navigate = useNavigate();

  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ESTADOS DO FILTRO PADRONIZADO
  const [busca, setBusca] = useState('');
  const [filtroTab, setFiltroTab] = useState('pendentes');
  const [dataInicio, setDataInicio] = useState<Date | null>(null); // Vazio por padrão
  const [dataFim, setDataFim] = useState<Date | null>(null);       // Vazio por padrão
  
  const [selectedEnc, setSelectedEnc] = useState<any | null>(null);
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

      let query = supabase
        .from('encaminhamentos_ambulatorio')
        .select('*, status:status_id(*)')
        .order('created_at', { ascending: false });
      
      if (filtroTab !== 'todos') {
        query = query.in('status_id', statusMap[filtroTab]);
      }

      // LÓGICA DE FILTRO POR DATA (no banco de dados)
      if (dataInicio) {
        query = query.gte('created_at', format(dataInicio, 'yyyy-MM-dd') + 'T00:00:00');
      }
      if (dataFim) {
        query = query.lte('created_at', format(dataFim, 'yyyy-MM-dd') + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;
      setLista(data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (podeVerAmb) fetchEncaminhamentos(); 
  }, [filtroTab, dataInicio, dataFim, podeVerAmb]); // Adicionado datas na dependência

  const atualizarStatus = async (novoStatusId: number, msg: string) => {
    try {
      const { error } = await supabase
        .from('encaminhamentos_ambulatorio')
        .update({ status_id: novoStatusId, updated_at: new Date().toISOString() })
        .eq('id', selectedEnc.id);
      
      if (error) throw error;
      setShowToast({ visible: true, message: msg });
      setViewMode('list');
      setSelectedEnc(null);
      fetchEncaminhamentos();
    } catch (error) {
      setErrorMsg('Falha de comunicação com o banco ao atualizar o status global.');
    }
  };

  const abrirDetalhes = (item: any) => {
    setSelectedEnc(item);
    setViewMode('details');
    setErrorMsg('');
  };

  // O filtro de busca (texto) continua ocorrendo em memória no frontend
  const listaFiltrada = lista.filter(item => 
    (item.nome_paciente || '').toLowerCase().includes(busca.toLowerCase()) || 
    (item.numero_atendimento || '').includes(busca) ||
    (item.crm_solicitante || '').includes(busca)
  );

  if (!podeVerAmb) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm mt-8 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={48} className="text-red-400 dark:text-red-500" />
        </div>
        <Title className="mb-2">Acesso Negado</Title>
        <Description className="max-w-sm mx-auto">
          O seu perfil não tem permissão para visualizar a fila de pendentes do Ambulatório.
        </Description>
        <Link to="/" className="inline-block mt-8 px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          Voltar para Início
        </Link>
      </div>
    );
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
          {listaFiltrada.map((item: any) => {
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
                tags={item.exames_especialidades}
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
            if (message) setShowToast({ visible: true, message });
            setViewMode('list');
            setSelectedEnc(null);
            fetchEncaminhamentos();
          }}
          onSaveProgress={() => {
            setShowToast({ visible: true, message: 'Progresso salvo!' });
            setViewMode('list');
            setSelectedEnc(null);
            fetchEncaminhamentos();
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
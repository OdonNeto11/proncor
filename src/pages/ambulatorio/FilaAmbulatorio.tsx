import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, CheckCircle2, AlertCircle, 
  HelpCircle, XCircle, Edit, Hash, User, Phone, ShieldOff, FileText, Activity, AlertTriangle, Download 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';

// COMPONENTES PADRONIZADOS
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { Title, Description } from '../../components/ui/Typography';
import { DatePicker } from '../../components/ui/DatePicker'; 

// COMPONENTES COMPARTILHADOS
import { AtendimentoCard } from '../../components/shared/AtendimentoCard';
import { ModalDetalhesLayout } from '../../components/shared/ModalDetalhesLayout';
import { ModalConfirmacaoCancelamentoLayout } from '../../components/shared/ModalConfirmacaoCancelamentoLayout';
import { ModalAtualizarStatusLayout } from '../../components/shared/ModalAtualizarStatusLayout';
import { ModalConfirmacaoStatusLayout } from '../../components/shared/ModalConfirmacaoStatusLayout';

// FUNÇÕES UTILITÁRIAS E PERMISSÕES
import { maskPhone, capitalizeName } from '../../utils/formUtils';
import { usePermissoes } from '../../hooks/usePermissoes';

const STATUS_CONFIG_AMB: Record<number, { label: string, color: string, border: string, icon: any }> = {
  1: { label: 'Aguardando Atendimento', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800/50', icon: AlertCircle },
  13: { label: 'Aguardando Agendamento', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800/50', icon: AlertCircle },
  3: { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', border: 'border-red-200 dark:border-red-800/50', icon: XCircle },
  9: { label: 'Agendado', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/50', icon: CheckCircle2 },
  10: { label: 'Plano não Atendido', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800/50', icon: ShieldOff },
  11: { label: 'Sem Especialidade', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800/50', icon: AlertCircle },
  12: { label: 'Sem Contato', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', icon: HelpCircle },
};

export function Ambulatorio() {
  const { podeVerAmb, podeCriarAmb, podeGerenciarStatusAmb, podeEditarAmb, podeCancelarAmb } = usePermissoes();
  const navigate = useNavigate();

  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTab, setFiltroTab] = useState<'todos' | 'pendentes' | 'sucesso' | 'perdidos'>('pendentes');
  const [selectedEnc, setSelectedEnc] = useState<any | null>(null);
  
  const [viewMode, setViewMode] = useState<'list' | 'details' | 'edit' | 'update_status' | 'confirm_status' | 'confirm_cancel' | 'agendar_exames'>('list');
  
  const [statusSelecionado, setStatusSelecionado] = useState<{id: number, msg: string, label: string} | null>(null);
  const [examesAgendamento, setExamesAgendamento] = useState<any[]>([]);
  
  const [showToast, setShowToast] = useState({ visible: false, message: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const [editForm, setEditForm] = useState({ 
    numero_atendimento: '',
    nome_paciente: '', 
    telefone_paciente: '', 
    plano_saude: '',
    observacoes: ''
  });

  const fetchEncaminhamentos = async () => {
    if (!podeVerAmb) return; 
    setLoading(true);
    try {
      const statusMap = { 
        pendentes: [13, 1], 
        sucesso: [9], 
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
  }, [filtroTab, podeVerAmb]);

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
      setStatusSelecionado(null);
      fetchEncaminhamentos();
    } catch (error) {
      alert('Erro ao atualizar.');
    }
  };

  const prepararAgendamento = async () => {
    setViewMode('agendar_exames');
    try {
      const { data, error } = await supabase
        .from('encaminhamento_exames')
        .select('id, nome_customizado, data_agendamento, exames_especialidades(nome)')
        .eq('encaminhamento_id', selectedEnc.id);

      if (error) throw error;

      if (data && data.length > 0) {
        setExamesAgendamento(data.map(d => ({
          id: d.id,
          nome: (d.exames_especialidades as any)?.nome || d.nome_customizado || 'Exame/Especialidade',
          data_agendamento: d.data_agendamento || ''
        })));
      } else {
        setExamesAgendamento((selectedEnc.exames_especialidades || []).map((nome: string, idx: number) => ({
          id: `legacy-${idx}`,
          nome: nome,
          data_agendamento: ''
        })));
      }
    } catch (e) {
      console.error('Erro ao buscar exames do encaminhamento', e);
    }
  };

  const confirmarAgendamentoComDatas = async () => {
    try {
      const updates = examesAgendamento
        .filter(ex => typeof ex.id === 'number')
        .map(ex => 
          supabase.from('encaminhamento_exames')
            .update({ data_agendamento: ex.data_agendamento || null })
            .eq('id', ex.id)
        );
      
      await Promise.all(updates);
      await atualizarStatus(9, 'Datas registradas e agendamento confirmado!');
    } catch (error) {
      alert('Erro ao salvar as datas de agendamento.');
    }
  };

  const abrirDetalhes = (item: any) => {
    setSelectedEnc(item);
    setViewMode('details');
    setErrorMsg('');
    setStatusSelecionado(null);
    setEditForm({
      numero_atendimento: item.numero_atendimento || '',
      nome_paciente: item.nome_paciente || '',
      telefone_paciente: item.telefone_paciente || '',
      plano_saude: item.plano_saude || '',
      observacoes: item.observacoes || ''
    });
  };

  const confirmarEdicao = async () => {
    if (selectedEnc.atendido_proncor === false && (!editForm.nome_paciente || !editForm.telefone_paciente)) {
      setErrorMsg('Campos obrigatórios vazios.');
      return;
    }
    try {
      const { error } = await supabase
        .from('encaminhamentos_ambulatorio')
        .update({ ...editForm, updated_at: new Date().toISOString() })
        .eq('id', selectedEnc.id);

      if (error) throw error;
      setShowToast({ visible: true, message: 'Dados atualizados!' });
      setViewMode('list');
      setSelectedEnc(null);
      fetchEncaminhamentos();
    } catch (e) {
      setErrorMsg('Erro ao salvar.');
    }
  };

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
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      
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
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="w-full lg:flex-1">
            <Input 
              value={busca} 
              onChange={(e) => setBusca(e.target.value)} 
              placeholder="Buscar por paciente, atendimento ou CRM..." 
              icon={<Search size={18} />} 
              className="!h-10"
            />
          </div>
          <div className="flex w-full lg:w-auto bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-x-auto">
            {(['todos', 'pendentes', 'sucesso', 'perdidos'] as const).map((t) => (
              <button 
                key={t}
                onClick={() => setFiltroTab(t)} 
                className={`flex-1 lg:flex-none whitespace-nowrap px-6 py-2 rounded-lg text-sm font-bold transition-all ${filtroTab === t ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                {t === 'todos' ? 'Todos' : t === 'pendentes' ? 'Pendentes' : t === 'sucesso' ? 'Agendados' : 'Perdidos'}
              </button>
            ))}
          </div>
        </div>
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

      {selectedEnc && viewMode === 'details' && (
        <ModalDetalhesLayout 
          isOpen={true}
          onClose={() => setSelectedEnc(null)}
          title={
            <div className="flex items-center gap-2">
              <span className="line-clamp-1 dark:text-slate-100">{selectedEnc.nome_paciente || 'Nome não informado'}</span>
              {[13, 1].includes(selectedEnc.status_id) && podeEditarAmb && (
                <button onClick={() => setViewMode('edit')} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors">
                  <Edit size={18} />
                </button>
              )}
            </div>
          }
          infoBoxes={[
            { label: 'Solicitado em', value: format(parseISO(selectedEnc.created_at), "dd/MM · HH:mm"), theme: 'purple' },
            { label: 'Origem', value: selectedEnc.origem, theme: selectedEnc.origem === 'PA' ? 'blue' : 'slate' },
            { label: 'Atendimento', value: selectedEnc.numero_atendimento ? `#${selectedEnc.numero_atendimento}` : 'N/A', theme: 'slate' }
          ]}
          statusLabel={STATUS_CONFIG_AMB[selectedEnc.status_id]?.label}
          statusClasses={{ color: STATUS_CONFIG_AMB[selectedEnc.status_id]?.color, border: STATUS_CONFIG_AMB[selectedEnc.status_id]?.border }}
          tagsLabel="Exames"
          tags={selectedEnc.exames_especialidades}
          phoneForWhats={selectedEnc.telefone_paciente}
          obsText={selectedEnc.observacoes || 'Sem observações.'}
          
          actionButtons={
            <div className="flex flex-col gap-3 w-full">
              {selectedEnc.anexo_url && (
                <Button 
                  variant="secondary" 
                  fullWidth 
                  icon={<Download size={18} />} 
                  onClick={() => {
                    const { data } = supabase.storage.from('anexos').getPublicUrl(selectedEnc.anexo_url);
                    window.open(data.publicUrl, '_blank');
                  }}
                >
                  Ver / Baixar Anexo
                </Button>
              )}
              
              {[13, 1].includes(selectedEnc.status_id) && podeGerenciarStatusAmb && (
                <Button 
                  variant="primary" 
                  fullWidth 
                  icon={<CheckCircle2 size={18} />} 
                  onClick={() => setViewMode('update_status')}
                >
                  Atualizar Status
                </Button>
              )}

              {podeCancelarAmb && [1, 9, 13].includes(selectedEnc.status_id) && (
                <Button 
                  variant="textDanger" 
                  size="sm" 
                  fullWidth 
                  className="mt-1"
                  onClick={() => setViewMode('confirm_cancel')}
                >
                  Cancelar Pedido
                </Button>
              )}
            </div>
          }
        />
      )}

      {selectedEnc && viewMode === 'update_status' && (
        <ModalAtualizarStatusLayout 
          isOpen 
          onClose={() => setViewMode('details')} 
          nomePaciente={selectedEnc.nome_paciente || 'Nome não informado'} 
          theme="purple"
        >
          <div className="flex flex-col gap-3">
            <Button 
              variant="success" 
              fullWidth 
              justify="start" 
              icon={<CheckCircle2 size={18} />}
              onClick={prepararAgendamento}
            >
              Agendado
            </Button>
            
            <Button 
              variant="rose" 
              fullWidth 
              justify="start" 
              icon={<ShieldOff size={18} />}
              onClick={() => { setStatusSelecionado({ id: 10, msg: 'Plano não atendido registrado.', label: 'Não atendemos o plano' }); setViewMode('confirm_status'); }}
            >
              Não atendemos o plano
            </Button>

            <Button 
              variant="amber" 
              fullWidth 
              justify="start" 
              icon={<AlertCircle size={18} />}
              onClick={() => { setStatusSelecionado({ id: 11, msg: 'Falta de especialidade registrada.', label: 'Não temos a especialidade' }); setViewMode('confirm_status'); }}
            >
              Não temos a especialidade
            </Button>
            
            <Button 
              variant="secondary" 
              fullWidth 
              justify="start" 
              icon={<HelpCircle size={18} />}
              onClick={() => { setStatusSelecionado({ id: 12, msg: 'Falha de contato registrada.', label: 'Não conseguimos contato' }); setViewMode('confirm_status'); }}
            >
              Não conseguimos contato
            </Button>
          </div>
        </ModalAtualizarStatusLayout>
      )}

      {selectedEnc && viewMode === 'agendar_exames' && (
        <Modal isOpen onClose={() => setViewMode('update_status')} title={<span className="text-emerald-600 dark:text-emerald-500 font-bold text-lg">Datas de Agendamento</span>}>
          <div className="p-4 space-y-4 animate-in zoom-in-95 duration-200">
            <Description className="text-center mb-6">
              Informe a data em que cada procedimento foi agendado para <strong className="text-emerald-600 dark:text-emerald-400">{selectedEnc.nome_paciente || 'Nome não informado'}</strong>.
            </Description>

            <div className="space-y-3 min-h-[380px] overflow-visible pb-10">
              {examesAgendamento.map((exame, index) => (
                <div 
                  key={exame.id} 
                  className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 flex flex-col md:flex-row md:items-center gap-3 justify-between relative"
                  style={{ zIndex: 50 - index }} 
                >
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex-1">{exame.nome}</span>
                  <div className="w-full md:w-48 flex-shrink-0">
                    <DatePicker 
                      value={exame.data_agendamento} 
                      onChange={(e) => {
                        const novos = [...examesAgendamento];
                        novos[index].data_agendamento = e.target.value;
                        setExamesAgendamento(novos);
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-2">
              <Button variant="secondary" fullWidth onClick={() => setViewMode('update_status')}>Voltar</Button>
              <Button variant="success" fullWidth onClick={confirmarAgendamentoComDatas}>Confirmar Agendamento</Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedEnc && viewMode === 'confirm_status' && statusSelecionado && (
        <ModalConfirmacaoStatusLayout 
          isOpen={true}
          onClose={() => setViewMode('update_status')}
          onConfirm={() => atualizarStatus(statusSelecionado.id, statusSelecionado.msg)}
          nomePaciente={selectedEnc.nome_paciente || 'Nome não informado'}
          statusNome={statusSelecionado.label}
          tipoStatus={statusSelecionado.id === 9 ? 'sucesso' : 'neutro'}
          theme="purple"
        />
      )}

      {selectedEnc && viewMode === 'confirm_cancel' && (
        <ModalConfirmacaoCancelamentoLayout isOpen onClose={() => setViewMode('details')} onConfirm={() => atualizarStatus(3, 'Cancelado.')} nomePaciente={selectedEnc.nome_paciente || 'Nome não informado'} tipoAtendimento="encaminhamento" />
      )}

      {showToast.visible && <Toast message={showToast.message} onClose={() => setShowToast({ ...showToast, visible: false })} />}
    </div>
  );
}
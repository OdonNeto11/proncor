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
import { ToastError } from '../../components/ui/ToastError'; // PADRÃO CORRETO RESTAURADO
import { Title, Description } from '../../components/ui/Typography';
import { DatePicker } from '../../components/ui/DatePicker'; 

// COMPONENTES COMPARTILHADOS
import { AtendimentoCard } from '../../components/shared/AtendimentoCard';
import { ModalDetalhesLayout } from '../../components/shared/ModalDetalhesLayout';
import { ModalConfirmacaoCancelamentoLayout } from '../../components/shared/ModalConfirmacaoCancelamentoLayout';

// FUNÇÕES UTILITÁRIAS E PERMISSÕES
import { maskPhone, capitalizeName } from '../../utils/formUtils';
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
  const [busca, setBusca] = useState('');
  const [filtroTab, setFiltroTab] = useState<'todos' | 'pendentes' | 'sucesso' | 'perdidos'>('pendentes');
  const [selectedEnc, setSelectedEnc] = useState<any | null>(null);
  
  const [viewMode, setViewMode] = useState<'list' | 'details' | 'edit' | 'confirm_cancel' | 'agendar_exames'>('list');
  
  const [examesAgendamento, setExamesAgendamento] = useState<any[]>([]);
  
  const [showToast, setShowToast] = useState({ visible: false, message: '' });
  
  // ESTADOS DO NOVO PADRÃO DE ERRO
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState(''); 

  const [editForm, setEditForm] = useState({ 
    numero_atendimento: '',
    nome_paciente: '', 
    telefone_paciente: '', 
    plano_saude: '',
    observacoes: ''
  });

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
      const statusMap = { 
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
      fetchEncaminhamentos();
    } catch (error) {
      setErrorMsg('Falha de comunicação com o banco ao atualizar o status global.');
    }
  };

  const prepararAgendamento = async () => {
    setExamesAgendamento([]); 
    setErrors({});
    setErrorMsg('');
    setViewMode('agendar_exames');
    
    try {
      const { data, error } = await supabase
        .from('encaminhamento_exames')
        .select('id, nome_customizado, data_agendamento, status_id, exames_especialidades(nome)')
        .eq('encaminhamento_id', selectedEnc.id);

      if (error) throw error;

      if (data && data.length > 0) {
        setExamesAgendamento(data.map(d => ({
          id: d.id,
          nome: (d.exames_especialidades as any)?.nome || d.nome_customizado || 'Exame/Especialidade',
          data_agendamento: d.data_agendamento || '',
          status_id: d.status_id || ''
        })));
      } else {
        setExamesAgendamento((selectedEnc.exames_especialidades || []).map((nome: string, idx: number) => ({
          id: `legacy-${idx}`,
          nome: nome,
          data_agendamento: '',
          status_id: ''
        })));
      }
    } catch (e) {
      setErrorMsg('Erro ao buscar a lista de exames deste encaminhamento.');
    }
  };

const salvarAgendamentoExames = async (concluir: boolean) => {
    setErrors({});
    setErrorMsg('');
    
    const novosErros: Record<string, string> = {};
    let temErro = false;
    
    // Pega a data de hoje no formato yyyy-MM-dd
    const dataHoje = new Date().toISOString().split('T')[0];

    examesAgendamento.forEach((ex, index) => {
      // 1. Validação de Data (Roda sempre que o status for 9 - Agendado)
      if (Number(ex.status_id) === 9) {
        if (!ex.data_agendamento) {
          novosErros[`status_exame_${index}`] = 'Informe a data do agendamento';
          temErro = true;
        } else if (ex.data_agendamento < dataHoje) {
          novosErros[`status_exame_${index}`] = 'A data não pode ser no passado';
          temErro = true;
        }
      }

      // 2. Validação de Status (Roda APENAS se clicar em "Salvar e Concluir")
      if (concluir && !ex.status_id) {
        novosErros[`status_exame_${index}`] = 'Este campo é obrigatório para concluir';
        temErro = true;
      }
    });

    // Se encontrou qualquer erro (de data ou status vazio ao concluir), trava o salvamento
    if (temErro) {
      setErrors(novosErros);
      
      // Define a mensagem dinâmica dependendo do erro
      const faltouStatus = concluir && examesAgendamento.some(ex => !ex.status_id);
      setErrorMsg(
        faltouStatus 
          ? 'Para concluir o ticket, todos os exames precisam ter um status definido. Caso contrário, utilize o botão "Salvar".'
          : 'Por favor, preencha corretamente os campos em vermelho.'
      );
      
      return; // O ToastError faz o auto-scroll
    }

    try {
      const updates = examesAgendamento
        .filter(ex => typeof ex.id === 'number')
        .map(ex => 
          supabase.from('encaminhamento_exames')
            .update({ 
              status_id: ex.status_id || null,
              data_agendamento: Number(ex.status_id) === 9 ? (ex.data_agendamento || null) : null 
            })
            .eq('id', ex.id)
        );
      
      await Promise.all(updates);
      
      if (concluir) {
        await atualizarStatus(14, 'Exames atualizados e ticket concluído!');
      } else {
        setShowToast({ visible: true, message: 'Progresso salvo! O ticket continua pendente.' });
        setViewMode('list');
        setSelectedEnc(null);
        fetchEncaminhamentos();
      }
    } catch (error) {
      setErrorMsg('Ocorreu um erro ao gravar as informações no banco de dados.');
    }
  };

  const abrirDetalhes = (item: any) => {
    setSelectedEnc(item);
    setViewMode('details');
    setErrors({});
    setErrorMsg('');
    setEditForm({
      numero_atendimento: item.numero_atendimento || '',
      nome_paciente: item.nome_paciente || '',
      telefone_paciente: item.telefone_paciente || '',
      plano_saude: item.plano_saude || '',
      observacoes: item.observacoes || ''
    });
  };

  const confirmarEdicao = async () => {
    setErrors({});
    setErrorMsg('');
    const novosErros: Record<string, string> = {};

    // VALIDAÇÃO: Telefone removido da obrigatoriedade, apenas Nome.
    if (!editForm.nome_paciente) {
      novosErros.nome_paciente = 'Este campo é obrigatório';
    }

    if (Object.keys(novosErros).length > 0) {
      setErrors(novosErros);
      setErrorMsg('Por favor, preencha corretamente os campos em vermelho.');
      return;
    }

    try {
      const { error } = await supabase
        .from('encaminhamentos_ambulatorio')
        .update({ ...editForm, updated_at: new Date().toISOString() })
        .eq('id', selectedEnc.id);

      if (error) throw error;
      setShowToast({ visible: true, message: 'Dados atualizados com sucesso!' });
      setViewMode('details');
      fetchEncaminhamentos();
      
      setSelectedEnc({ ...selectedEnc, ...editForm });
    } catch (e) {
      setErrorMsg('Ocorreu uma falha ao salvar as alterações. Tente novamente.');
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
                {t === 'todos' ? 'Todos' : t === 'pendentes' ? 'Pendentes' : t === 'sucesso' ? 'Agendados/Concluídos' : 'Perdidos'}
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
                  onClick={prepararAgendamento}
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

      {selectedEnc && viewMode === 'edit' && (
        <Modal isOpen onClose={() => setViewMode('details')} title={<span className="text-purple-600 dark:text-purple-500 font-bold text-lg">Editar Encaminhamento</span>}>
          <div className="p-4 space-y-4 animate-in zoom-in-95 duration-200">
            {/* WRAPPER COM ID PARA O SCROLL FUNCIONAR */}
            <div id="nome_paciente">
              <Input label="Nome do Paciente *" value={editForm.nome_paciente} onChange={e => setEditForm({...editForm, nome_paciente: e.target.value})} error={errors.nome_paciente} />
            </div>
            
            <Input label="Telefone" value={editForm.telefone_paciente} onChange={e => setEditForm({...editForm, telefone_paciente: maskPhone(e.target.value)})} error={errors.telefone_paciente} />
            <Input label="Plano de Saúde" value={editForm.plano_saude} onChange={e => setEditForm({...editForm, plano_saude: e.target.value})} />
            <Input label="Nº Atendimento (Opcional)" value={editForm.numero_atendimento} onChange={e => setEditForm({...editForm, numero_atendimento: e.target.value})} />
            <Textarea label="Observações" value={editForm.observacoes} onChange={e => setEditForm({...editForm, observacoes: e.target.value})} />
            
            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" fullWidth onClick={() => setViewMode('details')}>Cancelar</Button>
              <Button variant="primary" fullWidth onClick={confirmarEdicao}>Salvar Alterações</Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedEnc && viewMode === 'agendar_exames' && (
        <Modal isOpen onClose={() => setViewMode('details')} title={<span className="text-purple-600 dark:text-purple-500 font-bold text-lg">Status por Exame/Especialidade</span>}>
          <div className="p-4 space-y-4 animate-in zoom-in-95 duration-200">
            <Description className="text-center mb-6">
              Atualize o status individual de cada solicitação feita para <strong className="text-purple-600 dark:text-purple-400">{selectedEnc.nome_paciente || 'Nome não informado'}</strong>.
            </Description>

            <div className="space-y-4 min-h-[380px] overflow-visible pb-10">
              {examesAgendamento.map((exame, index) => (
                <div 
                  key={exame.id} 
                  id={`status_exame_${index}`}
                  className={`bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border ${errors[`status_exame_${index}`] ? 'border-red-500 shadow-sm shadow-red-500/20' : 'border-slate-200 dark:border-slate-700/50'} flex flex-col gap-3 relative transition-all`}
                  style={{ zIndex: 50 - index }} 
                >
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{exame.nome}</span>
                  
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 flex flex-col">
                      <select 
                        value={exame.status_id || ''}
                        onChange={(e) => {
                          const novos = [...examesAgendamento];
                          novos[index].status_id = e.target.value;
                          setExamesAgendamento(novos);
                          if(errors[`status_exame_${index}`]) {
                            const newErros = {...errors};
                            delete newErros[`status_exame_${index}`];
                            setErrors(newErros);
                          }
                        }}
                        className={`w-full px-3 py-2.5 rounded-lg border bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm outline-none transition-colors focus:ring-2 focus:ring-purple-500 ${errors[`status_exame_${index}`] ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        <option value="">Aguardando tratativa...</option>
                        <option value="9">Agendado</option>
                        <option value="10">Plano não Atendido</option>
                        <option value="11">Sem Especialidade</option>
                        <option value="12">Sem Contato</option>
                      </select>
                      {errors[`status_exame_${index}`] && (
                        <span className="text-xs text-red-500 font-medium mt-1">{errors[`status_exame_${index}`]}</span>
                      )}
                    </div>

                    {Number(exame.status_id) === 9 && (
                      <div className="flex-1 flex-shrink-0 animate-in fade-in duration-200">
                        <DatePicker 
                          value={exame.data_agendamento} 
                          onChange={(e) => {
                            const novos = [...examesAgendamento];
                            novos[index].data_agendamento = e.target.value;
                            setExamesAgendamento(novos);
                          }} 
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-2">
              <Button variant="secondary" fullWidth onClick={() => setViewMode('details')}>Voltar</Button>
              <Button variant="primary" fullWidth onClick={() => salvarAgendamentoExames(false)}>Salvar</Button>
              <Button variant="success" fullWidth onClick={() => salvarAgendamentoExames(true)}>Salvar e Concluir</Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedEnc && viewMode === 'confirm_cancel' && (
        <ModalConfirmacaoCancelamentoLayout isOpen onClose={() => setViewMode('details')} onConfirm={() => atualizarStatus(3, 'Cancelado.')} nomePaciente={selectedEnc.nome_paciente || 'Nome não informado'} tipoAtendimento="encaminhamento" />
      )}

      {showToast.visible && <Toast message={showToast.message} onClose={() => setShowToast({ ...showToast, visible: false })} />}
      
      <ToastError 
        message={errorMsg} 
        errors={errors} 
        onClose={() => setErrorMsg('')} 
      />
    </div>
  );
}
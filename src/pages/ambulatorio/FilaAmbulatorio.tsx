import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, CheckCircle2, AlertCircle, 
  HelpCircle, XCircle, Edit, Hash, User, Phone, ShieldOff, FileText, Activity
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
import { SelectAutocomplete } from '../../components/ui/SelectAutocomplete';
import { Toast } from '../../components/ui/Toast';
import { Title, Description } from '../../components/ui/Typography';

// COMPONENTES COMPARTILHADOS
import { AtendimentoCard } from '../../components/shared/AtendimentoCard';
import { ModalDetalhesLayout } from '../../components/shared/ModalDetalhesLayout';
import { ModalConfirmacaoCancelamentoLayout } from '../../components/shared/ModalConfirmacaoCancelamentoLayout';
import { ModalAtualizarStatusLayout } from '../../components/shared/ModalAtualizarStatusLayout';

// FUNÇÕES UTILITÁRIAS E PERMISSÕES
import { maskPhone, capitalizeName } from '../../utils/formUtils';
import { usePermissoes } from '../../hooks/usePermissoes';

// CONFIGURAÇÃO DE STATUS
const STATUS_CONFIG_AMB: Record<number, { label: string, color: string, border: string, icon: any }> = {
  1: { label: 'Aguardando Agendamento', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800/50', icon: AlertCircle },
  3: { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', border: 'border-red-200 dark:border-red-800/50', icon: XCircle },
  
  // NOVOS STATUS (SGFH)
  8: { label: 'Agendado', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/50', icon: CheckCircle2 },
  9: { label: 'Plano não Atendido', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800/50', icon: ShieldOff },
  10: { label: 'Sem Especialidade', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800/50', icon: AlertCircle },
  11: { label: 'Sem Contato', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', icon: HelpCircle },
};

export function Ambulatorio() {
  const { podeVerAmb, podeCriarAmb, podeGerenciarStatusAmb, podeEditarAmb, podeCancelarAmb } = usePermissoes();

  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTab, setFiltroTab] = useState<'pendentes' | 'sucesso' | 'perdidos'>('pendentes');
  const [selectedEnc, setSelectedEnc] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'details' | 'edit' | 'update_status' | 'confirm_cancel'>('list');
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
    setLoading(true);
    try {
      const statusMap = { 
        pendentes: [1], 
        sucesso: [8], 
        perdidos: [3, 9, 10, 11] 
      };

      const { data, error } = await supabase
        .from('encaminhamentos_ambulatorio')
        .select('*, status:status_id(*)')
        .in('status_id', statusMap[filtroTab])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLista(data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEncaminhamentos(); }, [filtroTab]);

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
      alert('Erro ao atualizar.');
    }
  };

  const abrirDetalhes = (item: any) => {
    setSelectedEnc(item);
    setViewMode('details');
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
    if (!editForm.nome_paciente || !editForm.telefone_paciente) {
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
    item.nome_paciente.toLowerCase().includes(busca.toLowerCase()) || 
    item.numero_atendimento?.includes(busca) ||
    item.crm_solicitante?.includes(busca)
  );

  if (!podeVerAmb) return null;

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      
      <div className="flex items-center gap-6 mb-8 border-b border-slate-200 dark:border-slate-800 px-2">
        {podeCriarAmb && (
          <Link to="/novo-ambulatorio" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/novo-ambulatorio' ? 'border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            Novo Encaminhamento
          </Link>
        )}
        <Link to="/ambulatorio" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/ambulatorio' ? 'border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}>
          Fila/Pendentes
        </Link>
      </div>

      {/* CABEÇALHO PADRONIZADO E CONTEXTUALIZADO */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-widest mb-2">
           <Activity size={16} /> Módulo: Ambulatório
        </div>
        <Title className="mb-2">Fila do Ambulatório</Title>
        <Description>Gerencie as solicitações de exames e consultas.</Description>
      </div>

      {/* CARD DE FILTROS REESTRUTURADO (MESMO PADRÃO DA AGENDA PA) */}
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
            {(['pendentes', 'sucesso', 'perdidos'] as const).map((t) => (
              <button 
                key={t}
                onClick={() => setFiltroTab(t)} 
                className={`flex-1 lg:flex-none whitespace-nowrap px-6 py-2 rounded-lg text-sm font-bold transition-all ${filtroTab === t ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
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
            const statusConfig = STATUS_CONFIG_AMB[item.status_id] || STATUS_CONFIG_AMB[1];
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
                nomePaciente={item.nome_paciente}
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
              <span className="line-clamp-1 dark:text-slate-100">{selectedEnc.nome_paciente}</span>
              {selectedEnc.status_id === 1 && podeEditarAmb && (
                <button onClick={() => setViewMode('edit')} className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors">
                  <Edit size={18} />
                </button>
              )}
            </div>
          }
          infoBoxes={[
            { label: 'Solicitado em', value: format(parseISO(selectedEnc.created_at), "dd/MM · HH:mm"), theme: 'purple' },
            { label: 'Origem', value: selectedEnc.origem, theme: selectedEnc.origem === 'PA' ? 'blue' : 'slate' },
            { label: 'Atendimento', value: `#${selectedEnc.numero_atendimento}`, theme: 'slate' }
          ]}
          statusLabel={STATUS_CONFIG_AMB[selectedEnc.status_id]?.label}
          statusClasses={{ color: STATUS_CONFIG_AMB[selectedEnc.status_id]?.color, border: STATUS_CONFIG_AMB[selectedEnc.status_id]?.border }}
          tagsLabel="Exames"
          tags={selectedEnc.exames_especialidades}
          phoneForWhats={selectedEnc.telefone_paciente}
          obsText={selectedEnc.observacoes || 'Sem observações.'}
          obsFooter={selectedEnc.crm_solicitante && <div className="text-xs font-bold text-slate-500 dark:text-slate-400">CRM: {selectedEnc.crm_solicitante}</div>}
          actionButtons={selectedEnc.status_id === 1 && podeGerenciarStatusAmb && (
            <Button variant="primary" fullWidth onClick={() => setViewMode('update_status')}>Atualizar Status</Button>
          )}
          footerButtons={selectedEnc.status_id === 1 && podeCancelarAmb && (
            <Button variant="ghostDanger" fullWidth onClick={() => setViewMode('confirm_cancel')}>Cancelar Pedido</Button>
          )}
        />
      )}

      {/* MODAL DE EDIÇÃO */}
      {selectedEnc && viewMode === 'edit' && (
        <Modal isOpen={true} onClose={() => setViewMode('details')} title={<span className="text-purple-600 dark:text-purple-400">Editar Encaminhamento</span>}>
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
             <Input label="Nº Atendimento" value={editForm.numero_atendimento} onChange={e => setEditForm({ ...editForm, numero_atendimento: e.target.value.replace(/\D/g, '') })} icon={<Hash size={18} />} maxLength={10} />
             <Input label="Nome do Paciente" value={editForm.nome_paciente} onChange={e => setEditForm({ ...editForm, nome_paciente: capitalizeName(e.target.value) })} icon={<User size={18} />} required />
             <Input label="Telefone / WhatsApp" value={editForm.telefone_paciente} onChange={e => setEditForm({ ...editForm, telefone_paciente: maskPhone(e.target.value) })} icon={<Phone size={18} />} maxLength={15} required />
             
             <SelectAutocomplete 
                label="Plano de Saúde"
                placeholder="Ex: Unimed, Cassems..."
                tableName="planos_saude"
                columnName="nome"
                value={editForm.plano_saude}
                onChange={(val) => setEditForm({ ...editForm, plano_saude: val })}
             />
             
             <Textarea label="Observações / Diagnóstico" value={editForm.observacoes} onChange={e => setEditForm({ ...editForm, observacoes: e.target.value })} rows={3} icon={<FileText size={18} />} />

             {errorMsg && (
               <div className="mb-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2">
                 <AlertCircle size={18} className="flex-shrink-0" />
                 <span className="font-semibold">{errorMsg}</span>
               </div>
             )}

             <div className="flex gap-2 pt-2">
                 <Button variant="secondary" fullWidth onClick={() => setViewMode('details')}>Cancelar</Button>
                 <Button variant="primary" fullWidth onClick={confirmarEdicao}>Salvar Dados</Button>
             </div>
          </div>
        </Modal>
      )}

      {/* MODAL DE ATUALIZAÇÃO DE STATUS */}
      {selectedEnc && viewMode === 'update_status' && (
        <ModalAtualizarStatusLayout 
          isOpen 
          onClose={() => setViewMode('details')} 
          nomePaciente={selectedEnc.nome_paciente} 
          theme="purple"
        >
          <div className="flex flex-col gap-3">
            <Button variant="success" fullWidth justify="start" onClick={() => atualizarStatus(8, 'Agendado com sucesso!')}>
              <CheckCircle2 size={18} /> Agendado
            </Button>
            
            <Button variant="rose" fullWidth justify="start" onClick={() => atualizarStatus(9, 'Plano não atendido registrado.')}>
              <ShieldOff size={18} /> Não atendemos o plano
            </Button>

            <Button variant="amber" fullWidth justify="start" onClick={() => atualizarStatus(10, 'Falta de especialidade registrada.')}>
              <AlertCircle size={18} /> Não temos a especialidade
            </Button>
            
            <Button variant="secondary" fullWidth justify="start" onClick={() => atualizarStatus(11, 'Falha de contato registrada.')}>
              <HelpCircle size={18} /> Não conseguimos contato
            </Button>
          </div>
        </ModalAtualizarStatusLayout>
      )}

      {selectedEnc && viewMode === 'confirm_cancel' && (
        <ModalConfirmacaoCancelamentoLayout isOpen onClose={() => setViewMode('details')} onConfirm={() => atualizarStatus(3, 'Cancelado.')} nomePaciente={selectedEnc.nome_paciente} tipoAtendimento="encaminhamento" />
      )}

      {showToast.visible && <Toast message={showToast.message} onClose={() => setShowToast({ ...showToast, visible: false })} />}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, Search, MessageCircle, CheckCircle2, 
  AlertCircle, Activity, Hash, Phone, Building2, HelpCircle, XCircle, Edit, FileText, User 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// COMPONENTES PADRONIZADOS
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ActionListItem } from '../../components/ui/ActionListItem';
import { SelectAutocomplete } from '../../components/ui/SelectAutocomplete';
import { Toast } from '../../components/ui/Toast';
import { ModalDetalhesLayout } from '../../components/shared/ModalDetalhesLayout';
import { ModalConfirmacaoStatusLayout } from '../../components/shared/ModalConfirmacaoStatusLayout';
import { ModalConfirmacaoCancelamentoLayout } from '../../components/shared/ModalConfirmacaoCancelamentoLayout';
import { ModalAtualizarStatusLayout } from '../../components/shared/ModalAtualizarStatusLayout';
import { maskPhone, capitalizeName } from '../../utils/formUtils';

const STATUS_CONFIG_AMB: Record<number, { label: string, color: string, border: string, icon: any }> = {
  1: { label: 'Pendente', color: 'bg-slate-100 text-slate-700', border: 'border-slate-200', icon: ClipboardList },
  3: { label: 'Cancelado', color: 'bg-red-100 text-red-700', border: 'border-red-200', icon: XCircle },
  4: { label: 'Não Atende', color: 'bg-gray-100 text-gray-600', border: 'border-gray-200', icon: HelpCircle },
  5: { label: 'Finalizado', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
};

type StatusItem = {
  id: number;
  nome: string;
  agrupamento: string;
};

type Encaminhamento = {
  id: number;
  numero_atendimento: string;
  nome_paciente: string;
  telefone_paciente: string;
  plano_saude: string;
  exames_especialidades: string[];
  observacoes: string;
  status_id: number;
  status: StatusItem;
  origem: string; 
  crm_solicitante: string; 
  created_at: string;
};

type ViewMode = 'list' | 'details' | 'edit' | 'update_status' | 'confirm_action' | 'confirm_cancel';

export function Ambulatorio() {
  const { user } = useAuth();
  const [lista, setLista] = useState<Encaminhamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  
  const [filtroTab, setFiltroTab] = useState<'pendentes' | 'sucesso' | 'perdidos'>('pendentes');
  const [selectedEnc, setSelectedEnc] = useState<Encaminhamento | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showToast, setShowToast] = useState({ visible: false, message: '' });

  const [tempAction, setTempAction] = useState<{ id: number, msg: string, title: string } | null>(null);
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
      let statusFilter = [1]; 
      if (filtroTab === 'sucesso') statusFilter = [5]; 
      if (filtroTab === 'perdidos') statusFilter = [3, 4]; 

      const { data, error } = await supabase.from('encaminhamentos_ambulatorio').select('*, status:status_id(*)').in('status_id', statusFilter).order('created_at', { ascending: false });
      if (error) throw error;
      setLista(data as Encaminhamento[] || []);
    } catch (error) { console.error('Erro ao carregar ambulatório:', error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchEncaminhamentos(); }, [filtroTab]);

  const abrirDetalhes = (item: Encaminhamento) => {
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

  const prepararAtualizacao = (id: number, msg: string, title: string) => {
    setTempAction({ id, msg, title });
    setViewMode('confirm_action');
  };

  const atualizarStatus = async (novoStatusId: number, mensagemSucesso: string) => {
    if (!selectedEnc) return;
    try {
      const { error } = await supabase.from('encaminhamentos_ambulatorio').update({ status_id: novoStatusId, updated_at: new Date().toISOString() }).eq('id', selectedEnc.id);
      if (error) throw error;
      setShowToast({ visible: true, message: mensagemSucesso });
      setSelectedEnc(null);
      setTempAction(null);
      setViewMode('list');
      fetchEncaminhamentos();
    } catch (error) { alert('Erro ao atualizar status.'); }
  };

  const confirmarEdicao = async () => {
    setErrorMsg('');
    if (!selectedEnc) return;
    try {
      const { error } = await supabase.from('encaminhamentos_ambulatorio').update({
          numero_atendimento: editForm.numero_atendimento,
          nome_paciente: editForm.nome_paciente,
          telefone_paciente: editForm.telefone_paciente,
          plano_saude: editForm.plano_saude,
          observacoes: editForm.observacoes,
          updated_at: new Date().toISOString()
      }).eq('id', selectedEnc.id);
      
      if (error) throw error;
      setShowToast({ visible: true, message: 'Dados atualizados!' });
      setViewMode('details');
      fetchEncaminhamentos();
      setSelectedEnc(null);
    } catch (e) { setErrorMsg('Erro ao salvar os dados no banco. Tente novamente.'); }
  };

  const listaFiltrada = lista.filter(item => 
    item.nome_paciente.toLowerCase().includes(busca.toLowerCase()) || item.numero_atendimento?.includes(busca) || item.telefone_paciente?.includes(busca) || item.crm_solicitante?.includes(busca) 
  );

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      
      <div className="flex items-center gap-6 mb-8 border-b border-slate-200 px-2">
        <Link to="/novo-ambulatorio" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/novo-ambulatorio' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Novo Encaminhamento</Link>
        <Link to="/ambulatorio" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/ambulatorio' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Fila/Pendentes</Link>
      </div>

      <Card className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ClipboardList className="text-purple-600" /> Fila do Ambulatório</h1><p className="text-slate-500 text-sm">Gerencie os pedidos de agendamento do concierge.</p></div>
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setFiltroTab('pendentes')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filtroTab === 'pendentes' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pendentes</button>
            <button onClick={() => setFiltroTab('sucesso')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filtroTab === 'sucesso' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Finalizados</button>
            <button onClick={() => setFiltroTab('perdidos')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filtroTab === 'perdidos' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Perdidos</button>
          </div>
        </div>
        <div className="mt-6 border-t border-slate-50 pt-6">
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, atendimento, telefone ou CRM..." icon={<Search size={18} />} />
        </div>
      </Card>

      {loading ? <div className="text-center py-20 text-slate-400">Carregando fila...</div> : listaFiltrada.length === 0 ? (
        <Card className="text-center py-20 border-dashed shadow-none"><AlertCircle size={48} className="text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-medium">Nenhum registro encontrado para este filtro.</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listaFiltrada.map((item) => (
            <Card key={item.id} hoverable onClick={() => abrirDetalhes(item)} className="flex flex-col !p-5 group hover:border-purple-300">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                    <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded-md border border-purple-100 uppercase">{format(parseISO(item.created_at), "dd MMM · HH:mm", { locale: ptBR })}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border uppercase ${item.origem === 'PA' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{item.origem}</span>
                </div>
                {item.numero_atendimento && (<span className="text-xs font-mono font-bold text-slate-400">#{item.numero_atendimento}</span>)}
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">{item.nome_paciente}</h3>
              {item.plano_saude && (<p className="text-[10px] font-semibold text-purple-600 bg-purple-50 inline-block px-1.5 py-0.5 rounded-md mb-4 border border-purple-100">{item.plano_saude}</p>)}
              <div className="space-y-2 mb-4 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Procedimentos / Exames:</p>
                <div className="flex flex-wrap gap-1">
                  {item.exames_especialidades.map((exame, i) => (<span key={i} className="bg-slate-50 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200 flex items-center gap-1"><Activity size={10} className="text-purple-500" /> {exame}</span>))}
                </div>
              </div>
              <div className="mt-auto pt-3 border-t border-slate-50 flex justify-between items-center">
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${item.status?.agrupamento === 'sucesso' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : item.status?.agrupamento === 'perdido' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{item.status?.nome || 'Pendente'}</span>
                <span className="text-xs font-bold text-purple-600 group-hover:text-purple-800 transition-colors">Ver Detalhes &rarr;</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 1. VIEW DETALHES */}
      {selectedEnc && viewMode === 'details' && (
        <ModalDetalhesLayout 
          isOpen={true}
          onClose={() => setSelectedEnc(null)}
          title={
            <div className="flex items-center gap-2">
              <span className="line-clamp-1">{selectedEnc.nome_paciente}</span>
              {selectedEnc.status_id === 1 && (
                <button onClick={() => setViewMode('edit')} className="p-1.5 bg-slate-100 text-slate-500 hover:bg-purple-100 hover:text-purple-600 rounded-lg transition-colors"><Edit size={18} /></button>
              )}
            </div>
          }
          infoBoxes={[
            { label: 'Solicitado em', value: format(parseISO(selectedEnc.created_at), "dd/MM · HH:mm"), theme: 'purple' },
            { label: 'Origem', value: selectedEnc.origem, theme: selectedEnc.origem === 'PA' ? 'blue' : 'slate' },
            { label: 'Atendimento', value: selectedEnc.numero_atendimento ? `#${selectedEnc.numero_atendimento}` : '---', theme: 'slate' }
          ]}
          statusLabel={STATUS_CONFIG_AMB[selectedEnc.status_id]?.label || 'Pendente'}
          statusClasses={{ color: STATUS_CONFIG_AMB[selectedEnc.status_id]?.color || 'bg-slate-100 text-slate-700', border: STATUS_CONFIG_AMB[selectedEnc.status_id]?.border || 'border-slate-200' }}
          tagsLabel="Exames / Especialidades"
          tags={selectedEnc.exames_especialidades}
          phoneForWhats={selectedEnc.telefone_paciente}
          obsLabel="Observações do Pedido"
          obsText={selectedEnc.observacoes || 'Sem observações.'}
          obsFooter={
            selectedEnc.crm_solicitante ? <div className="text-xs font-bold text-slate-500">CRM Solicitante: {selectedEnc.crm_solicitante}</div> : undefined
          }
          actionButtons={
            selectedEnc.status_id === 1 ? (
              <Button variant="primary" fullWidth onClick={() => setViewMode('update_status')}><CheckCircle2 size={18} /> Atualizar Status</Button>
            ) : undefined
          }
          footerButtons={
            selectedEnc.status_id === 1 ? (
              <button onClick={() => setViewMode('confirm_cancel')} className="w-full text-xs text-red-400 hover:text-red-600 py-2 font-bold">Cancelar pedido</button>
            ) : undefined
          }
        />
      )}

      {/* 2. VIEW SELEÇÃO DE STATUS */}
      {selectedEnc && viewMode === 'update_status' && (
        <ModalAtualizarStatusLayout
          isOpen={true}
          onClose={() => setViewMode('details')}
          nomePaciente={selectedEnc.nome_paciente}
          theme="purple"
        >
          <ActionListItem 
            icon={<CheckCircle2 size={18} />} 
            title="Finalizado (Agendado)" 
            colorTheme="green" 
            hideChevron 
            onClick={() => prepararAtualizacao(5, 'Agendamento Finalizado com sucesso!', 'Confirmar Finalização')} 
          />
          <ActionListItem 
            icon={<HelpCircle size={18} />} 
            title="Não Atende" 
            colorTheme="gray" 
            hideChevron 
            onClick={() => prepararAtualizacao(4, 'Status alterado para: Não Atende', 'Confirmar Alteração')} 
          />
        </ModalAtualizarStatusLayout>
      )}

      {/* 3. VIEW CONFIRMAÇÃO (FINALIZADO / NÃO ATENDE) */}
      {selectedEnc && viewMode === 'confirm_action' && tempAction && (
        <ModalConfirmacaoStatusLayout 
          isOpen={true}
          onClose={() => setViewMode('update_status')}
          onConfirm={() => atualizarStatus(tempAction.id, tempAction.msg)}
          nomePaciente={selectedEnc.nome_paciente}
          statusNome={tempAction.id === 5 ? "Finalizado" : "Não Atende"}
          tipoStatus={tempAction.id === 5 ? "sucesso" : "neutro"}
          errorMsg={errorMsg}
          title={tempAction.title}
        />
      )}

      {/* 4. VIEW CANCELAR */}
      {selectedEnc && viewMode === 'confirm_cancel' && (
        <ModalConfirmacaoCancelamentoLayout 
          isOpen={true}
          onClose={() => setViewMode('details')}
          onConfirm={() => atualizarStatus(3, 'Agendamento Cancelado com sucesso')}
          nomePaciente={selectedEnc.nome_paciente}
          tipoAtendimento="encaminhamento"
          errorMsg={errorMsg}
        />
      )}

      {/* 5. VIEW EDITAR */}
      {selectedEnc && viewMode === 'edit' && (
        <Modal isOpen={true} onClose={() => setViewMode('details')} title={<span className="text-purple-600 font-bold">Editando dados</span>}>
          <div className="space-y-4">
              <Input label="Nº Atendimento" value={editForm.numero_atendimento} onChange={e => setEditForm({ ...editForm, numero_atendimento: e.target.value.replace(/\D/g, '') })} icon={<Hash size={18} />} maxLength={10} />
              <Input label="Nome do Paciente" value={editForm.nome_paciente} onChange={e => setEditForm({ ...editForm, nome_paciente: capitalizeName(e.target.value) })} icon={<User size={18} />} />
              <Input label="Telefone / WhatsApp" value={editForm.telefone_paciente} onChange={e => setEditForm({ ...editForm, telefone_paciente: maskPhone(e.target.value) })} icon={<Phone size={18} />} maxLength={15} />
              <div className="relative z-50">
                  <SelectAutocomplete label="Plano de Saúde" tableName="planos_saude" columnName="nome" placeholder="Ex: Unimed, Cassems..." value={editForm.plano_saude} onChange={(val) => setEditForm({ ...editForm, plano_saude: val })} />
              </div>
              <Textarea label="Observações" value={editForm.observacoes} onChange={e => setEditForm({ ...editForm, observacoes: e.target.value })} icon={<FileText size={18} />} rows={3} />
              {errorMsg && (
                <div className="mb-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={18} className="flex-shrink-0" /><span className="font-bold">{errorMsg}</span></div>
              )}
              <div className="flex gap-2 pt-4 mt-4 border-t border-slate-100">
                  <Button variant="secondary" fullWidth onClick={() => setViewMode('details')}>Cancelar</Button>
                  <Button variant="primary" fullWidth onClick={confirmarEdicao}>Salvar Dados</Button>
              </div>
          </div>
        </Modal>
      )}

      {showToast.visible && <Toast message={showToast.message} onClose={() => setShowToast({ visible: false, message: '' })} />}
    </div>
  );
}
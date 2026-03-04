import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, Search, CheckCircle2, AlertCircle, 
  Hash, Phone, HelpCircle, XCircle, Edit, FileText, User 
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

// COMPONENTES COMPARTILHADOS (O NOVO CARD ENTRA AQUI)
import { AtendimentoCard } from '../../components/shared/AtendimentoCard';
import { ModalDetalhesLayout } from '../../components/shared/ModalDetalhesLayout';
import { ModalConfirmacaoCancelamentoLayout } from '../../components/shared/ModalConfirmacaoCancelamentoLayout';
import { ModalAtualizarStatusLayout } from '../../components/shared/ModalAtualizarStatusLayout';

// FUNÇÕES UTILITÁRIAS E PERMISSÕES
import { maskPhone, capitalizeName } from '../../utils/formUtils';
import { usePermissoes } from '../../hooks/usePermissoes';

// RÓTULO DO STATUS 1 ALTERADO PARA REFLETIR A REALIDADE DO AMBULATÓRIO
const STATUS_CONFIG_AMB: Record<number, { label: string, color: string, border: string, icon: any }> = {
  1: { label: 'Aguardando Agendamento', color: 'bg-orange-100 text-orange-700', border: 'border-orange-200', icon: ClipboardList },
  3: { label: 'Cancelado', color: 'bg-red-100 text-red-700', border: 'border-red-200', icon: XCircle },
  4: { label: 'Não Atende', color: 'bg-gray-100 text-gray-600', border: 'border-gray-200', icon: HelpCircle },
  5: { label: 'Finalizado', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
};

export function Ambulatorio() {
  const { user } = useAuth();
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

  // PROTEÇÃO DE PÁGINA
  if (!podeVerAmb) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 bg-white rounded-xl border border-red-100 mt-8">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Acesso Negado</h2>
        <p className="text-slate-500">Você não tem permissão para visualizar a fila do Ambulatório.</p>
        <Link to="/" className="inline-block mt-8 px-6 py-2 bg-slate-100 rounded-lg font-bold">Voltar</Link>
      </div>
    );
  }

  const fetchEncaminhamentos = async () => {
    setLoading(true);
    try {
      const statusMap = { pendentes: [1], sucesso: [5], perdidos: [3, 4] };
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

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      
      <div className="flex items-center gap-6 mb-8 border-b border-slate-200 px-2">
        {podeCriarAmb && (
          <Link to="/novo-ambulatorio" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/novo-ambulatorio' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            Novo Encaminhamento
          </Link>
        )}
        <Link to="/ambulatorio" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/ambulatorio' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          Fila/Pendentes
        </Link>
      </div>

      <Card className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="text-purple-600" /> Fila do Ambulatório
            </h1>
            <p className="text-slate-500 text-sm">Gerencie os pedidos de agendamento.</p>
          </div>
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            {(['pendentes', 'sucesso', 'perdidos'] as const).map((t) => (
              <button 
                key={t}
                onClick={() => setFiltroTab(t)} 
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filtroTab === t ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 border-t border-slate-50 pt-6">
          <Input 
            value={busca} 
            onChange={(e) => setBusca(e.target.value)} 
            placeholder="Buscar por paciente, atendimento ou CRM..." 
            icon={<Search size={18} />} 
          />
        </div>
      </Card>

      {/* RENDERIZAÇÃO USANDO O NOVO ATENDIMENTO CARD */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 font-bold">Buscando registros...</div>
      ) : listaFiltrada.length === 0 ? (
        <Card className="text-center py-20 border-dashed shadow-none">
            <AlertCircle size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhum registro encontrado.</p>
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
                origem={item.origem} // <--- ADICIONE ESTA LINHA AQUI!
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
              <span className="line-clamp-1">{selectedEnc.nome_paciente}</span>
              {selectedEnc.status_id === 1 && podeEditarAmb && (
                <button onClick={() => setViewMode('edit')} className="p-1.5 bg-slate-100 hover:bg-purple-100 text-slate-500 hover:text-purple-600 rounded-lg transition-colors">
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
          obsFooter={selectedEnc.crm_solicitante && <div className="text-xs font-bold text-slate-500">CRM: {selectedEnc.crm_solicitante}</div>}
          actionButtons={selectedEnc.status_id === 1 && podeGerenciarStatusAmb && (
            <Button variant="primary" fullWidth onClick={() => setViewMode('update_status')}>Atualizar Status</Button>
          )}
          footerButtons={selectedEnc.status_id === 1 && podeCancelarAmb && (
            <button onClick={() => setViewMode('confirm_cancel')} className="w-full text-xs text-red-400 font-bold py-2">Cancelar Pedido</button>
          )}
        />
      )}

      {selectedEnc && viewMode === 'edit' && (
        <Modal isOpen={true} onClose={() => setViewMode('details')} title="Editando Encaminhamento">
          <div className="space-y-4">
            <Input label="Nº Atendimento" value={editForm.numero_atendimento} onChange={e => setEditForm({ ...editForm, numero_atendimento: e.target.value.replace(/\D/g, '') })} maxLength={10} />
            <Input label="Paciente" value={editForm.nome_paciente} onChange={e => setEditForm({ ...editForm, nome_paciente: capitalizeName(e.target.value) })} />
            <Input label="WhatsApp" value={editForm.telefone_paciente} onChange={e => setEditForm({ ...editForm, telefone_paciente: maskPhone(e.target.value) })} maxLength={15} />
            
            <div className="relative z-50">
              <SelectAutocomplete 
                label="Plano de Saúde" 
                tableName="planos_saude" 
                columnName="nome" 
                value={editForm.plano_saude} 
                onChange={val => setEditForm({ ...editForm, plano_saude: val })} 
              />
            </div>

            <Textarea label="Observações" value={editForm.observacoes} onChange={e => setEditForm({ ...editForm, observacoes: e.target.value })} />
            {errorMsg && <p className="text-red-500 text-xs font-bold">{errorMsg}</p>}
            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <Button variant="secondary" fullWidth onClick={() => setViewMode('details')}>Voltar</Button>
              <Button variant="primary" fullWidth onClick={confirmarEdicao}>Salvar</Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedEnc && viewMode === 'update_status' && (
        <ModalAtualizarStatusLayout isOpen onClose={() => setViewMode('details')} nomePaciente={selectedEnc.nome_paciente}>
          <ActionListItem icon={<CheckCircle2 size={18} />} title="Finalizado" colorTheme="green" onClick={() => atualizarStatus(5, 'Finalizado!')} />
          <ActionListItem icon={<HelpCircle size={18} />} title="Não Atende" colorTheme="gray" onClick={() => atualizarStatus(4, 'Não atende.')} />
        </ModalAtualizarStatusLayout>
      )}

      {selectedEnc && viewMode === 'confirm_cancel' && (
        <ModalConfirmacaoCancelamentoLayout isOpen onClose={() => setViewMode('details')} onConfirm={() => atualizarStatus(3, 'Cancelado.')} nomePaciente={selectedEnc.nome_paciente} tipoAtendimento="encaminhamento" />
      )}

      {showToast.visible && <Toast message={showToast.message} onClose={() => setShowToast({ ...showToast, visible: false })} />}
    </div>
  );
}
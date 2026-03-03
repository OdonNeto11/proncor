import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, Search, MessageCircle, CheckCircle2, 
  AlertCircle, Activity, X, Hash, Phone, Building2, HelpCircle, XCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Toast } from '../../components/ui/Toast';

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
  origem: string; // <-- NOVO
  crm_solicitante: string; // <-- NOVO
  created_at: string;
};

type ViewMode = 'list' | 'details' | 'confirm_action';

export function Ambulatorio() {
  const { user } = useAuth();
  const [lista, setLista] = useState<Encaminhamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  
  const [filtroTab, setFiltroTab] = useState<'pendentes' | 'sucesso' | 'perdidos'>('pendentes');
  
  const [selectedEnc, setSelectedEnc] = useState<Encaminhamento | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showToast, setShowToast] = useState({ visible: false, message: '' });

  const [tempAction, setTempAction] = useState<{ id: number, msg: string, title: string, desc: string } | null>(null);

  const fetchEncaminhamentos = async () => {
    setLoading(true);
    try {
      let statusFilter = [1]; 
      if (filtroTab === 'sucesso') statusFilter = [5]; 
      if (filtroTab === 'perdidos') statusFilter = [3, 4]; 

      const { data, error } = await supabase
        .from('encaminhamentos_ambulatorio')
        .select('*, status:status_id(*)')
        .in('status_id', statusFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLista(data as Encaminhamento[] || []);
    } catch (error) {
      console.error('Erro ao carregar ambulatório:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEncaminhamentos();
  }, [filtroTab]);

  const abrirDetalhes = (item: Encaminhamento) => {
    setSelectedEnc(item);
    setViewMode('details');
  };

  const prepararAtualizacao = (id: number, msg: string, title: string, desc: string) => {
    setTempAction({ id, msg, title, desc });
    setViewMode('confirm_action');
  };

  const atualizarStatus = async (novoStatusId: number, mensagemSucesso: string) => {
    if (!selectedEnc) return;

    try {
      const { error } = await supabase
        .from('encaminhamentos_ambulatorio')
        .update({ status_id: novoStatusId, updated_at: new Date().toISOString() })
        .eq('id', selectedEnc.id);

      if (error) throw error;

      setShowToast({ visible: true, message: mensagemSucesso });
      setSelectedEnc(null);
      setTempAction(null);
      setViewMode('list');
      fetchEncaminhamentos();
    } catch (error) {
      alert('Erro ao atualizar status.');
    }
  };

  const listaFiltrada = lista.filter(item => 
    item.nome_paciente.toLowerCase().includes(busca.toLowerCase()) ||
    item.numero_atendimento?.includes(busca) ||
    item.telefone_paciente?.includes(busca) ||
    item.crm_solicitante?.includes(busca) // <-- NOVO: Permitindo buscar por CRM da origem
  );

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      
      <div className="flex items-center gap-6 mb-8 border-b border-gray-200 px-2">
        <Link 
          to="/novo-ambulatorio" 
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/novo-ambulatorio' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
        >
          Novo Encaminhamento
        </Link>
        <Link 
          to="/ambulatorio" 
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/ambulatorio' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
        >
          Fila/Pendentes
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="text-purple-600" /> Fila do Ambulatório (Concierge)
          </h1>
          <p className="text-gray-500 text-sm">Gerencie os pedidos de agendamento.</p>
        </div>

        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setFiltroTab('pendentes')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filtroTab === 'pendentes' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Pendentes
          </button>
          <button 
            onClick={() => setFiltroTab('sucesso')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filtroTab === 'sucesso' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Finalizados
          </button>
          <button 
            onClick={() => setFiltroTab('perdidos')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filtroTab === 'perdidos' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Perdidos
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nome, atendimento, telefone ou CRM..." 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando lista...</div>
      ) : listaFiltrada.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
           <AlertCircle size={48} className="text-gray-300 mx-auto mb-4" />
           <p className="text-gray-500 font-medium">Nenhum registro encontrado para este filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listaFiltrada.map((item) => (
            <div 
              key={item.id} 
              onClick={() => abrirDetalhes(item)}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer relative overflow-hidden flex flex-col group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                    <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded-md border border-purple-100 uppercase">
                      {format(parseISO(item.created_at), "dd MMM · HH:mm", { locale: ptBR })}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border uppercase ${item.origem === 'PA' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {item.origem}
                    </span>
                </div>
                {item.numero_atendimento && (
                  <span className="text-xs font-mono text-gray-400">#{item.numero_atendimento}</span>
                )}
              </div>

              <h3 className="font-bold text-gray-800 text-lg mb-1">{item.nome_paciente}</h3>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                <Building2 size={12} /> {item.plano_saude}
              </div>

              <div className="space-y-2 mb-4 flex-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Procedimentos:</p>
                <div className="flex flex-wrap gap-1">
                  {item.exames_especialidades.map((exame, i) => (
                    <span key={i} className="bg-slate-50 text-slate-700 text-[11px] font-semibold px-2 py-1 rounded-md border border-slate-200 flex items-center gap-1">
                      <Activity size={10} className="text-purple-500" /> {exame}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${item.status?.agrupamento === 'sucesso' ? 'bg-green-50 text-green-700 border-green-200' : item.status?.agrupamento === 'perdido' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {item.status?.nome || 'Pendente'}
                </span>
                <span className="text-xs font-bold text-purple-600 group-hover:text-purple-800">Ver Detalhes &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL PRINCIPAL */}
      {selectedEnc && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="bg-gray-50 rounded-t-2xl px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-purple-600">
                {viewMode === 'details' ? 'Detalhes do Pedido' : 'Confirmação'}
              </h3>
              <button onClick={() => { setSelectedEnc(null); setViewMode('list'); }} className="p-1 rounded-lg hover:bg-gray-200 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              
              {/* TELA DE DETALHES */}
              {viewMode === 'details' && (
                <div className="space-y-5">
                  <div className="flex gap-2 text-center">
                    <div className="flex-1 bg-purple-50 p-2 rounded-xl border border-purple-100">
                      <span className="text-[10px] text-purple-600 font-bold uppercase block">Solicitado em</span>
                      <div className="font-bold text-purple-900 text-sm">{format(parseISO(selectedEnc.created_at), "dd/MM 'às' HH:mm")}</div>
                    </div>
                    <div className="flex-1 bg-slate-100 p-2 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Atendimento</span>
                      <div className="font-bold text-slate-700 text-sm">#{selectedEnc.numero_atendimento}</div>
                    </div>
                    <div className={`flex-1 p-2 rounded-xl border ${selectedEnc.origem === 'PA' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                      <span className={`text-[10px] font-bold uppercase block ${selectedEnc.origem === 'PA' ? 'text-blue-600' : 'text-gray-500'}`}>CRM Solicitante</span>
                      <div className={`font-bold text-sm ${selectedEnc.origem === 'PA' ? 'text-blue-900' : 'text-gray-700'}`}>{selectedEnc.crm_solicitante || '---'}</div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedEnc.nome_paciente}</h2>
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                        <Phone size={16} className="text-gray-400" /> {selectedEnc.telefone_paciente}
                      </span>
                      <span className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                        <Building2 size={16} className="text-gray-400" /> Plano: {selectedEnc.plano_saude}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Exames / Especialidades:</p>
                    <ul className="space-y-2">
                      {selectedEnc.exames_especialidades.map((exame, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                           <Activity size={14} className="text-purple-500" /> {exame}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedEnc.observacoes && (
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Observações:</p>
                      <p className="text-sm text-amber-900 whitespace-pre-line">{selectedEnc.observacoes}</p>
                    </div>
                  )}

                  <button 
                    onClick={() => window.open(`https://wa.me/55${selectedEnc.telefone_paciente?.replace(/\D/g, '')}`, '_blank')} 
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold flex justify-center gap-2 transition-transform active:scale-95 shadow-sm"
                  >
                    <MessageCircle /> Acionar Paciente no WhatsApp
                  </button>

                  {selectedEnc.status_id === 1 && (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-2 mt-4">
                      <p className="text-[10px] font-bold text-gray-500 uppercase text-center mb-2">Ações do Concierge</p>
                      
                      <button 
                        onClick={() => prepararAtualizacao(5, 'Agendamento Finalizado com sucesso!', 'Finalizar Agendamento?', `Confirme que você já entrou em contato com ${selectedEnc.nome_paciente} e realizou os agendamentos.`)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 font-bold transition-colors text-sm"
                      >
                        <CheckCircle2 size={18} /> Finalizado (Agendado)
                      </button>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => prepararAtualizacao(4, 'Status alterado para: Não Atende', 'Paciente não atende?', `Confirme que você tentou contato com ${selectedEnc.nome_paciente}, mas não obteve resposta.`)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 font-bold transition-colors text-xs"
                        >
                          <HelpCircle size={16} /> Não Atende
                        </button>
                        <button 
                          onClick={() => prepararAtualizacao(3, 'Agendamento Cancelado', 'Cancelar Pedido?', `Tem certeza que deseja cancelar este encaminhamento de ${selectedEnc.nome_paciente}?`)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-bold transition-colors text-xs"
                        >
                          <XCircle size={16} /> Cancelar Pedido
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TELA DE CONFIRMAÇÃO (Muda cor e icone baseado no ID) */}
              {viewMode === 'confirm_action' && tempAction && (
                <div className="text-center space-y-4 animate-in slide-in-from-right-4 duration-200 py-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 
                    ${tempAction.id === 5 ? 'bg-green-100 text-green-600' : 
                      tempAction.id === 3 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {tempAction.id === 5 ? <CheckCircle2 size={32} /> : 
                     tempAction.id === 3 ? <XCircle size={32} /> : <HelpCircle size={32} />}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-800">{tempAction.title}</h3>
                  <p className="text-gray-500 text-sm mb-6 px-4">{tempAction.desc}</p>
                  
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setViewMode('details')}
                      className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                      Voltar
                    </button>
                    <button 
                      onClick={() => atualizarStatus(tempAction.id, tempAction.msg)}
                      className={`flex-1 py-3 text-white rounded-xl font-bold transition-colors shadow-lg 
                        ${tempAction.id === 5 ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 
                          tempAction.id === 3 ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-gray-700 hover:bg-gray-800 shadow-gray-200'}`}
                    >
                      Sim, Confirmar
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {showToast.visible && <Toast message={showToast.message} onClose={() => setShowToast({ visible: false, message: '' })} />}
    </div>
  );
}
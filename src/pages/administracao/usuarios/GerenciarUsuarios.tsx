import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Users, ChevronRight, Home, Search } from 'lucide-react';
import { Toast } from '../../../components/ui/Toast';
import { ToastError } from '../../../components/ui/ToastError';
import { Title, Description } from '../../../components/ui/Typography';

import { FormularioUsuario, UsuarioFormType } from './FormularioUsuario';
import { ItemUsuario } from './ItemUsuario';
import { ModalEditarUsuario } from './modals/ModalEditarUsuario';
import { ModalExcluirUsuario } from './modals/ModalExcluirUsuario';

interface GerenciarUsuariosProps { onBack: () => void; }

export function GerenciarUsuarios({ onBack }: GerenciarUsuariosProps) {
  const { user: currentUser } = useAuth();
  
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showToast, setShowToast] = useState({ visible: false, msg: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [busca, setBusca] = useState('');
  
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<any>(null);
  const [deletando, setDeletando] = useState(false);

  useEffect(() => { fetchDados(); }, []);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const { data: rolesData } = await supabase
        .from('roles')
        .select(`
          id, 
          nome, 
          role_permissoes ( 
            permissoes ( 
              id,
              nome,
              descricao,
              setor_id 
            ) 
          )
        `)
        .order('nome');
        
      if (rolesData) setRoles(rolesData);

      const { data: setoresData } = await supabase.from('setores').select('id, nome').order('nome');
      if (setoresData) setSetores(setoresData);

      const { data: usersData, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          id, nome, email, crm, is_active,
          usuario_alocacoes (
            setor_id,
            setores (nome),
            role_id,
            roles (nome)
          )
        `)
        .eq('is_hidden', false) // FILTRO ADICIONADO AQUI
        .order('nome');

      if (fetchError) throw fetchError;
      if (usersData) setUsuarios(usersData);
    } catch (error: any) {
      setErrorMsg('Erro ao carregar dados: ' + error.message);
    } finally { setLoading(false); }
  };

  const handleCreateUser = async (data: UsuarioFormType) => {
    setSubmitting(true);
    try {
      const alocacoes = data.setoresSelecionados.map(setorId => ({
        setor_id: setorId,
        role_id: parseInt(data.roleId)
      }));

      const response = await supabase.functions.invoke('criar-usuario', {
        body: { 
          nome: data.nome, 
          email: data.email, 
          senha: data.senha, 
          crm: data.crm || null, 
          alocacoes: alocacoes 
        }
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      setShowToast({ visible: true, msg: "Usuário cadastrado!" });
      fetchDados();
    } catch (error: any) { 
      setErrorMsg(error.message); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const toggleStatusUsuario = async (id: string, statusAtual: boolean) => {
    const usuarioAlvo = usuarios.find(u => u.id === id);
    if (id === currentUser?.id || (usuarioAlvo && usuarioAlvo.email === currentUser?.email)) {
      setErrorMsg('Operação negada: Você não pode bloquear sua própria conta ativa.');
      return;
    }
    await supabase.from('profiles').update({ is_active: !statusAtual }).eq('id', id);
    fetchDados();
  };

  const confirmarExclusao = async () => {
    if (!usuarioSelecionado) return;
    
    if (usuarioSelecionado.id === currentUser?.id || usuarioSelecionado.email === currentUser?.email) {
      setErrorMsg('Operação negada: Você não pode excluir sua própria conta ativa.');
      setModalExcluirOpen(false);
      return;
    }

    setDeletando(true);
    try {
      const response = await supabase.functions.invoke('deletar-usuario', {
        body: { user_id: usuarioSelecionado.id }
      });
      if (response.error) throw response.error;
      
      setShowToast({ visible: true, msg: "Usuário excluído permanentemente!" });
      setModalExcluirOpen(false);
      fetchDados();
    } catch (error) {
      setErrorMsg('Erro: este usuário possui registros atrelados e não pode ser apagado fisicamente. Você deve bloqueá-lo.');
      setModalExcluirOpen(false);
    } finally {
      setDeletando(false);
    }
  };

  const usuariosFiltrados = usuarios.filter(u => 
    (u.nome || '').toLowerCase().includes(busca.toLowerCase()) || (u.email || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-300">
      <div className="p-6 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
        <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-4 font-medium">
          <Link to="/" className="hover:text-blue-600 flex items-center gap-1"><Home size={14} /> Home</Link>
          <ChevronRight size={14} /><button onClick={onBack} className="hover:text-blue-600">Administração</button>
          <ChevronRight size={14} /><span className="text-slate-800 dark:text-slate-200 font-bold">Usuários</span>
        </nav>
        <Title className="!text-2xl !mb-0 flex items-center gap-2"><Users size={28} className="text-blue-500" /> Gestão de Usuários</Title>
        <Description>Cadastre profissionais e gerencie acessos.</Description>
      </div>

      <div className="p-6 space-y-6">
        <FormularioUsuario 
          roles={roles} 
          setores={setores} 
          submitting={submitting} 
          onSubmit={handleCreateUser} 
          setErrorMsg={setErrorMsg}
        />

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm min-h-[500px] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center gap-4">
              <h3 className="font-bold text-gray-800 dark:text-slate-200">Usuários Cadastrados</h3>
              <div className="relative w-72">
                 <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                 <input type="text" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg text-sm" />
              </div>
          </div>

          <div className="hidden md:flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/30 border-b border-gray-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
            <div className="flex-1">Usuário / E-mail</div>
            <div className="flex-1 text-center">Cargo</div>
            <div className="flex-1 text-center">Setor</div>
            <div className="w-72 text-right pr-8">Ações</div>
          </div>

          <div className="flex-1 overflow-auto divide-y divide-gray-100 dark:divide-slate-800">
            {loading ? <div className="p-10 text-center">Carregando...</div> :
              usuariosFiltrados.map(user => (
                <ItemUsuario 
                  key={user.id} 
                  user={user} 
                  isCurrentUser={user.email === currentUser?.email}
                  onEdit={(u) => { setUsuarioSelecionado(u); setModalEditarOpen(true); }} 
                  onDelete={(u) => { setUsuarioSelecionado(u); setModalExcluirOpen(true); }} 
                  onToggleStatus={toggleStatusUsuario} 
                />
              ))
            }
          </div>
        </div>
      </div>

      <ModalEditarUsuario isOpen={modalEditarOpen} onClose={() => setModalEditarOpen(false)} usuario={usuarioSelecionado} roles={roles} setores={setores} onSuccess={fetchDados} />
      <ModalExcluirUsuario isOpen={modalExcluirOpen} onClose={() => setModalExcluirOpen(false)} usuario={usuarioSelecionado} loading={deletando} onConfirm={confirmarExclusao} />

      {showToast.visible && <Toast message={showToast.msg} onClose={() => setShowToast({ visible: false, msg: '' })} />}
      <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Users, Shield, CheckCircle2, XCircle, ChevronRight, Home, UserPlus, Mail, Lock, Building2, Info, Search, Edit2, Trash2 } from 'lucide-react';
import { Toast } from '../../components/ui/Toast';
import { ToastError } from '../../components/ui/ToastError';
import { Title, Description } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';

// IMPORTS DOS MODAIS LOCAIS
import { ModalEditarUsuario } from './modals/ModalEditarUsuario';
import { ModalExcluirUsuario } from './modals/ModalExcluirUsuario';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// === SCHEMA DE VALIDAÇÃO ZOD ===
const formSchema = z.object({
  nome: z.string().min(1, 'O campo "Nome Completo" é obrigatório'),
  email: z.string()
    .min(1, 'O campo "E-mail" é obrigatório')
    .email('O campo "E-mail" é inválido'),
  senha: z.string().min(6, 'O campo "Senha" deve ter no mínimo 6 caracteres'),
  roleId: z.string().min(1, 'O campo "Nível de Acesso" é obrigatório'),
  setoresSelecionados: z.array(z.number()).min(1, 'O campo "Setores" é obrigatório'),
  crm: z.string().optional().refine(val => !val || (val.length >= 4 && val.length <= 5), {
    message: 'O campo "CRM" deve ter 4 ou 5 dígitos'
  })
});

type UsuarioFormType = z.infer<typeof formSchema>;

type Role = { id: number; nome: string; role_permissoes: { permissoes: { descricao: string } }[]; };
type Setor = { id: number; nome: string };
type Perfil = {
  id: string; nome: string; email: string; crm: string | null; is_active: boolean; role_id: number;
  roles: { nome: string }; usuario_setores: { setor_id: number, setores: { nome: string } }[];
};

interface GerenciarUsuariosProps { onBack: () => void; }

export function GerenciarUsuarios({ onBack }: GerenciarUsuariosProps) {
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [showToast, setShowToast] = useState({ visible: false, msg: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const [busca, setBusca] = useState('');
  
  // Controle dos Modais
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Perfil | null>(null);
  const [deletando, setDeletando] = useState(false);

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors }
  } = useForm<UsuarioFormType>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '', email: '', senha: '', roleId: '', setoresSelecionados: [], crm: '' }
  });

  const formValues = watch();
  const roleSelecionada = roles.find(r => r.id.toString() === formValues.roleId);

  useEffect(() => { fetchDados(); }, []);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles').select(`id, nome, role_permissoes ( permissoes ( descricao ) )`).order('nome');
      if (rolesError) throw rolesError;
      if (rolesData) setRoles(rolesData as unknown as Role[]);

      const { data: setoresData, error: setoresError } = await supabase
        .from('setores').select('id, nome').order('nome');
      if (setoresError) throw setoresError;
      if (setoresData) setSetores(setoresData);

      const { data: usersData, error: usersError } = await supabase
        .from('profiles').select(`
          id, nome, email, crm, is_active, role_id,
          roles(nome),
          usuario_setores ( setor_id, setores (nome) )
        `).order('nome');
      if (usersError) throw usersError;
      if (usersData) setUsuarios(usersData as unknown as Perfil[]);
    } catch (error) {
      setErrorMsg('Erro ao carregar dados do banco.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSetor = (id: number) => {
    const atuais = formValues.setoresSelecionados || [];
    const jaExiste = atuais.includes(id);
    setValue('setoresSelecionados', jaExiste ? atuais.filter(s => s !== id) : [...atuais, id], { shouldValidate: true });
  };

  const onError = (errosIncorretos: any) => {
    const firstErrorField = Object.keys(errosIncorretos)[0];
    const element = document.getElementById(firstErrorField);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setErrorMsg("Por favor, preencha corretamente os campos em vermelho.");
  };

  const onSubmit = async (data: UsuarioFormType) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const response = await supabase.functions.invoke('criar-usuario', {
        body: { 
          nome: data.nome, email: data.email, senha: data.senha, 
          crm: data.crm || null, role_id: parseInt(data.roleId), setores_ids: data.setoresSelecionados 
        }
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      setShowToast({ visible: true, msg: "Usuário cadastrado com sucesso!" });
      reset({ nome: '', email: '', senha: '', roleId: '', setoresSelecionados: [], crm: '' });
      fetchDados();
    } catch (error: any) {
      setErrorMsg(error.message || 'Erro ao processar requisição no banco de dados.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatusUsuario = async (id: string, statusAtual: boolean) => {
    try {
      const { error } = await supabase.from('profiles').update({ is_active: !statusAtual }).eq('id', id);
      if (error) throw error;
      fetchDados();
    } catch (error) {
      setErrorMsg('Erro ao alterar status do usuário.');
    }
  };

  const confirmarExclusao = async () => {
    if (!usuarioSelecionado) return;
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

  const abrirEdicao = (user: Perfil) => {
    setUsuarioSelecionado(user);
    setModalEditarOpen(true);
  };

  const usuariosFiltrados = usuarios.filter(u => {
    const n = u.nome || '';
    const e = u.email || '';
    const c = u.crm || '';
    const term = busca.toLowerCase();
    return n.toLowerCase().includes(term) || e.toLowerCase().includes(term) || c.toLowerCase().includes(term);
  });

  return (
    <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="px-6 pt-6 pb-2 bg-white dark:bg-slate-900">
        <nav className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
          <Link to="/" className="hover:text-blue-600 flex items-center gap-1"><Home size={14} /><span>Home</span></Link>
          <ChevronRight size={14} /><button type="button" onClick={onBack} className="hover:text-blue-600">Administração</button>
          <ChevronRight size={14} /><span className="text-slate-800 dark:text-slate-200 font-bold">Usuários</span>
        </nav>
      </div>

      <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Title className="!text-2xl !mb-0 flex items-center gap-2 text-gray-800 dark:text-white">
          <Users size={28} className="text-blue-500" /> Gestão de Usuários
        </Title>
        <Description className="!mt-1">Cadastre profissionais, vincule aos setores e defina permissões de acesso.</Description>
      </div>

      <div className="p-6 space-y-6">
        {/* FORMULÁRIO DE CRIAÇÃO */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100 dark:border-slate-800">
            <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-slate-200">
              <UserPlus size={18} className="text-blue-500"/> Novo Usuário
            </h3>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div id="nome">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Nome Completo <span className="text-red-500">*</span></label>
                <input type="text" {...register('nome')} className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.nome ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500`} placeholder="Ex: Dr. João Silva" />
                {errors.nome && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.nome.message}</span>}
              </div>

              <div id="email">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">E-mail <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input type="email" {...register('email')} className={`w-full pl-9 bg-slate-50 dark:bg-slate-950 border ${errors.email ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500`} placeholder="joao@proncor.com.br" />
                </div>
                {errors.email && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.email.message}</span>}
              </div>

              <div id="senha">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Senha <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input type="text" {...register('senha')} className={`w-full pl-9 bg-slate-50 dark:bg-slate-950 border ${errors.senha ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500`} placeholder="Mínimo 6 caracteres" />
                </div>
                {errors.senha && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.senha.message}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div id="setoresSelecionados">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-1"><Building2 size={14}/> Setores Permitidos <span className="text-red-500">*</span></label>
                <div className={`space-y-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border ${errors.setoresSelecionados ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} max-h-40 overflow-y-auto`}>
                  {setores.map(s => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-slate-300">
                      <input type="checkbox" checked={formValues.setoresSelecionados?.includes(s.id)} onChange={() => toggleSetor(s.id)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600" />
                      {s.nome}
                    </label>
                  ))}
                </div>
                {errors.setoresSelecionados && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.setoresSelecionados.message}</span>}
              </div>
              
              <div id="roleId">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1"><Shield size={14}/> Nível de Acesso (Cargo) <span className="text-red-500">*</span></label>
                <select {...register('roleId')} className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.roleId ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500`}>
                  <option value="">Selecione o Cargo...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
                {errors.roleId && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.roleId.message}</span>}
              </div>

              <div id="crm">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">CRM (Opcional)</label>
                <input type="text" 
                  {...register('crm')} 
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '').substring(0, 5);
                    e.target.value = val; 
                    setValue('crm', val, { shouldValidate: true }); 
                  }} 
                  maxLength={5}
                  placeholder="Ex: 12345" 
                  className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.crm ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500`} 
                />
                {errors.crm && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.crm.message}</span>}
              </div>
            </div>

            {roleSelecionada && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 mt-2 animate-in fade-in">
                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2 mb-2">
                  <Info size={16}/> Permissões concedidas a este Nível de Acesso:
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-700 dark:text-blue-300 list-inside">
                  {roleSelecionada.role_permissoes.map((rp, idx) => (
                    <li key={idx} className="flex gap-2 items-start">
                      <CheckCircle2 size={14} className="min-w-[14px] mt-0.5 text-blue-500" />
                      <span>{rp.permissoes.descricao}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <div className="w-full md:w-auto">
                <Button type="submit" variant="primary" fullWidth disabled={submitting}>
                  {submitting ? 'Processando...' : 'Cadastrar Novo Usuário'}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* LISTAGEM (Layout travado min-h) */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden min-h-[500px] flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
             <h3 className="font-bold text-gray-800 dark:text-slate-200 whitespace-nowrap">Usuários Cadastrados</h3>
             
             <div className="relative w-full md:w-72">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input type="text" placeholder="Buscar nome, e-mail ou CRM..." value={busca} onChange={e => setBusca(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500" />
             </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-10 text-center text-slate-500">Carregando lista...</div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="p-10 text-center text-slate-400">Nenhum usuário encontrado.</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {usuariosFiltrados.map((user) => (
                  <div key={user.id} className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${user.is_active ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'bg-red-50/50 dark:bg-red-900/10 opacity-75'}`}>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-bold text-base ${user.is_active ? 'text-gray-800 dark:text-slate-200' : 'text-gray-500 line-through'}`}>{user.nome}</h4>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${user.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {user.is_active ? 'Ativo' : 'Bloqueado'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1"><Mail size={14}/> {user.email}</span>
                        {user.crm && <span className="flex items-center gap-1 font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">CRM: {user.crm}</span>}
                      </div>
                    </div>

                    <div className="flex-1 md:text-center text-sm">
                      <div className="font-semibold text-gray-700 dark:text-slate-300 flex items-center md:justify-center gap-1">
                        <Shield size={14} className="text-blue-500"/> {user.roles?.nome || 'Sem Cargo'}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap md:justify-center items-center gap-1">
                        <Building2 size={14}/> 
                        {user.usuario_setores?.length > 0 
                          ? user.usuario_setores.map(us => us.setores.nome).join(', ') 
                          : 'Sem Setor'}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 md:w-72">
                      <button type="button" onClick={() => abrirEdicao(user)} title="Editar Usuário"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-900">
                        <Edit2 size={18} />
                      </button>

                      <button type="button" onClick={() => { setUsuarioSelecionado(user); setModalExcluirOpen(true); }} title="Excluir Definitivamente"
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900">
                        <Trash2 size={18} />
                      </button>

                      <button type="button" onClick={() => toggleStatusUsuario(user.id, user.is_active)}
                        className={`text-sm font-semibold flex items-center gap-1 px-3 py-2 rounded-lg transition-colors border w-28 justify-center ${user.is_active ? 'border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'border-green-200 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                        {user.is_active ? <><XCircle size={14}/> Bloquear</> : <><CheckCircle2 size={14}/> Desbloquear</>}
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ModalEditarUsuario 
        isOpen={modalEditarOpen}
        onClose={() => setModalEditarOpen(false)}
        usuario={usuarioSelecionado}
        roles={roles}
        setores={setores}
        onSuccess={() => {
          setModalEditarOpen(false);
          setShowToast({ visible: true, msg: "Usuário atualizado com sucesso!" });
          fetchDados();
        }}
      />

      <ModalExcluirUsuario
        isOpen={modalExcluirOpen}
        onClose={() => setModalExcluirOpen(false)}
        onConfirm={confirmarExclusao}
        usuario={usuarioSelecionado}
        loading={deletando}
      />

      {showToast.visible && <Toast message={showToast.msg} onClose={() => setShowToast({ visible: false, msg: '' })} />}
      <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />
    </div>
  );
}
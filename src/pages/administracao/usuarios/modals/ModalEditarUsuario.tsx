import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Button } from '../../../../components/ui/Button';
import { ToastError } from '../../../../components/ui/ToastError';
import { Toast } from '../../../../components/ui/Toast';

import { X, Mail, Shield, Building2, User, KeyRound, Info, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

const formSchema = z.object({
  nome: z.string().min(1, 'O campo "Nome Completo" é obrigatório'),
  email: z.string().min(1, 'O campo "E-mail" é obrigatório').email('E-mail inválido'),
  roleId: z.string().min(1, 'O campo "Nível de Acesso" é obrigatório'),
  setoresSelecionados: z.array(z.number()).min(1, 'O campo "Setores" é obrigatório'),
  crm: z.string().optional().refine(val => !val || (val.length >= 4 && val.length <= 5), {
    message: 'O campo "CRM" deve ter 4 ou 5 dígitos'
  }),
  alterarSenhaManual: z.boolean().optional(),
  novaSenha: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.alterarSenhaManual) {
    if (!data.novaSenha || data.novaSenha.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A nova senha deve ter no mínimo 6 caracteres',
        path: ['novaSenha']
      });
    }
  }
});

type EditarUsuarioFormType = z.infer<typeof formSchema>;

interface ModalEditarUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  usuario: any;
  roles: { id: number; nome: string; role_permissoes?: any[] }[];
  setores: { id: number; nome: string }[];
}

export function ModalEditarUsuario({ isOpen, onClose, onSuccess, usuario, roles, setores }: ModalEditarUsuarioProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [mostrarPermissoes, setMostrarPermissoes] = useState(false);
  const [modalConfirmarSenha, setModalConfirmarSenha] = useState(false);
  
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<EditarUsuarioFormType>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '', email: '', roleId: '', setoresSelecionados: [], crm: '', alterarSenhaManual: false, novaSenha: '' }
  });

  const formValues = watch();
  const roleSelecionada = roles.find(r => r.id.toString() === formValues.roleId);
  const alterarSenhaManual = watch('alterarSenhaManual');

  const setoresExibidos = useMemo(() => {
    if (!roleSelecionada || !roleSelecionada.role_permissoes) return setores; 
    const validSetorIds = new Set(
      roleSelecionada.role_permissoes
        .map((rp: any) => rp.permissoes?.setor_id)
        .filter((id: any) => id !== null) 
    );
    const temPermissaoGlobal = roleSelecionada.role_permissoes.some((rp: any) => rp.permissoes?.setor_id === null);
    return setores.filter(s => validSetorIds.has(s.id) || temPermissaoGlobal);
  }, [roleSelecionada, setores]);

  useEffect(() => {
    if (!isOpen) return;
    const setoresMarcados = formValues.setoresSelecionados || [];
    const validos = setoresMarcados.filter(id => setoresExibidos.some(s => s.id === id));
    if (setoresMarcados.length !== validos.length) {
      setValue('setoresSelecionados', validos, { shouldValidate: true });
    }
  }, [formValues.roleId, setoresExibidos, setValue, isOpen]);

  const permissoesExibidas = roleSelecionada?.role_permissoes?.filter((rp: any) => {
    const setorIdPermissao = rp.permissoes?.setor_id;
    if (formValues.setoresSelecionados.length === 0) return true; 
    return setorIdPermissao === null || formValues.setoresSelecionados.includes(setorIdPermissao);
  }) || [];

  useEffect(() => {
    if (isOpen && usuario) {
      const alocacoes = usuario.usuario_alocacoes || [];
      const cargoAtual = alocacoes.length > 0 ? alocacoes[0].role_id?.toString() : '';
      const setoresAtuais = alocacoes.map((a: any) => a.setor_id);

      reset({
        nome: usuario.nome || '',
        email: usuario.email || '',
        roleId: cargoAtual,
        setoresSelecionados: setoresAtuais,
        crm: usuario.crm || '',
        alterarSenhaManual: false,
        novaSenha: ''
      });
      setErrorMsg('');
      setMostrarPermissoes(false);
      setModalConfirmarSenha(false);
      setMostrarSenha(false);
    }
  }, [isOpen, usuario, reset]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalConfirmarSenha) setModalConfirmarSenha(false);
        else if (mostrarPermissoes) setMostrarPermissoes(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, mostrarPermissoes, modalConfirmarSenha]);

  if (!isOpen || !usuario) return null;

  const toggleSetor = (id: number) => {
    const atuais = formValues.setoresSelecionados || [];
    const jaExiste = atuais.includes(id);
    setValue('setoresSelecionados', jaExiste ? atuais.filter(s => s !== id) : [...atuais, id], { shouldValidate: true });
  };

  const onError = (errosIncorretos: any) => {
    const firstErrorField = Object.keys(errosIncorretos)[0];
    const element = document.getElementById(`modal_${firstErrorField}`);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setErrorMsg('Por favor, preencha corretamente os campos em vermelho.');
  };

  const solicitarResetSenha = () => {
    if (!formValues.email) return;
    setModalConfirmarSenha(true);
  };

  const confirmarResetSenha = async () => {
    setEnviandoEmail(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formValues.email, {
        redirectTo: `${window.location.origin}/trocar-senha`,
      });
      if (error) throw error;
      setToastMsg(`Link de redefinição enviado para ${formValues.email}`);
      setModalConfirmarSenha(false);
    } catch (err: any) {
      setErrorMsg('Não foi possível reiniciar a senha do usuário no momento, tente novamente mais tarde.');
      setModalConfirmarSenha(false);
    } finally {
      setEnviandoEmail(false);
    }
  };

  const onSubmit = async (data: EditarUsuarioFormType) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const alocacoes = data.setoresSelecionados.map(id => ({
        setor_id: id,
        role_id: parseInt(data.roleId)
      }));

      const payload: any = {
        user_id: usuario.id,
        nome: data.nome, 
        email: data.email, 
        crm: data.crm || null,
        alocacoes: alocacoes
      };

      if (data.alterarSenhaManual && data.novaSenha) {
        payload.novaSenha = data.novaSenha;
      }

      const response = await supabase.functions.invoke('editar-usuario', {
        body: payload
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      onSuccess();
      onClose();
    } catch (error: any) {
      setErrorMsg(error.message || 'Erro ao atualizar usuário.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={onClose} />
        
        <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
          
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <User className="text-blue-500" size={24} />
              Editar Usuário
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            <form id="form-editar-usuario" onSubmit={handleSubmit(onSubmit, onError)} className="space-y-5" noValidate>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div id="modal_nome">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Nome Completo <span className="text-red-500">*</span></label>
                  <input type="text" 
                    {...register('nome')} 
                    onChange={(e) => {
                      const val = e.target.value.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                      e.target.value = val;
                      setValue('nome', val, { shouldValidate: true });
                    }}
                    className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.nome ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500`} 
                  />
                  {errors.nome && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.nome.message}</span>}
                </div>

                <div id="modal_email">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">E-mail de Acesso <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail size={16} className="absolute left-3 top-3 text-gray-400 z-10" />
                      <input 
                        type="email" 
                        autoComplete="off"
                        {...register('email')} 
                        className={`w-full pl-9 bg-slate-50 dark:bg-slate-950 border rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500 ${errors.email ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} [&:-webkit-autofill]:shadow-[0_0_0px_1000px_#f8fafc_inset] dark:[&:-webkit-autofill]:shadow-[0_0_0px_1000px_#020617_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#1e293b] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#e2e8f0]`} 
                      />
                    </div>
                    <Button type="button" variant="ghost" className="px-3" onClick={solicitarResetSenha} disabled={enviandoEmail} title="Enviar e-mail para redefinir senha">
                      <KeyRound size={18} className="text-slate-500" />
                    </Button>
                  </div>
                  {errors.email && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.email.message}</span>}
                </div>

                <div className="md:col-span-2 flex flex-col gap-3 border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/30">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700 dark:text-slate-300 w-fit">
                    <input 
                      type="checkbox" 
                      {...register('alterarSenhaManual')} 
                      onChange={(e) => {
                        setValue('alterarSenhaManual', e.target.checked);
                        if (!e.target.checked) setValue('novaSenha', '');
                      }} 
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
                    />
                    Definir nova senha de acesso manualmente
                  </label>

                  {alterarSenhaManual && (
                    <div id="modal_novaSenha" className="animate-in fade-in slide-in-from-top-2 duration-300 md:w-1/2">
                      <div className="relative">
                        <KeyRound size={16} className="absolute left-3 top-3 text-gray-400 z-10" />
                        <input 
                          type={mostrarSenha ? "text" : "password"} 
                          autoComplete="new-password"
                          {...register('novaSenha')} 
                          placeholder="Mínimo 6 caracteres"
                          className={`w-full pl-9 pr-10 bg-white dark:bg-slate-950 border rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500 ${errors.novaSenha ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} [&:-webkit-autofill]:shadow-[0_0_0px_1000px_#ffffff_inset] dark:[&:-webkit-autofill]:shadow-[0_0_0px_1000px_#020617_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#1e293b] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#e2e8f0]`} 
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarSenha(!mostrarSenha)}
                          className="absolute right-3 top-2.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
                          tabIndex={-1}
                        >
                          {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {errors.novaSenha && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.novaSenha.message}</span>}
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Info size={12}/> O usuário será forçado a trocar esta senha no próximo login.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div id="modal_roleId" className="flex flex-col">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1"><Shield size={14}/> 1. Nível de Acesso (Cargo) <span className="text-red-500">*</span></label>
                  <select {...register('roleId')} 
                    className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.roleId ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500`}
                  >
                    <option value="">Selecione...</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                  </select>
                  {errors.roleId && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.roleId.message}</span>}
                </div>

                <div id="modal_setoresSelecionados">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-1"><Building2 size={14}/> 2. Setores Permitidos <span className="text-red-500">*</span></label>
                  <div className={`space-y-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border ${errors.setoresSelecionados ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} max-h-40 overflow-y-auto`}>
                    {setoresExibidos.length > 0 ? (
                      setoresExibidos.map(s => (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-slate-300">
                          <input type="checkbox" checked={formValues.setoresSelecionados?.includes(s.id)} onChange={() => toggleSetor(s.id)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                          {s.nome}
                        </label>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">Selecione um cargo primeiro...</span>
                    )}
                  </div>
                  {errors.setoresSelecionados && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.setoresSelecionados.message}</span>}
                </div>

                <div id="modal_crm" className="md:col-span-2">
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
                    className={`w-full md:w-1/2 bg-slate-50 dark:bg-slate-950 border ${errors.crm ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500`} 
                  />
                  {errors.crm && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.crm.message}</span>}
                </div>
              </div>

              {roleSelecionada && formValues.setoresSelecionados.length > 0 && (
                <div className="flex justify-start mt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setMostrarPermissoes(true)} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    <Info size={16} className="mr-2" /> Ver Permissões Ativas
                  </Button>
                </div>
              )}
            </form>
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 bg-gray-50 dark:bg-slate-900/50 rounded-b-2xl">
            <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" form="form-editar-usuario" variant="primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </div>

      {modalConfirmarSenha && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setModalConfirmarSenha(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-2">Redefinir Senha</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Tem certeza que deseja enviar um link de redefinição para <strong>{formValues.email}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModalConfirmarSenha(false)} disabled={enviandoEmail}>Cancelar</Button>
              <Button variant="primary" onClick={confirmarResetSenha} disabled={enviandoEmail}>
                {enviandoEmail ? 'Enviando...' : 'Sim, Enviar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {mostrarPermissoes && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" onClick={() => setMostrarPermissoes(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <Shield className="text-blue-500" size={20} />
                Permissões: {roleSelecionada?.nome}
              </h3>
              <button type="button" onClick={() => setMostrarPermissoes(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <ul className="grid grid-cols-1 gap-3 text-sm text-slate-700 dark:text-slate-300">
                {permissoesExibidas.map((rp: any, idx: number) => (
                  <li key={idx} className="flex gap-2 items-start">
                    <CheckCircle2 size={16} className="min-w-[16px] mt-0.5 text-blue-500" />
                    <span>{rp.permissoes.descricao}</span>
                  </li>
                ))}
              </ul>
              {permissoesExibidas.length === 0 && (
                <p className="text-slate-500 italic text-sm text-center py-4">Nenhuma permissão ativa para os setores selecionados.</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-end">
              <Button variant="secondary" onClick={() => setMostrarPermissoes(false)}>Fechar Detalhes</Button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-[9999]">
        <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />
        {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg('')} />}
      </div>
    </>
  );
}
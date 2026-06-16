import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, UserPlus, Building2, Shield, Info, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { MedidorForcaSenha } from '../../../components/ui/MedidorForcaSenha';

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

export type UsuarioFormType = z.infer<typeof formSchema>;

interface FormularioUsuarioProps {
  roles: any[];
  setores: any[];
  submitting: boolean;
  onSubmit: (data: UsuarioFormType) => Promise<void>;
  setErrorMsg: (msg: string) => void;
}

export function FormularioUsuario({ roles, setores, submitting, onSubmit, setErrorMsg }: FormularioUsuarioProps) {
  const [mostrarSenha, setMostrarSenha] = useState(false); // NOVO ESTADO

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors }
  } = useForm<UsuarioFormType>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '', email: '', senha: '', roleId: '', setoresSelecionados: [], crm: '' }
  });

  const formValues = watch();
  const senhaAtual = watch('senha');

  const roleSelecionada = roles.find(r => r.id.toString() === formValues.roleId);

  const setoresExibidos = useMemo(() => {
    if (!roleSelecionada) return setores; 

    const validSetorIds = new Set(
      roleSelecionada.role_permissoes
        .map((rp: any) => rp.permissoes?.setor_id)
        .filter((id: any) => id !== null) 
    );

    const temPermissaoGlobal = roleSelecionada.role_permissoes.some((rp: any) => rp.permissoes?.setor_id === null);

    return setores.filter(s => validSetorIds.has(s.id) || temPermissaoGlobal);
  }, [roleSelecionada, setores]);

  useEffect(() => {
    const setoresMarcados = formValues.setoresSelecionados || [];
    const validos = setoresMarcados.filter(id => setoresExibidos.some(s => s.id === id));
    
    if (setoresMarcados.length !== validos.length) {
      setValue('setoresSelecionados', validos, { shouldValidate: true });
    }
  }, [formValues.roleId, setoresExibidos, setValue]);

  const permissoesExibidas = roleSelecionada?.role_permissoes.filter((rp: any) => {
    const setorIdPermissao = rp.permissoes?.setor_id;
    if (formValues.setoresSelecionados.length === 0) return true; 
    return setorIdPermissao === null || formValues.setoresSelecionados.includes(setorIdPermissao);
  }) || [];

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

  const handleLocalSubmit = async (data: UsuarioFormType) => {
    await onSubmit(data);
    reset({ nome: '', email: '', senha: '', roleId: '', setoresSelecionados: [], crm: '' });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100 dark:border-slate-800">
        <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-slate-200">
          <UserPlus size={18} className="text-blue-500"/> Novo Usuário
        </h3>
      </div>
      
      <form onSubmit={handleSubmit(handleLocalSubmit, onError)} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div id="nome">
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Nome Completo <span className="text-red-500">*</span></label>
            <input type="text" 
              {...register('nome')} 
              onChange={(e) => {
                const val = e.target.value
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                e.target.value = val;
                setValue('nome', val, { shouldValidate: true });
              }}
              className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.nome ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500`} 
              placeholder="Ex: Dr. João Silva" 
            />
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
              {/* ALTERADO: type dinâmico e botão para toggle */}
<input 
  type={mostrarSenha ? "text" : "password"} 
  {...register('senha')} 
  autoComplete="new-password"
  data-lpignore="true"
  className={`w-full pl-9 pr-10 bg-slate-50 dark:bg-slate-950 border ${errors.senha ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500 dark:[&:-webkit-autofill]:[Webkit-box-shadow:0_0_0_1000px_#0f172a_inset] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#f1f5f9]`} 
  placeholder="Mínimo 6 caracteres" 
/>
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-2.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                tabIndex={-1}
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <MedidorForcaSenha senha={senhaAtual || ''} />
            {errors.senha && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.senha.message}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div id="roleId">
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1"><Shield size={14}/> 1. Nível de Acesso (Cargo) <span className="text-red-500">*</span></label>
            <select {...register('roleId')} className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.roleId ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500`}>
              <option value="">Selecione o Cargo...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
            {errors.roleId && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.roleId.message}</span>}
          </div>

          <div id="setoresSelecionados">
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-1"><Building2 size={14}/> 2. Setores Permitidos <span className="text-red-500">*</span></label>
            <div className={`space-y-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border ${errors.setoresSelecionados ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} max-h-40 overflow-y-auto`}>
              {setoresExibidos.length > 0 ? (
                setoresExibidos.map(s => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-slate-300">
                    <input type="checkbox" checked={formValues.setoresSelecionados?.includes(s.id)} onChange={() => toggleSetor(s.id)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600" />
                    {s.nome}
                  </label>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">Selecione um cargo primeiro...</span>
              )}
            </div>
            {errors.setoresSelecionados && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.setoresSelecionados.message}</span>}
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

        {roleSelecionada && permissoesExibidas.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 mt-2 animate-in fade-in">
            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2 mb-2">
              <Info size={16}/> Permissões ativas para este contexto:
            </h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-700 dark:text-blue-300 list-inside">
              {permissoesExibidas.map((rp: any, idx: number) => (
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
  );
}
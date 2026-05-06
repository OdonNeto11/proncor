import React, { useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../../components/ui/Button';
import { ToastError } from '../../../components/ui/ToastError';

import { X, Mail, Shield, Building2, User } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// === SCHEMA DE VALIDAÇÃO ZOD ===
const formSchema = z.object({
  nome: z.string().min(1, 'O campo "Nome Completo" é obrigatório'),
  roleId: z.string().min(1, 'O campo "Nível de Acesso" é obrigatório'),
  setoresSelecionados: z.array(z.number()).min(1, 'O campo "Setores" é obrigatório'),
  crm: z.string().optional().refine(val => !val || (val.length >= 4 && val.length <= 5), {
    message: 'O campo "CRM" deve ter 4 ou 5 dígitos'
  })
});

type EditarUsuarioFormType = z.infer<typeof formSchema>;

interface ModalEditarUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  usuario: any;
  roles: { id: number; nome: string }[];
  setores: { id: number; nome: string }[];
}

export function ModalEditarUsuario({ isOpen, onClose, onSuccess, usuario, roles, setores }: ModalEditarUsuarioProps) {
  const [loading, ReactSetLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors }
  } = useForm<EditarUsuarioFormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '', roleId: '', setoresSelecionados: [], crm: ''
    }
  });

  const formValues = watch();

  useEffect(() => {
    if (isOpen && usuario) {
      reset({
        nome: usuario.nome || '',
        roleId: usuario.role_id?.toString() || '',
        setoresSelecionados: usuario.usuario_setores?.map((us: any) => us.setor_id) || [],
        crm: usuario.crm || ''
      });
      setErrorMsg('');
    }
  }, [isOpen, usuario, reset]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen || !usuario) return null;

  const toggleSetor = (id: number) => {
    const atuais = formValues.setoresSelecionados || [];
    const jaExiste = atuais.includes(id);
    setValue('setoresSelecionados', jaExiste ? atuais.filter(s => s !== id) : [...atuais, id], { shouldValidate: true });
  };

  const onError = (errosIncorretos: any) => {
    const firstErrorField = Object.keys(errosIncorretos)[0];
    const element = document.getElementById(`modal_${firstErrorField}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setErrorMsg('Por favor, preencha corretamente os campos em vermelho.');
  };

  const onSubmit = async (data: EditarUsuarioFormType) => {
    ReactSetLoading(true);
    setErrorMsg('');
    try {
      const { error: pError } = await supabase.from('profiles')
        .update({ nome: data.nome, crm: data.crm || null, role_id: parseInt(data.roleId) })
        .eq('id', usuario.id);
      if (pError) throw pError;

      await supabase.from('usuario_setores').delete().eq('user_id', usuario.id);
      if (data.setoresSelecionados.length > 0) {
        const novosSetores = data.setoresSelecionados.map(id => ({ user_id: usuario.id, setor_id: id }));
        const { error: sError } = await supabase.from('usuario_setores').insert(novosSetores);
        if (sError) throw sError;
      }

      onSuccess();
    } catch (error: any) {
      setErrorMsg(error.message || 'Erro ao atualizar usuário no banco de dados.');
    } finally {
      ReactSetLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
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
            
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-gray-200 dark:border-slate-800 flex items-center gap-3">
              <Mail className="text-slate-400" size={20} />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">E-mail de Acesso (Não alterável)</p>
                <p className="text-sm font-bold text-gray-700 dark:text-slate-300">{usuario.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div id="modal_nome">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Nome Completo <span className="text-red-500">*</span></label>
                <input type="text" {...register('nome')} 
                  className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.nome ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500`} 
                />
                {errors.nome && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.nome.message}</span>}
              </div>

              <div id="modal_crm">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">CRM (Opcional)</label>
                <input type="text" 
                  {...register('crm')} 
                  onChange={(e) => {
                    // Máscara rigorosa: Apenas números e máximo de 5 caracteres
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div id="modal_roleId">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1"><Shield size={14}/> Nível de Acesso (Cargo) <span className="text-red-500">*</span></label>
                <select {...register('roleId')} 
                  className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.roleId ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500`}
                >
                  <option value="">Selecione...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
                {errors.roleId && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.roleId.message}</span>}
              </div>

              <div id="modal_setoresSelecionados">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-1"><Building2 size={14}/> Setores Permitidos <span className="text-red-500">*</span></label>
                <div className={`space-y-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border ${errors.setoresSelecionados ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} max-h-40 overflow-y-auto`}>
                  {setores.map(s => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-slate-300">
                      <input type="checkbox" checked={formValues.setoresSelecionados?.includes(s.id)} onChange={() => toggleSetor(s.id)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      {s.nome}
                    </label>
                  ))}
                </div>
                {errors.setoresSelecionados && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.setoresSelecionados.message}</span>}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 bg-gray-50 dark:bg-slate-900/50 rounded-b-2xl">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" form="form-editar-usuario" variant="primary" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>

      </div>
      
      <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />
    </div>
  );
}
import React, { useState } from 'react';
import { KeyRound, ShieldCheck, LogOut, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { ToastError } from '../../components/ui/ToastError';
import { AuthLayout } from '../../components/AuthLayout';
import { MedidorForcaSenha } from '../../components/ui/MedidorForcaSenha';

const formSchema = z.object({
  senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  confirmarSenha: z.string().min(6, 'A confirmação deve ter no mínimo 6 caracteres')
}).refine((data) => data.senha === data.confirmarSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"]
});

type TrocarSenhaFormType = z.infer<typeof formSchema>;

export function TrocarSenha() {
  const { user, signOut } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<TrocarSenhaFormType>({
    resolver: zodResolver(formSchema),
    defaultValues: { senha: '', confirmarSenha: '' }
  });

  const senhaAtual = watch('senha');

  const onSubmit = async (data: TrocarSenhaFormType) => {
    if (!user) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const { error: authError } = await supabase.auth.updateUser({ password: data.senha });
      
      // IGNORA O ERRO DE SENHA IGUAL (BYPASS)
      if (authError && !authError.message.toLowerCase().includes('different from the old password')) {
        throw authError; 
      }

      // EXECUTA A SUA FUNÇÃO RPC INTACTA
      const { error: profileError } = await supabase.rpc('concluir_primeiro_acesso');
      if (profileError) throw profileError;

      await signOut();
      window.location.href = '/login';
    } catch (error: any) {
      setErrorMsg(error.message || 'Erro ao processar a troca de senha. Tente novamente.');
    } finally {
      setLoading(false);
    } 
  };

  return (
    <AuthLayout>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800/50 animate-in zoom-in-95 duration-300">
        
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/40 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-200 dark:border-blue-900/30">
            <KeyRound size={32} className="text-blue-600 dark:text-blue-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-50 mb-2">Atualize sua Senha</h1>
        <p className="text-center text-slate-600 dark:text-slate-400 mb-8 text-sm">
          Por questões de segurança, cadastre uma nova senha para acessar o sistema.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Nova Senha</label>
            <div className="relative">
              <input 
                type={mostrarSenha ? "text" : "password"} 
                {...register('senha')} 
                placeholder="Mínimo de 6 caracteres"
                className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.senha ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} rounded-lg pl-3 pr-10 py-3 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors`} 
              />
              <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" tabIndex={-1}>
                {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <MedidorForcaSenha senha={senhaAtual || ''} />

            {errors.senha && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.senha.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Confirmar Nova Senha</label>
            <div className="relative">
              <input 
                type={mostrarConfirmar ? "text" : "password"} 
                {...register('confirmarSenha')} 
                placeholder="Repita a nova senha"
                className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.confirmarSenha ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-200 dark:border-slate-700'} rounded-lg pl-3 pr-10 py-3 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors`} 
              />
              <button type="button" onClick={() => setMostrarConfirmar(!mostrarConfirmar)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" tabIndex={-1}>
                {mostrarConfirmar ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmarSenha && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.confirmarSenha.message}</span>}
          </div>

          <div className="pt-4 space-y-3">
            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              <div className="flex items-center justify-center gap-2">
                {loading ? 'Atualizando...' : <><ShieldCheck size={18} /> Salvar Nova Senha</>}
              </div>
            </Button>
            <button type="button" onClick={() => signOut()} className="w-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                <LogOut size={16} /> Sair do Sistema
            </button>
          </div>
        </form>
      </div>
      <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />
    </AuthLayout>
  );
}
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, Sun, Moon } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { ToastError } from '../../components/ui/ToastError';

const formSchema = z.object({
  email: z.string().min(1, 'O E-mail é obrigatório').email('Digite um e-mail válido')
});

type EsqueciSenhaFormType = z.infer<typeof formSchema>;

export function EsqueciSenha() {
  // --- LÓGICA DO MODO DARK ---
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return true;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);
  // ---------------------------

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const { register, handleSubmit, setError, formState: { errors } } = useForm<EsqueciSenhaFormType>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' }
  });

  const onSubmit = async (data: EsqueciSenhaFormType) => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. VALIDAÇÃO EXPLÍCITA NO BANCO
      const { data: emailExiste, error: rpcError } = await supabase.rpc('verificar_email_existe', {
        p_email: data.email
      });

      if (rpcError) throw rpcError;

      if (!emailExiste) {
        setError('email', { 
          type: 'manual', 
          message: 'E-mail não encontrado em nossa base de dados.' 
        });
        setLoading(false);
        return;
      }

      // 2. SOLICITAÇÃO AO SUPABASE
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/trocar-senha`,
      });
      
      if (resetError) throw resetError;
      
      setSucesso(true);
    } catch (error: any) {
      // TRATAMENTO DE ERRO DE RATE LIMIT (HUMANIZADO)
      if (error.message?.includes('rate limit') || error.status === 429) {
        setErrorMsg('Muitas solicitações em pouco tempo. Por segurança, aguarde alguns minutos antes de tentar novamente.');
      } else {
        setErrorMsg(error.message || 'Erro ao solicitar recuperação. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      
      {/* BOTÃO DE SOL/LUA FLUTUANTE */}
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={() => setIsDark(!isDark)}
          className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-yellow-400 hover:ring-2 hover:ring-blue-400 transition-all"
          title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {isDark ? <Sun size={22} /> : <Moon size={22} />}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800/50 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6">
          <Mail size={32} className="text-blue-600 dark:text-blue-500" />
        </div>

        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-50 mb-2">Recuperar Senha</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm">
          Digite o e-mail vinculado à sua conta. Enviaremos um link seguro para você redefinir sua senha.
        </p>

        {sucesso ? (
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-xl border border-green-200 dark:border-green-800/50 text-sm font-medium">
              E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada e spam.
            </div>
            <Link to="/login" className="inline-flex items-center justify-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              <ArrowLeft size={16} /> Voltar para o Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Seu E-mail</label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-3 text-slate-400" />
                <input 
                  type="email" 
                  {...register('email')}
                  placeholder="exemplo@proncor.com.br"
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border ${errors.email ? 'border-red-500 ring-1 ring-red-500/30' : 'border-slate-200 dark:border-slate-700'} rounded-xl text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors [&:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#f8fafc]`}
                />
              </div>
              {errors.email && <span className="text-xs text-red-500 mt-1 font-bold block">{errors.email.message}</span>}
            </div>

            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              <div className="flex items-center justify-center gap-2">
                {loading ? 'Validando...' : <><Send size={18} /> Enviar Link de Recuperação</>}
              </div>
            </Button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex items-center justify-center gap-2">
                <ArrowLeft size={16} /> Voltar para o Login
              </Link>
            </div>
          </form>
        )}
      </div>
      <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />
    </div>
  );
}
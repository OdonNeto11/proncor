import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Lock, User, Loader2, Sun, Moon } from 'lucide-react';

// COMPONENTES OFICIAIS SENDO USADOS
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';

export function Login() {
  const navigate = useNavigate();
  
  // --- LÓGICA DO MODO DARK NO LOGIN ---
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return true; // <-- PADRÃO AGORA É DARK MODE
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
  // ------------------------------------

  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    let emailParaEnviar = loginInput.trim();
    if (!emailParaEnviar.includes('@')) {
      emailParaEnviar = `${emailParaEnviar}@proncor.com.br`;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailParaEnviar,
      password,
    });

    if (error) {
      setErrorMsg('Usuário ou senha incorretos.');
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
      
      {/* BOTÃO DE SOL/LUA FLUTUANTE */}
      <div className="absolute top-6 right-6">
        <button 
          onClick={() => setIsDark(!isDark)}
          className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-yellow-400 hover:ring-2 hover:ring-blue-400 transition-all"
          title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {isDark ? <Sun size={22} /> : <Moon size={22} />}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-8 border border-slate-100 dark:border-slate-800">
        
        <div className="text-center mb-8">
          {/* COMPONENTE DA LOGO */}
          <Logo className="h-20 mx-auto mb-6" />
          
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Sistema de Teleconsultas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Agendamento de Teleconsultas e Retornos</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* COMPONENTE DE INPUT NORMALIZADO */}
          <Input 
            label="Usuário ou Email"
            value={loginInput}
            onChange={e => setLoginInput(e.target.value)}
            placeholder="Ex: plantonista ou seu@email.com"
            icon={<User size={20} />}
            required
          />

          {/* COMPONENTE DE INPUT NORMALIZADO */}
          <Input 
            label="Senha"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            icon={<Lock size={20} />}
            required
          />

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg text-center font-medium border border-red-100 dark:border-red-900/50">
              {errorMsg}
            </div>
          )}

          {/* COMPONENTE DE BUTTON NORMALIZADO */}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Entrar no Sistema'}
          </Button>
        </form>
      </div>
    </div>
  );
}
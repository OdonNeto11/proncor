import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Lock, User, Loader2, Sun, Moon } from 'lucide-react';

// COMPONENTES OFICIAIS
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { Title, Description } from '../../components/ui/Typography';

export function Login() {
  const navigate = useNavigate();
  
  // --- LÓGICA DO MODO DARK NO LOGIN ---
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
    <div className="relative min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-500">
      
      {/* BOTÃO DE SOL/LUA FLUTUANTE */}
      <div className="absolute top-6 right-6">
        <button 
          onClick={() => setIsDark(!isDark)}
          className="p-3 rounded-full bg-slate-50 dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-yellow-400 hover:ring-2 hover:ring-blue-400 transition-all active:scale-90"
          title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {isDark ? <Sun size={22} /> : <Moon size={22} />}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        
        <div className="text-center mb-8">
          <Logo className="h-20 mx-auto mb-6" />
          
          {/* NOME DO SISTEMA NORMALIZADO COM COMPONENTES */}
          <Title size="2xl">SGFH</Title>
          <Description size="lg" className="mt-1 font-medium">
            Portal de Gestão e Fluxo Hospitalar
          </Description>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <Input 
            label="Usuário ou Email"
            value={loginInput}
            onChange={e => setLoginInput(e.target.value)}
            placeholder="Ex: plantonista ou seu@email.com"
            icon={<User size={20} />}
            required
          />

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
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg text-center font-bold border border-red-100 dark:border-red-900/50">
              {errorMsg}
            </div>
          )}

          <Button type="submit" fullWidth disabled={loading} size="lg">
            {loading ? <Loader2 className="animate-spin" /> : 'Entrar no Sistema'}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] font-bold">
            Unidade Proncor Ativa
          </p>
        </div>
      </div>
    </div>
  );
}
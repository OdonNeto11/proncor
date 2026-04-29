import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Lock, User, Loader2, Sun, Moon, Eye, EyeOff } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false); // ESTADO PARA VISIBILIDADE
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
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
      
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
          <Logo className="h-16 mx-auto mb-6" />
          
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Proncor Hub</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Gestão e Fluxo Hospitalar</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <Input 
            label="Usuário ou Email"
            value={loginInput}
            onChange={e => setLoginInput(e.target.value)}
            placeholder="Ex: plantonista ou seu@email.com"
            icon={<User size={20} />}
          />

          <div className="relative">
            <Input 
              label="Senha"
              type={showPassword ? "text" : "password"} // ALTERNA O TIPO
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock size={20} />}
            />
            {/* BOTÃO DO OLHO POSICIONADO ABSOLUTAMENTE */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              tabIndex={-1} // Evita que o Tab pare no olho antes do botão de entrar
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg text-center font-medium border border-red-100 dark:border-red-900/50">
              {errorMsg}
            </div>
          )}

          <div className="pt-2">
            <Button 
              type="submit" 
              fullWidth 
              size="lg"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Entrar no Sistema'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';

// COMPONENTES OFICIAIS SENDO USADOS
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { AuthLayout } from '../../components/AuthLayout';

export function Login() {
  const navigate = useNavigate();
  
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // ESTADO PARA VISIBILIDADE
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    let loginFinal = loginInput.trim();

    try {
      // LÓGICA DE LOGIN POR CRM
      if (!loginFinal.includes('@')) {
        const { data: emailEncontrado, error: rpcError } = await supabase.rpc('get_email_por_crm', {
          p_crm: loginFinal
        });

        // O CONSOLE LOG ESTÁ AQUI PARA DEBUG DA NOSSA FUNÇÃO
        console.log("Resultado da busca do CRM:", { crmBuscado: loginFinal, emailEncontrado, rpcError });

        // Se encontrou o email associado ao CRM, substitui. 
        if (!rpcError && emailEncontrado) {
          loginFinal = emailEncontrado;
        }
      }

      // Agora fazemos o login normal do Supabase com o email (digitado ou traduzido do CRM)
      const { error } = await supabase.auth.signInWithPassword({
        email: loginFinal,
        password,
      });

      if (error) throw error;
      
      navigate('/');
    } catch (error: any) {
      setErrorMsg('E-mail, CRM ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
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
            placeholder="Ex: 12345 ou seu@email.com"
            icon={<User size={20} />}
          />

          <div>
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
            
            {/* LINK DE ESQUECI A SENHA */}
            <div className="flex justify-end mt-2">
              <Link to="/esqueci-senha" className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                Esqueci minha senha?
              </Link>
            </div>
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
    </AuthLayout>
  );
}
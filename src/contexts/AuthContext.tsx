import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type StatusAcesso = 'aprovado' | 'pendente' | 'carregando';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roleId: number | null;
  permissoes: string[];
  profileName: string | null;
  statusAcesso: StatusAcesso;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [permissoes, setPermissoes] = useState<string[]>([]);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [statusAcesso, setStatusAcesso] = useState<StatusAcesso>('carregando');
  const [loading, setLoading] = useState(true);

  // Força bruta para evitar que o cache corrompido congele a aplicação
  const limparCacheSupabase = () => {
    if (typeof window !== 'undefined') {
      const chavesParaRemover = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          chavesParaRemover.push(key);
        }
      }
      chavesParaRemover.forEach(k => localStorage.removeItem(k));
    }
  };

  const fetchUserProfile = async (userId: string, userEmail?: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role_id, nome') 
        .eq('id', userId)
        .maybeSingle();

      if (!profileData || !profileData.role_id) {
        setRoleId(null);
        setPermissoes([]);
        setProfileName(userEmail?.split('@')[0] || 'Usuário'); 
        setStatusAcesso('pendente');
        return;
      }

      setRoleId(profileData.role_id);
      setProfileName(profileData.nome || userEmail?.split('@')[0] || 'Usuário'); 

      const { data: permData } = await supabase
        .from('role_permissoes')
        .select('permissoes(nome)')
        .eq('role_id', profileData.role_id);

      const listaPermissoes = permData 
        ? permData.map((p: any) => p.permissoes?.nome).filter(Boolean)
        : [];
        
      setPermissoes(listaPermissoes);
      setStatusAcesso('aprovado');
    } catch (error) {
      console.error('Erro Auth:', error);
      setStatusAcesso('pendente');
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true); 
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error; // Joga direto pro catch para limpar tudo

        if (!mounted) return;

        if (data?.session?.user) {
          await fetchUserProfile(data.session.user.id, data.session.user.email);
          setSession(data.session);
          setUser(data.session.user);
        } else {
          setSession(null);
          setUser(null);
          setRoleId(null);
          setPermissoes([]);
          setStatusAcesso('pendente');
        }
      } catch (err) {
        console.warn("Sessão corrompida. Executando limpeza bruta do cache...");
        limparCacheSupabase();
        
        if (mounted) {
          setSession(null);
          setUser(null);
          setStatusAcesso('pendente');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      
      // PULO DO GATO: Evita o conflito com a busca inicial
      if (event === 'INITIAL_SESSION') return;
      
      try {
        setLoading(true); 

        // Se detectou logout nativo do supabase, passa a vassoura
        if (event === 'SIGNED_OUT') {
          limparCacheSupabase();
          setSession(null);
          setUser(null);
          setRoleId(null);
          setPermissoes([]);
          setStatusAcesso('pendente');
          return;
        }
        
        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id, currentSession.user.email);
          setSession(currentSession);
          setUser(currentSession.user);
        } else {
          setSession(null);
          setUser(null);
          setRoleId(null);
          setPermissoes([]);
          setStatusAcesso('pendente');
        }
      } catch (err) {
        console.error("Erro no AuthStateChange:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Erro silencioso no signOut:", err);
    } finally {
      // Garante que o usuário consiga sair MESMO se a API do Supabase cair
      limparCacheSupabase();
      setRoleId(null);
      setPermissoes([]);
      setStatusAcesso('pendente'); 
      setSession(null);
      setUser(null);
      setLoading(false);
    }
  };
  
  const signIn = async (email: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, roleId, permissoes, profileName, statusAcesso, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
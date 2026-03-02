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
  
  // Inicia como true apenas para o carregamento inicial (First Load)
  const [loading, setLoading] = useState(true);

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

    // 1. CARREGAMENTO INICIAL DA PÁGINA
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id, currentSession.user.email);
          if (mounted) {
            setSession(currentSession);
            setUser(currentSession.user);
          }
        } else {
          if (mounted) setStatusAcesso('pendente');
        }
      } catch (err) {
        console.error("Erro ao inicializar sessão:", err);
        if (mounted) setStatusAcesso('pendente');
      } finally {
        // Libera a tela. A partir daqui, atualizações de token em background não travam mais o sistema.
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // 2. ESCUTADOR DE EVENTOS (Background / Login / Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      
      // Ignora evento inicial (já tratado acima)
      if (event === 'INITIAL_SESSION') return;
      
      // LOGOUT: Limpa estado silenciosamente.
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setRoleId(null);
        setPermissoes([]);
        setStatusAcesso('pendente');
        return;
      }

      if (currentSession?.user) {
        // ATUALIZAÇÃO SILENCIOSA: Atualiza variáveis sem piscar a tela
        setSession(currentSession);
        setUser(currentSession.user);
        
        // LOGIN NOVO: Aqui sim travamos a tela rapidinho para buscar o perfil e permissões
        if (event === 'SIGNED_IN') {
          setLoading(true);
          await fetchUserProfile(currentSession.user.id, currentSession.user.email);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setRoleId(null);
    setPermissoes([]);
    setStatusAcesso('pendente'); 
    setSession(null);
    setUser(null);
    setLoading(false);
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
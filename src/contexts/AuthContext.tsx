import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
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

  // O PULO DO GATO: Controla se o perfil já foi carregado imune ao problema de "amnésia" do React
  const profileLoadedRef = useRef(false);

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
        profileLoadedRef.current = false;
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
      profileLoadedRef.current = true;
    } catch (error) {
      console.error('Erro Auth:', error);
      setStatusAcesso('pendente');
      profileLoadedRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (initialSession?.user) {
          await fetchUserProfile(initialSession.user.id, initialSession.user.email);
          if (mounted) {
            setSession(initialSession);
            setUser(initialSession.user);
          }
        } else {
          if (mounted) setStatusAcesso('pendente');
        }
      } catch (error) {
         if (mounted) setStatusAcesso('pendente');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setRoleId(null);
        setPermissoes([]);
        setStatusAcesso('pendente');
        profileLoadedRef.current = false;
        return;
      }

      if (currentSession?.user) {
        // Se a referência diz que já carregamos o perfil, é só uma troca de aba ou renovação.
        // Fazemos tudo em background (silenciosamente) sem tocar na tela de loading!
        if (profileLoadedRef.current) {
          setSession(currentSession);
          setUser(currentSession.user);
          fetchUserProfile(currentSession.user.id, currentSession.user.email); 
        } else {
          // Se não tem perfil carregado, é um login real acontecendo agora.
          // Aqui travamos a tela para não dar a "piscada" do acesso restrito.
          setLoading(true);
          await fetchUserProfile(currentSession.user.id, currentSession.user.email);
          setSession(currentSession);
          setUser(currentSession.user);
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
    profileLoadedRef.current = false;
    setRoleId(null);
    setPermissoes([]);
    setStatusAcesso('pendente'); 
    setSession(null);
    setUser(null);
    setLoading(false);
  };
  
  // (Lembrando que coloquei signInWithOtp aqui, se você usar senha no seu login, troque para signInWithPassword)
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
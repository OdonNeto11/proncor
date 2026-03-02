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
      // 1. Garante que a tela fique bloqueada pelo Spinner no App.tsx
      setLoading(true); 
      
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      
      if (!mounted) return;

      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      
      if (initialSession?.user) {
        // 2. Aguarda pacientemente buscar o roleId ANTES de liberar o loading
        await fetchUserProfile(initialSession.user.id, initialSession.user.email);
      } else {
        setStatusAcesso('pendente');
      }
      
      // 3. Somente aqui, com tudo em mãos, liberamos a interface
      if (mounted) setLoading(false);
    };

    initializeAuth();

    // Escuta mudanças de aba/login
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!mounted) return;
      
      setLoading(true); // Trava a tela se a sessão mudar
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        await fetchUserProfile(currentSession.user.id, currentSession.user.email);
      } else {
        setRoleId(null);
        setPermissoes([]);
        setStatusAcesso('pendente');
      }
      
      if (mounted) setLoading(false);
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
    setStatusAcesso('pendente'); // Ajustado para pendente ao sair
    setLoading(false);
  };
  
  const signIn = async (email: string) => {};

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
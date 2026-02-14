import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type UserRole = 'chefe' | 'plantonista' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  profileName: string | null; // <--- NOVO: Guardar o nome
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [profileName, setProfileName] = useState<string | null>(null); // <--- Estado do Nome
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string, userEmail?: string) => {
    try {
      // <--- MUDANÇA: Agora buscamos 'role' E 'nome'
      const { data, error } = await supabase
        .from('profiles')
        .select('role, nome') 
        .eq('id', userId)
        .single();

      if (error || !data) {
        setRole('plantonista');
        // Se não tiver perfil, tenta pegar a primeira parte do email (ex: 'plantonista' de 'plantonista@proncor...')
        setProfileName(userEmail?.split('@')[0] || 'Usuário'); 
      } else {
        setRole(data.role as UserRole);
        // Se o nome no banco for nulo, usa o email formatado
        setProfileName(data.nome || userEmail?.split('@')[0] || 'Usuário'); 
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      setRole('plantonista');
      setProfileName('Usuário');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email);
      } else {
        setRole(null);
        setProfileName(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setProfileName(null);
  };
  
  const signIn = async (email: string) => { 
      // logica antiga mantida
  };

  return (
    // <--- Exportamos profileName aqui
    <AuthContext.Provider value={{ user, session, role, profileName, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
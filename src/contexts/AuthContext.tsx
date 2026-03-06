import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Setor = {
  id: number;
  nome: string;
  sigla: string;
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roleId: number | null;
  profileName: string | null;
  permissoes: string[];
  setores: Setor[];
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  roleId: null,
  profileName: null,
  permissoes: [],
  setores: [],
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [permissoes, setPermissoes] = useState<string[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true); // Evita a piscada garantindo que a tela aguarde os dados
        loadUserProfile(session.user.id);
      } else {
        setRoleId(null);
        setProfileName(null);
        setPermissoes([]);
        setSetores([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      setRoleId(profileData.role_id);
      
      const nomeCorreto = profileData.full_name || profileData.nome || profileData.nome_completo || 'Profissional';
      setProfileName(nomeCorreto);

      if (profileData.role_id) {
        const { data: permissoesData, error: permissoesError } = await supabase
          .from('role_permissoes')
          .select(`
            permissoes (
              nome
            )
          `)
          .eq('role_id', profileData.role_id);

        if (!permissoesError && permissoesData) {
          const permissoesArray = permissoesData
            .map((item: any) => item.permissoes?.nome)
            .filter(Boolean);
            
          setPermissoes(permissoesArray);
        } else {
          setPermissoes([]);
        }

        const { data: ligacaoData, error: ligacaoError } = await supabase
          .from('usuario_setores')
          .select('setor_id')
          .eq('user_id', userId);

        if (!ligacaoError && ligacaoData && ligacaoData.length > 0) {
          const idsSetores = ligacaoData.map(l => l.setor_id);

          const { data: setoresData, error: setoresError } = await supabase
            .from('setores')
            .select('*')
            .in('id', idsSetores);

          if (!setoresError && setoresData) {
            setSetores(setoresData);
          }
        } else {
          setSetores([]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, roleId, profileName, permissoes, setores, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
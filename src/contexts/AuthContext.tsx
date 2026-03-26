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
  
  // O loading inicia em true APENAS para o primeiro carregamento da aplicação
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. CARREGAMENTO INICIAL SILENCIOSO (Primeira vez que a página abre)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. ESCUTADOR DE MUDANÇAS DE SESSÃO
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      
      // Se a sessão expirou ou o usuário deslogou
      if (!currentSession?.user) {
        setUser(null);
        setRoleId(null);
        setProfileName(null);
        setPermissoes([]);
        setSetores([]);
        setLoading(false);
        return;
      }

      // IMPORTANTE: Só aciona o loading se for um novo login e o estado de user estiver vazio.
      // Se o usuário voltar pra aba e o Supabase apenas mandar um evento de atualização de token, 
      // a tela não vai piscar.
      setUser((prevUser) => {
        if (!prevUser || prevUser.id !== currentSession.user.id) {
          setLoading(true);
          loadUserProfile(currentSession.user.id);
        }
        return currentSession.user;
      });
      
    });

    return () => subscription.unsubscribe();
  }, []);

  // Função interna para carregar dados do banco de dados (Apenas roda no loading real)
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
        // Busca as permissões
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

        // Busca os setores
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
      // Sempre remove a tela de loading no final
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
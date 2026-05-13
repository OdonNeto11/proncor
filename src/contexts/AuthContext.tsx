import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Setor = {
  id: number;
  nome: string;
  sigla: string;
};

export interface Alocacao {
  setor_id: number;
  role_id: number;
  setor_nome: string;
  role_nome: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  alocacoes: Alocacao[];
  profileName: string | null;
  permissoes: string[];
  isActive: boolean | null;
  primeiroAcesso: boolean | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  alocacoes: [],
  profileName: null,
  permissoes: [],
  isActive: null,
  primeiroAcesso: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [alocacoes, setAlocacoes] = useState<Alocacao[]>([]);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [permissoes, setPermissoes] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [primeiroAcesso, setPrimeiroAcesso] = useState<boolean | null>(null);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (!currentSession?.user) {
        resetState();
        return;
      }
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

  const resetState = () => {
    setUser(null);
    setAlocacoes([]);
    setProfileName(null);
    setPermissoes([]);
    setIsActive(null);
    setPrimeiroAcesso(null);
    setLoading(false);
  };

  const loadUserProfile = async (userId: string) => {
    try {
      // 1. Perfil básico
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nome, is_active, primeiro_acesso')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      
      setIsActive(profileData.is_active); 
      setPrimeiroAcesso(profileData.primeiro_acesso);
      setProfileName(profileData.nome || 'Profissional');

      if (profileData.is_active === false) {
        setLoading(false);
        return;
      }

      // 2. Alocações (Setores e Cargos)
      const { data: alocData, error: alocError } = await supabase
        .from('usuario_alocacoes')
        .select(`
          setor_id, 
          role_id, 
          setores:setor_id(nome), 
          roles:role_id(nome)
        `)
        .eq('user_id', userId);

      if (alocError) throw alocError;

      const formatadas: Alocacao[] = alocData.map((item: any) => ({
        setor_id: item.setor_id,
        role_id: item.role_id,
        setor_nome: item.setores?.nome || 'Setor não identificado',
        role_nome: item.roles?.nome || 'Cargo não identificado'
      }));
      setAlocacoes(formatadas);

// No AuthContext.tsx -> loadUserProfile

// 3. Busca Permissões de todos os cargos vinculados
const roleIds = formatadas.map(a => a.role_id);
if (roleIds.length > 0) {
  const { data: permData } = await supabase
    .from('role_permissoes')
    .select(`
      permissoes:permissao_id (
        nome
      )
    `)
    .in('role_id', roleIds);

  // IMPORTANTE: Se o seu SQL retorna 'adm_acessar_dashboard' no campo 'nome' da tabela permissoes
  const permsStrings = permData
    ?.map((p: any) => p.permissoes?.nome) // Garanta que aqui bate com o campo da tabela
    .filter(Boolean) || [];

  setPermissoes(Array.from(new Set(permsStrings)));
}

    } catch (error) {
      console.error('Erro de autenticação RBAC:', error);
    } finally {
      // O loading só encerra após todas as promessas serem resolvidas
      setLoading(false);
    }
  };

  const signOut = async () => { await supabase.auth.signOut(); };
  const refreshProfile = () => loadUserProfile(user?.id || '');

  return (
    <AuthContext.Provider value={{ 
      session, user, alocacoes, profileName, permissoes, 
      isActive, primeiroAcesso, loading, signOut, refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
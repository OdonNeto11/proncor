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

    // Removido o underline de _event para podermos ler o evento do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      
      // TRAVA DE RECUPERAÇÃO DE SENHA
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/trocar-senha';
        return; // Interrompe o fluxo aqui
      }

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

      // 3. Busca Permissões de todos os cargos vinculados com Validação Estrita de Setor
      const roleIds = formatadas.map(a => a.role_id);
      if (roleIds.length > 0) {
        const { data: permData, error: permError } = await supabase
          .from('role_permissoes')
          .select(`
            role_id,
            permissoes:permissao_id (
              nome,
              setor_id
            )
          `)
          .in('role_id', roleIds);

        if (permError) throw permError;

        const permsValidas = new Set<string>();

        permData?.forEach((rp: any) => {
          const permissao = Array.isArray(rp.permissoes) ? rp.permissoes[0] : rp.permissoes;
          
          if (!permissao || !permissao.nome) return;

          // Regra 1: Bypass Global. Se a permissão não tem setor atrelado (NULL), ela é válida globalmente.
          if (permissao.setor_id === null) {
            permsValidas.add(permissao.nome);
            return;
          }

          // Regra 2: Validação Estrita (Local).
          const hasValidAllocation = formatadas.some(
            aloc => aloc.role_id === rp.role_id && aloc.setor_id === permissao.setor_id
          );

          if (hasValidAllocation) {
            permsValidas.add(permissao.nome);
          }
        });

        setPermissoes(Array.from(permsValidas));
      }

    } catch (error) {
      console.error('Erro de autenticação RBAC:', error);
    } finally {
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
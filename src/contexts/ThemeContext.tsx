// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

// Função auxiliar para aplicar a classe no DOM (<html>)
const applyThemeToDOM = (dark: boolean) => {
    // Retorna cedo se o contexto estiver sendo executado no servidor (SSR)
    if (typeof window === 'undefined') return; 

    const root = window.document.documentElement; // Pega o elemento <html>
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Padrão Inicial: CLARO (false)
  const [isDark, setIsDark] = useState<boolean>(() => {
    // 1. Lê a preferência salva
    const savedTheme = localStorage.getItem('theme');
    let computedValue = false; // Padrão

    if (savedTheme) {
        computedValue = savedTheme === 'dark';
    }

    // *** CORREÇÃO DO BUG HÍBRIDO (Parte Síncrona) ***
    // Durante a inicialização do estado, antes da primeira renderização completa,
    // já forçamos o DOM raiz a bater com o estado. Isso garante que o Tailwind
    // não se confunda no primeiro paint.
    applyThemeToDOM(computedValue);
    return computedValue; 
  });

  // Efeito executado sempre que 'isDark' muda (depois que a tela renderiza)
  useEffect(() => {
    // 2. Garante a sincronização em toggles futuros
    applyThemeToDOM(isDark);
    // 3. Salva a nova preferência
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
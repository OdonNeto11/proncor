import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  // Consumindo 'isDark' no lugar de 'theme'
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 relative transition-colors duration-300">
      
      {/* BOTÃO FLUTUANTE DE TEMA */}
      <button 
        onClick={toggleTheme} 
        className="absolute top-6 right-6 p-2.5 rounded-full bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none z-50"
        aria-label="Alternar tema"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* CONTEÚDO DA PÁGINA (Login, Esqueci Senha, etc) */}
      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
      
    </div>
  );
}
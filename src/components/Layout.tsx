import React, { useState, useEffect } from 'react'; 
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Menu, X, LogOut, UserCircle, Settings, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './ui/Logo';

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { signOut, profileName, roleId } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // LÓGICA DE PERSISTÊNCIA E PADRÃO DARK
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return true; // PADRÃO DARK MODE ATIVO
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const isActive = (path: string) => location.pathname === path;
  
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="h-screen h-[100dvh] w-full bg-gray-50 dark:bg-slate-950 flex flex-col font-sans overflow-hidden transition-colors duration-300">
      
      <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-sm flex-none z-50 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            <div className="flex items-center gap-3">
              <Link to="/" className="flex-shrink-0 hover:opacity-90 transition-opacity">
                <Logo className="h-12 w-auto" />
              </Link>
            </div>
            
            {/* NAVEGAÇÃO DESKTOP */}
            <nav className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Link to="/" className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${isActive('/') ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 font-semibold' : 'hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                <HomeIcon size={18} /> Início
              </Link>

              {roleId === 1 && (
                <Link 
                  to="/admin" 
                  state={{ reset: Date.now() }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${isActive('/admin') ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 font-semibold' : 'hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                >
                  <Settings size={18} /> Administração
                </Link>
              )}

              <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 mx-2"></div>

              <button 
                onClick={() => setIsDark(!isDark)}
                className="p-2 mr-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-yellow-400 hover:ring-2 hover:ring-blue-400 transition-all"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div className="flex items-center gap-3 mr-2 bg-gray-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-gray-100 dark:border-slate-700 transition-colors">
                  <span className="text-sm font-bold text-gray-700 dark:text-slate-200">{profileName || 'Usuário'}</span>
                  <UserCircle size={24} className="text-gray-400 dark:text-slate-500" />
              </div>

              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 transition-colors font-medium">
                <LogOut size={18} />
                <span>Sair</span>
              </button>
            </nav>

            {/* CONTROLES MOBILE (TEMA FIXO + HAMBÚRGUER) */}
            <div className="flex items-center gap-2 md:hidden">
              <button 
                onClick={() => setIsDark(!isDark)}
                className="p-2.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-yellow-400 transition-all active:scale-95"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <button 
                className="p-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors active:scale-95" 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

          </div>
        </div>

        {/* MENU MOBILE */}
        {isMobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="md:hidden absolute top-20 right-4 z-50 w-auto min-w-[240px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col p-2 space-y-1">
                <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-2 border border-blue-100 dark:border-blue-900/30 flex items-center gap-3">
                  <UserCircle size={24} className="text-blue-500 dark:text-blue-400" />
                  <p className="font-bold text-gray-800 dark:text-slate-200 text-sm">{profileName || 'Usuário'}</p>
                </div>

                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/') ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                  <HomeIcon size={18} /> Início
                </Link>

                {roleId === 1 && (
                  <Link 
                    to="/admin" 
                    state={{ reset: Date.now() }}
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin') ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                  >
                    <Settings size={18} /> Administração
                  </Link>
                )}
                
                <hr className="border-gray-100 dark:border-slate-800 my-1" />
                
                <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold transition-colors">
                    <LogOut size={18} /> Sair do Sistema
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-slate-950 scroll-smooth w-full transition-colors duration-300 flex flex-col">
        <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex-1 w-full">
            {children}
        </div>

{/* RODAPÉ: PROPRIEDADE E NOME DO SISTEMA */}
        <footer className="w-full py-6 px-4 sm:px-6 lg:px-8 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors duration-300">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            
            <div className="text-center md:text-left">
              {/* NOME DO SEU SISTEMA */}
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-tight">
                PGFH <span className="text-slate-400 dark:text-slate-500 font-medium">| Portal de Gestão e Fluxo Hospitalar</span>
              </p>
              {/* SUA PROPRIEDADE */}
              <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1 uppercase tracking-[0.1em]">
                © {new Date().getFullYear()} Desenvolvido por [Odon Neto]
              </p>
            </div>

            <div className="flex items-center gap-6">
              {/* STATUS DE OPERAÇÃO NO CLIENTE */}
              <div className="flex items-center gap-2 cursor-default">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Unidade Proncor Ativa
                </span>
              </div>
              
              <div className="h-4 w-px bg-gray-200 dark:bg-slate-800"></div>
              
              {/* IDENTIFICADOR DA RELEASE */}
              <span className="text-[10px] font-mono text-slate-300 dark:text-slate-700">
                SYS.REV.2026_BETA
              </span>
            </div>

          </div>
        </footer>
      </main>
    </div>
  );
}
import React, { useState } from 'react'; 
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Menu, X, LogOut, UserCircle, Settings, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Logo } from './ui/Logo';
import { Button } from './ui/Button';
import { Title, Description } from './ui/Typography';

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, profileName, roleId } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const nomeExibicao = profileName || (user?.email ? user.email.split('@')[0] : 'Perfil Incompleto');

  return (
    /* REMOVIDO transition-colors e duration-500 PARA EVITAR O BUG HÍBRIDO */
    <div className="min-h-screen h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 flex flex-col font-sans overflow-hidden">
      
      <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-sm flex-none z-50 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            <div className="flex items-center gap-3">
              <Link to="/" className="flex-shrink-0 hover:opacity-90 transition-opacity">
                <Logo className="h-12 w-auto" />
              </Link>
            </div>
            
            <nav className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Link to="/" className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${isActive('/') ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 font-semibold' : 'hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                <HomeIcon size={18} /> Início
              </Link>

              {roleId === 1 && (
                <Link 
                  to="/admin" 
                  state={{ forceAdminHub: true }}
                  onClick={() => {
                    sessionStorage.removeItem('adminCurrentView');
                    sessionStorage.removeItem('hubCurrentDash');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${isActive('/admin') ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 font-semibold' : 'hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                >
                  <Settings size={18} /> Administração
                </Link>
              )}

              <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 mx-2"></div>

              <Button 
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="mr-2 text-gray-600 dark:text-yellow-400 hover:ring-2 hover:ring-blue-400"
                title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </Button>

              <div className="flex items-center gap-3 mr-2 bg-gray-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-gray-100 dark:border-slate-700 transition-colors" title={nomeExibicao}>
                <Description className="!text-sm !font-bold m-0 max-w-[150px] truncate">
                  {nomeExibicao}
                </Description>
                <UserCircle size={24} className="text-gray-400 dark:text-slate-500 flex-shrink-0" />
              </div>

              <Button 
                variant="ghostDanger"
                size="sm"
                onClick={handleLogout} 
              >
                <LogOut size={18} />
                Sair
              </Button>
            </nav>

            <div className="flex items-center gap-2 md:hidden">
              <Button 
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-gray-600 dark:text-yellow-400"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </Button>

              <Button 
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </Button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="md:hidden absolute top-20 right-4 z-50 w-auto min-w-[240px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col p-2 space-y-1">
                <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-2 border border-blue-100 dark:border-blue-900/30 flex items-center gap-3">
                  <UserCircle size={24} className="text-blue-500 dark:text-blue-400" />
                  <Description className="!text-sm !font-bold m-0 text-gray-800 dark:text-slate-200 truncate">{nomeExibicao}</Description>
                </div>

                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/') ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                  <HomeIcon size={18} /> Início
                </Link>

                {roleId === 1 && (
                  <Link 
                    to="/admin" 
                    state={{ forceAdminHub: true }}
                    onClick={() => {
                      sessionStorage.removeItem('adminCurrentView');
                      sessionStorage.removeItem('hubCurrentDash');
                      setIsMobileMenuOpen(false);
                    }} 
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin') ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                  >
                    <Settings size={18} /> Administração
                  </Link>
                )}
                
                <hr className="border-gray-100 dark:border-slate-800 my-1" />
                
                <Button 
                  variant="ghostDanger" 
                  fullWidth 
                  justify="start" 
                  onClick={handleLogout}
                >
                    <LogOut size={18} /> Sair do Sistema
                </Button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* REMOVIDO transition-colors e duration-500 PARA EVITAR O BUG HÍBRIDO */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-slate-950 scroll-smooth w-full flex flex-col">
        <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex-1 w-full">
            {children}
        </div>

        <footer className="w-full py-6 px-4 sm:px-6 lg:px-8 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors duration-300">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            
            <div className="text-center md:text-left">
              <Title className="!text-sm !font-bold tracking-tight m-0 text-slate-700 dark:text-slate-200">
                Proncor Hub <span className="text-slate-400 dark:text-slate-500 font-medium">| Gestão e Fluxo Hospitalar</span>
              </Title>
              <Description className="!text-[10px] text-slate-400 dark:text-slate-600 mt-1 uppercase tracking-[0.1em] m-0">
                © {new Date().getFullYear()} Hospital Proncor | Departamento de Tecnologia
              </Description>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 cursor-default">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                <Description className="!text-[10px] !font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest m-0">
                  Unidade Proncor Ativa
                </Description>
              </div>
              
              <div className="h-4 w-px bg-gray-200 dark:bg-slate-800"></div>
              
              <Description className="!text-[10px] !font-mono text-slate-300 dark:text-slate-700 m-0">
                v1.0.0
              </Description>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
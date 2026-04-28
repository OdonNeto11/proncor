import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className = '', onClick, hoverable = false }: CardProps) {
  // Retornando para o slate-900 conforme sua preferência
  const baseStyles = `
    bg-white dark:bg-slate-900 
    rounded-2xl 
    border border-slate-100 dark:border-slate-800 
    shadow-sm p-6 
    transition-all duration-300
    text-slate-900 dark:text-slate-100
  `;
  
  const hoverStyles = hoverable 
    ? 'hover:shadow-md dark:hover:shadow-blue-900/10 hover:border-blue-200 dark:hover:border-blue-500/50 hover:scale-[1.01] cursor-pointer' 
    : '';

  return (
    <div
      className={`${baseStyles} ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
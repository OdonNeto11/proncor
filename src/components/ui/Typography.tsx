import React from 'react';

export const themeClasses = {
  title: "text-slate-900 dark:text-white", 
  text: "text-slate-600 dark:text-slate-200", 
  placeholder: "placeholder:text-slate-400 dark:placeholder:text-slate-500"
};

// ATUALIZADO: Agora aceita a propriedade 'size'
interface TextProps {
  children: React.ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export function Title({ children, className = '', size = '3xl' }: TextProps) {
  // Mapeamento de tamanhos para classes do Tailwind
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
  };

  return (
    <h1 className={`${themeClasses.title} ${sizeClasses[size]} font-bold transition-colors ${className}`}>
      {children}
    </h1>
  );
}

export function Description({ children, className = '', size = 'md' }: TextProps) {
  const sizeClasses = {
    xs: 'text-[10px]',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
    '2xl': 'text-xl',
    '3xl': 'text-2xl',
  };

  return (
    <p className={`${themeClasses.text} ${sizeClasses[size]} transition-colors ${className}`}>
      {children}
    </p>
  );
}
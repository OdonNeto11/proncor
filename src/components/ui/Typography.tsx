import React from 'react';

// Restaurando o branco e cinza claro para contraste máximo
export const themeClasses = {
  title: "text-slate-900 dark:text-white", // Branco puro no Dark
  text: "text-slate-600 dark:text-slate-200", // Cinza bem claro (quase branco) no Dark
  placeholder: "placeholder:text-slate-400 dark:placeholder:text-slate-500"
};

interface TextProps {
  children: React.ReactNode;
  className?: string;
}

export function Title({ children, className = '' }: TextProps) {
  return (
    <h1 className={`${themeClasses.title} text-3xl font-bold transition-colors ${className}`}>
      {children}
    </h1>
  );
}

export function Description({ children, className = '' }: TextProps) {
  return (
    <p className={`${themeClasses.text} transition-colors ${className}`}>
      {children}
    </p>
  );
}
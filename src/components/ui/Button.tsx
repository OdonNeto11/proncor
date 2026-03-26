import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'warning' | 'purple' | 'indigo' | 'ghostDanger' | 'ghost' | 'rose' | 'amber';
  size?: 'sm' | 'md' | 'lg' | 'icon'; // <-- 'lg' adicionado aqui
  fullWidth?: boolean;
  justify?: 'center' | 'start' | 'between';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  justify = 'center',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center gap-2';

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3',
    lg: 'px-6 py-3.5 text-[15px]', // <-- Novo tamanho para o botão do Login
    icon: 'p-2.5 justify-center',
  };

  const justifyStyles = {
    center: 'justify-center',
    start: 'justify-start',
    between: 'justify-between'
  };

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-100 dark:shadow-none dark:bg-blue-600 dark:hover:bg-blue-500',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-slate-800',
    danger: 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/40',
    success: 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50 dark:hover:bg-emerald-900/40',
    warning: 'bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/50 dark:hover:bg-orange-900/40',
    purple: 'bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/50 dark:hover:bg-purple-900/40',
    indigo: 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-900/50 dark:hover:bg-indigo-900/40',
    ghostDanger: 'bg-transparent border-transparent text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 shadow-none',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 shadow-none',
    rose: 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/50 dark:hover:bg-rose-900/40',
    amber: 'bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50 dark:hover:bg-amber-900/40',
  };

  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${justifyStyles[justify]} ${variantStyles[variant]} ${widthStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
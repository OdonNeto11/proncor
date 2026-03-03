import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className = '', onClick, hoverable = false }: CardProps) {
  // Ajustado para border-slate-100 e rounded-2xl para um visual mais "Premium"
  const baseStyles = 'bg-white rounded-2xl border border-slate-100 shadow-sm p-6 transition-all duration-300';
  const hoverStyles = hoverable ? 'hover:shadow-md hover:border-blue-200 hover:scale-[1.01] cursor-pointer' : '';

  return (
    <div
      className={`${baseStyles} ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
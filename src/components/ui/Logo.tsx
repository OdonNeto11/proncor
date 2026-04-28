import React from 'react';

interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <img 
      src="/logo.png" 
      alt="Hospital Proncor" 
      className={`object-contain dark:brightness-0 dark:invert transition-all duration-300 ${className}`} 
    />
  );
}
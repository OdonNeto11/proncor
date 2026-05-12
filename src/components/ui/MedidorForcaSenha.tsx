import React from 'react';

interface MedidorForcaSenhaProps {
  senha: string;
}

export function MedidorForcaSenha({ senha }: MedidorForcaSenhaProps) {
  const getPasswordStrength = () => {
    if (!senha) return { width: 0, color: 'bg-transparent', text: '' };

    const len = senha.length;

    // 1. Menos de 6 caracteres
    if (len < 6) {
      const w = Math.max(10, (len / 6) * 60); 
      return { 
        width: w, 
        color: 'bg-red-400', 
        text: `Mínimo de 6 caracteres. Faltam ${6 - len}.` 
      };
    }

    // 2. Atingiu os 6 caracteres mínimos
    let score = 70; 
    
    if (/[A-Z]/.test(senha)) score += 10;
    if (/[0-9]/.test(senha)) score += 10;
    if (/[^A-Za-z0-9]/.test(senha)) score += 10;

    if (score === 70) {
      return { width: 70, color: 'bg-blue-500', text: 'Mínimo atingido. Adicione maiúsculas, números ou símbolos para fortalecer.' };
    }
    
    if (score < 100) {
      return { width: score, color: 'bg-gradient-to-r from-blue-500 to-teal-400', text: 'Senha boa. Adicione mais variedade para ficar excelente.' };
    }

    return { width: 100, color: 'bg-gradient-to-r from-blue-500 to-green-500', text: 'Senha excelente e segura!' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="mt-3">
      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out ${strength.color}`} 
          style={{ width: `${strength.width}%` }} 
        />
      </div>
      {strength.text && (
        <p className={`text-xs mt-2 font-medium ${senha.length >= 6 ? 'text-slate-600 dark:text-slate-400' : 'text-red-500'}`}>
          {strength.text}
        </p>
      )}
    </div>
  );
}
import { z } from 'zod';

// Validação padrão para qualquer texto obrigatório
export const zObrigatorio = (nomeCampo: string) => 
  z.string().min(1, `O campo "${nomeCampo}" é obrigatório`);

// Validação específica para CRM
export const zCrm = (nomeCampo: string = 'CRM') => 
  z.string()
    .min(1, `O campo "${nomeCampo}" é obrigatório`)
    .refine(val => val.length === 0 || val.length >= 4, { 
      message: `O campo "${nomeCampo}" está incompleto` 
    });

// Validação específica para Telefone
export const zTelefone = (nomeCampo: string = 'Telefone') => 
  z.string()
    .min(1, `O campo "${nomeCampo}" é obrigatório`)
    .refine(val => val.length === 0 || val.length >= 14, { 
      message: `O campo "${nomeCampo}" está incompleto` 
    });

// Validação para Datas
export const zDataObrigatoria = (nomeCampo: string) => 
  z.any().refine((val) => val instanceof Date && !isNaN(val.getTime()), { 
    message: `O campo "${nomeCampo}" é obrigatório` 
  });
import React from 'react';
import { Link } from 'react-router-dom';
import { TimerOff, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { AuthLayout } from '../../components/AuthLayout';

export function LinkExpirado() {
  return (
    <AuthLayout>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800 text-center">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <TimerOff size={32} className="text-red-600 dark:text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-50 mb-2">Link Expirado</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm">
          Este link de recuperação não é mais válido. Isso acontece porque ele já foi utilizado ou passou do tempo limite de segurança.
        </p>
        <Link to="/esqueci-senha" className="block w-full">
          <Button variant="primary" fullWidth>
            Solicitar Novo Link
          </Button>
        </Link>
        <div className="mt-6">
          <Link to="/login" className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center gap-2">
            <ArrowLeft size={16} /> Voltar ao Login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
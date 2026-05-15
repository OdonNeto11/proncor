import { 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  HelpCircle, 
  CheckCircle2, 
  ArrowRightCircle, 
  Stethoscope,
  XCircle,
  ShieldOff
} from 'lucide-react';

export const STATUS_CONFIG: Record<number, { label: string, color: string, border: string, icon: any }> = {
  1: { label: 'Agendado', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', icon: Clock },
  2: { label: 'Reagendado', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', icon: AlertTriangle },
  3: { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', border: 'border-red-200 dark:border-red-800', icon: AlertCircle },
  4: { label: 'Não respondeu após reagendamento', color: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400', border: 'border-gray-200 dark:border-slate-700', icon: HelpCircle },
  5: { label: 'Finalizado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', border: 'border-green-200 dark:border-green-800', icon: CheckCircle2 },
  6: { label: 'Encaminhado PA', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', icon: ArrowRightCircle },
  7: { label: 'Retorno ao PA', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', icon: Stethoscope },
};

export const STATUS_CONFIG_AMB: Record<number, { label: string, color: string, border: string, icon: any }> = {
  1: { label: 'Aguardando Atendimento', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800/50', icon: AlertCircle },
  13: { label: 'Aguardando Agendamento', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800/50', icon: AlertCircle },
  3: { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', border: 'border-red-200 dark:border-red-800/50', icon: XCircle },
  5: { label: 'Finalizado', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/50', icon: CheckCircle2 },
  9: { label: 'Agendado', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/50', icon: CheckCircle2 },
  10: { label: 'Plano não Atendido', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800/50', icon: ShieldOff },
  11: { label: 'Sem Especialidade', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800/50', icon: AlertCircle },
  12: { label: 'Sem Contato', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', icon: HelpCircle },
  14: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/50', icon: CheckCircle2 },
};

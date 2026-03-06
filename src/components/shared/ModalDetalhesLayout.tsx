import React, { ReactNode } from 'react';
import { MessageCircle, Activity } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export interface InfoBox {
  label: string;
  value: ReactNode;
  theme?: 'blue' | 'purple' | 'slate';
}

interface ModalDetalhesLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  infoBoxes: InfoBox[];
  statusLabel: string;
  statusClasses: { color: string; border: string };
  tagsLabel?: string;
  tags?: string[];
  customContent?: ReactNode; 
  phoneForWhats?: string;
  obsLabel?: string;
  obsText?: string;
  obsFooter?: ReactNode; 
  actionButtons?: ReactNode;
  footerButtons?: ReactNode;
}

export function ModalDetalhesLayout({
  isOpen, onClose, title, infoBoxes, statusLabel, statusClasses,
  tagsLabel, tags, customContent, phoneForWhats, obsLabel, obsText, obsFooter,
  actionButtons, footerButtons
}: ModalDetalhesLayoutProps) {

  // Função ajustada para não quebrar com os espaços das classes dark:
  const getBoxTheme = (theme: InfoBox['theme']) => {
    if (theme === 'blue') return {
      container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/50',
      label: 'text-blue-600 dark:text-blue-400',
      value: 'text-blue-900 dark:text-blue-100'
    };
    if (theme === 'purple') return {
      container: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/50',
      label: 'text-purple-600 dark:text-purple-400',
      value: 'text-purple-900 dark:text-purple-100'
    };
    return {
      container: 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
      label: 'text-slate-500 dark:text-slate-400',
      value: 'text-slate-700 dark:text-slate-200'
    }; 
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-5">
        
        {infoBoxes.length > 0 && (
          <div className="flex gap-2 text-center">
            {infoBoxes.map((box, idx) => {
              const theme = getBoxTheme(box.theme);
              return (
                <div key={idx} className={`flex-1 p-2 rounded-xl border ${theme.container}`}>
                  <span className={`text-[10px] font-bold uppercase block ${theme.label}`}>{box.label}</span>
                  <div className={`font-bold text-sm ${theme.value}`}>{box.value}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className={`p-2 rounded-lg text-center text-xs font-bold border ${statusClasses.color} ${statusClasses.border}`}>
            STATUS ATUAL: {statusLabel}
        </div>

        {tags && tags.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
            {tagsLabel && <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{tagsLabel}</p>}
            <div className="flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                    <span key={idx} className="flex items-center gap-1 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                        <Activity size={12} className="text-slate-400 dark:text-slate-500" /> {tag}
                    </span>
                ))}
            </div>
          </div>
        )}

        {customContent}

        {phoneForWhats && (
          <Button variant="success" fullWidth onClick={() => window.open(`https://wa.me/55${phoneForWhats.replace(/\D/g, '')}`, '_blank')}>
            <MessageCircle size={18} /> Chamar no WhatsApp
          </Button>
        )}

        {obsText && (
          <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">{obsLabel || 'Observações'}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{obsText}</p>
            {obsFooter && (
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                {obsFooter}
              </div>
            )}
          </div>
        )}

        {actionButtons && (
          <div className="flex gap-2 pt-2">
            {actionButtons}
          </div>
        )}
        
        {footerButtons && (
          <div className="mt-2">
            {footerButtons}
          </div>
        )}
        
      </div>
    </Modal>
  );
}
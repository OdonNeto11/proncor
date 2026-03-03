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
  customContent?: ReactNode; // NOVO: Para injetar os Anexos do PA
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

  const getBoxTheme = (theme: InfoBox['theme']) => {
    if (theme === 'blue') return 'bg-blue-50 border-blue-100 text-blue-600 value-blue-900';
    if (theme === 'purple') return 'bg-purple-50 border-purple-100 text-purple-600 value-purple-900';
    return 'bg-slate-100 border-slate-200 text-slate-500 value-slate-700'; 
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-5">
        
        {infoBoxes.length > 0 && (
          <div className="flex gap-2 text-center">
            {infoBoxes.map((box, idx) => {
              const themeClasses = getBoxTheme(box.theme);
              const textColor = themeClasses.split(' ')[2]; 
              const valueColor = themeClasses.split(' ')[3].replace('value-', 'text-'); 
              return (
                <div key={idx} className={`flex-1 p-2 rounded-xl border ${themeClasses.split(' ').slice(0,2).join(' ')}`}>
                  <span className={`text-[10px] font-bold uppercase block ${textColor}`}>{box.label}</span>
                  <div className={`font-bold text-sm ${valueColor}`}>{box.value}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className={`p-2 rounded-lg text-center text-xs font-bold border ${statusClasses.color} ${statusClasses.border}`}>
            STATUS ATUAL: {statusLabel}
        </div>

        {tags && tags.length > 0 && (
          <div className="bg-white border border-slate-200 p-4 rounded-xl">
            {tagsLabel && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{tagsLabel}</p>}
            <div className="flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                    <span key={idx} className="flex items-center gap-1 text-xs font-semibold bg-slate-50 text-slate-700 px-2 py-1 rounded-md border border-slate-200">
                        <Activity size={12} className="text-slate-400" /> {tag}
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
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">{obsLabel || 'Observações'}</p>
            <p className="text-sm text-slate-700 whitespace-pre-line">{obsText}</p>
            {obsFooter && (
              <div className="mt-2 pt-2 border-t border-slate-200">
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
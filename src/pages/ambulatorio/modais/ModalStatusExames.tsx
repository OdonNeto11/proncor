import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

// COMPONENTES UI
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Description } from '../../../components/ui/Typography';
import { DatePicker } from '../../../components/ui/DatePicker';
import { ToastError } from '../../../components/ui/ToastError';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  encaminhamento: any;
  onSuccess: () => void;
}

export function ModalStatusExames({ isOpen, onClose, encaminhamento, onSuccess }: Props) {
  const [exames, setExames] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && encaminhamento) {
      const fetchExames = async () => {
        const { data } = await supabase
          .from('encaminhamento_exames')
          .select('id, nome_customizado, data_agendamento, status_id, exames_especialidades(nome)')
          .eq('encaminhamento_id', encaminhamento.id);

        if (data) {
          setExames(data.map(d => ({
            id: d.id,
            nome: (d.exames_especialidades as any)?.nome || d.nome_customizado || 'Exame/Especialidade',
            data_agendamento: d.data_agendamento || '',
            status_id: d.status_id || ''
          })));
        }
      };
      fetchExames();
    }
  }, [isOpen, encaminhamento]);

  const validarESalvar = async (concluir: boolean) => {
    setErrors({});
    setErrorMsg('');
    const novosErros: Record<string, string> = {};
    const dataHoje = new Date().toISOString().split('T')[0];

    exames.forEach((ex, i) => {
      if (Number(ex.status_id) === 9) {
        if (!ex.data_agendamento) {
          novosErros[`status_exame_${i}`] = 'Informe a data do agendamento';
        } else if (ex.data_agendamento < dataHoje) {
          novosErros[`status_exame_${i}`] = 'A data não pode ser no passado';
        }
      }
      if (concluir && !ex.status_id) {
        novosErros[`status_exame_${i}`] = 'Este campo é obrigatório para concluir';
      }
    });

    if (Object.keys(novosErros).length > 0) {
      setErrors(novosErros);
      setErrorMsg(concluir ? 'Para concluir o ticket, todos os exames precisam ter um status definido.' : 'Por favor, preencha corretamente os campos em vermelho.');
      return;
    }

    setLoading(true);
    try {
      const updates = exames.map(ex => supabase.from('encaminhamento_exames').update({ 
        status_id: ex.status_id || null, 
        data_agendamento: Number(ex.status_id) === 9 ? ex.data_agendamento : null 
      }).eq('id', ex.id));
      
      await Promise.all(updates);

      if (concluir) {
        await supabase.from('encaminhamentos_ambulatorio').update({ 
            status_id: 14, 
            updated_at: new Date().toISOString() 
        }).eq('id', encaminhamento.id);
      }
      onSuccess();
    } catch (e) { 
        setErrorMsg('Erro de comunicação com o banco de dados.'); 
    } finally { 
        setLoading(false); 
    }
  };

  if (!encaminhamento) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={<span className="text-purple-600 dark:text-purple-500 font-bold text-lg">Status por Exame/Especialidade</span>}
    >
      <div className="space-y-4 animate-in zoom-in-95 duration-200">
        <Description className="text-center mb-6">
          Atualize o status individual de cada solicitação feita para <strong className="text-purple-600 dark:text-purple-400">{encaminhamento.nome_paciente || 'Nome não informado'}</strong>.
        </Description>

        <div className="space-y-4 min-h-[300px] max-h-[450px] overflow-y-auto pr-1 pb-10">
          {exames.map((exame, index) => (
            <div 
              key={exame.id} 
              id={`status_exame_${index}`}
              className={`bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border transition-all ${errors[`status_exame_${index}`] ? 'border-red-500 shadow-sm shadow-red-500/20' : 'border-slate-200 dark:border-slate-700/50'}`}
              style={{ zIndex: 50 - index }}
            >
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-3">{exame.nome}</span>
              
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 flex flex-col">
                  <select 
                    value={exame.status_id || ''}
                    onChange={(e) => {
                      const novos = [...exames];
                      novos[index].status_id = e.target.value;
                      setExames(novos);
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg border bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm outline-none transition-colors focus:ring-2 focus:ring-purple-500 ${errors[`status_exame_${index}`] ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    <option value="">Aguardando tratativa...</option>
                    <option value="9">Agendado</option>
                    <option value="10">Plano não Atendido</option>
                    <option value="11">Sem Especialidade</option>
                    <option value="12">Sem Contato</option>
                  </select>
                  {errors[`status_exame_${index}`] && (
                    <span className="text-xs text-red-500 font-medium mt-1">{errors[`status_exame_${index}`]}</span>
                  )}
                </div>

                {Number(exame.status_id) === 9 && (
                  <div className="flex-1 flex-shrink-0 animate-in fade-in duration-200">
                    <DatePicker 
                      value={exame.data_agendamento} 
                      onChange={(e) => {
                        const novos = [...exames];
                        novos[index].data_agendamento = e.target.value;
                        setExames(novos);
                      }} 
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />

        <div className="flex flex-col md:flex-row gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" fullWidth onClick={onClose} type="button">Voltar</Button>
          <Button variant="primary" fullWidth onClick={() => validarESalvar(false)} disabled={loading}>Salvar</Button>
          <Button variant="success" fullWidth onClick={() => validarESalvar(true)} disabled={loading}>Salvar e Concluir</Button>
        </div>
      </div>
    </Modal>
  );
}
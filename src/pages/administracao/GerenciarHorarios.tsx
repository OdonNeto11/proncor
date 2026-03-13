import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Clock, Trash2, CheckCircle2, XCircle, ChevronRight, Home } from 'lucide-react';
import { Toast } from '../../components/ui/Toast';

// COMPONENTES NORMALIZADOS
import { Title } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';

type Horario = {
  id: number;
  horario: string;
  ativo: boolean;
};

const OPCOES_HORARIOS_RAPIDOS = Array.from({ length: 28 }, (_, i) => {
  const hora = Math.floor(i / 2) + 7;
  const minuto = i % 2 === 0 ? '00' : '30';
  return `${hora.toString().padStart(2, '0')}:${minuto}`;
});

interface GerenciarHorariosProps {
  onBack: () => void;
}

export function GerenciarHorarios({ onBack }: GerenciarHorariosProps) {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [novoHorario, setNovoHorario] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [horarioParaExcluir, setHorarioParaExcluir] = useState<{id: number, horario: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    fetchHorarios();
  }, []);

  const fetchHorarios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('config_horarios')
        .select('*')
        .order('horario', { ascending: true });

      if (error) throw error;
      if (data) setHorarios(data as Horario[]);
    } catch (error) {
      console.error('Erro ao buscar horários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHorarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 4) value = value.substring(0, 4);
    if (value.length > 2) value = value.substring(0, 2) + ':' + value.substring(2);
    setNovoHorario(value);
  };

  const selecionarHorarioVisual = (horario: string) => {
    setNovoHorario(horario);
    setShowTimePicker(false);
  };

  const adicionarHorario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoHorario) return;

    const regexHoraValida = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!regexHoraValida.test(novoHorario)) {
      setShowToast({ visible: true, message: 'Digite um horário válido.', type: 'error' });
      return;
    }

    const horarioFormatado = `${novoHorario}:00`;

    try {
      const { error } = await supabase
        .from('config_horarios')
        .insert([{ horario: horarioFormatado, ativo: true }]);

      if (error) throw error;
      
      setShowToast({ visible: true, message: `Horário ${novoHorario} adicionado!`, type: 'success' });
      setNovoHorario('');
      fetchHorarios();
    } catch (error: any) {
      setShowToast({ visible: true, message: 'Erro ao adicionar horário.', type: 'error' });
    }
  };

  const toggleStatus = async (id: number, statusAtual: boolean, horarioStr: string) => {
    try {
      const { error } = await supabase
        .from('config_horarios')
        .update({ ativo: !statusAtual })
        .eq('id', id);

      if (error) throw error;
      fetchHorarios();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const confirmarExclusao = async () => {
    if (!horarioParaExcluir) return;
    try {
      const { error } = await supabase.from('config_horarios').delete().eq('id', horarioParaExcluir.id);
      if (error) throw error;
      fetchHorarios();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    } finally {
      setHorarioParaExcluir(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-300 transition-colors">
      <div className="px-6 pt-6 pb-2">
        <nav className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors">
            <Home size={14} />
            <span>Home</span>
          </Link>
          <ChevronRight size={14} className="text-slate-400 dark:text-slate-600" />
          <button onClick={onBack} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
            Administração
          </button>
          <ChevronRight size={14} className="text-slate-400 dark:text-slate-600" />
          <span className="text-slate-800 dark:text-slate-200 font-bold">Grade de Horários</span>
        </nav>
      </div>

      <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 transition-colors">
        <div>
          <Title className="!text-2xl !mb-0 flex items-center gap-2 text-gray-800 dark:text-white">
            <Clock size={28} className="text-orange-500" /> Grade de Horários
          </Title>
        </div>
        
        <form onSubmit={adicionarHorario} className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex items-center bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg pl-4 pr-1 py-1 focus-within:ring-2 focus-within:ring-blue-500 shadow-sm transition-colors">
             <input 
                type="text"
                required
                value={novoHorario}
                onChange={handleHorarioChange}
                placeholder="00:00"
                className="bg-transparent outline-none font-bold text-gray-700 dark:text-slate-200 text-lg text-center w-16"
             />
             <button type="button" onClick={() => setShowTimePicker(!showTimePicker)} className="ml-2 p-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                <Clock size={18} />
             </button>
             {showTimePicker && (
               <>
                 <div className="fixed inset-0 z-40" onClick={() => setShowTimePicker(false)} />
                 <div className="absolute top-full right-0 mt-2 w-48 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 grid grid-cols-2 gap-1">
                    {OPCOES_HORARIOS_RAPIDOS.map(hora => (
                      <button key={hora} type="button" onClick={() => selecionarHorarioVisual(hora)} className="py-2 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        {hora}
                      </button>
                    ))}
                 </div>
               </>
             )}
          </div>
          
          <Button type="submit" variant="primary">
            Adicionar
          </Button>
        </form>
      </div>

      {loading ? (
        <div className="p-10 text-center text-gray-500 dark:text-slate-400">Carregando...</div>
      ) : (
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 bg-slate-50 dark:bg-slate-950 transition-colors">
          {horarios.map((item) => (
            <div key={item.id} className={`border dark:border-slate-700/50 rounded-xl p-3 flex flex-col items-center gap-3 transition-colors ${item.ativo ? 'bg-white dark:bg-slate-800' : 'bg-gray-100 dark:bg-slate-800/40 opacity-60'}`}>
              <span className="text-2xl font-bold text-gray-800 dark:text-slate-200">{item.horario.substring(0, 5)}</span>
              <div className="flex gap-2 w-full border-t border-gray-100 dark:border-slate-700/50 pt-2">
                <button onClick={() => toggleStatus(item.id, item.ativo, item.horario)} className="flex-1 py-2 rounded-lg flex justify-center hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  {item.ativo ? <CheckCircle2 size={16} className="text-green-600 dark:text-green-500" /> : <XCircle size={16} className="text-gray-400 dark:text-slate-500" />}
                </button>
                <button onClick={() => setHorarioParaExcluir({ id: item.id, horario: item.horario })} className="flex-1 py-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex justify-center transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {horarioParaExcluir && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm transition-colors">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center max-w-sm border border-transparent dark:border-slate-800 shadow-2xl transition-colors">
            <Title className="!text-xl !mb-6 text-gray-800 dark:text-slate-100">Excluir horário?</Title>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setHorarioParaExcluir(null)}>
                Cancelar
              </Button>
              <Button variant="danger" fullWidth onClick={confirmarExclusao}>
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {showToast.visible && <Toast message={showToast.message} onClose={() => setShowToast({ visible: false, message: '', type: 'success' })} />}
    </div>
  );
}
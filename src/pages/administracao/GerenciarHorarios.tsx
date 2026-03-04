import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Clock, Plus, Trash2, CheckCircle2, XCircle, AlertCircle, ChevronRight, Home } from 'lucide-react';
import { Toast } from '../../components/ui/Toast';

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

// O NOME AQUI DEVE SER EXATAMENTE GerenciarHorarios
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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
      <div className="px-6 pt-6 pb-2">
        <nav className="flex items-center space-x-2 text-sm text-slate-500 font-medium">
          <Link to="/" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
            <Home size={14} />
            <span>Home</span>
          </Link>
          <ChevronRight size={14} className="text-slate-400" />
          <button onClick={onBack} className="hover:text-blue-600 transition-colors font-medium">
            Administração
          </button>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-800 font-bold">Grade de Horários</span>
        </nav>
      </div>

      <div className="p-6 border-b border-gray-100 bg-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Clock size={28} className="text-orange-500" /> Grade de Horários
          </h2>
        </div>
        
        <form onSubmit={adicionarHorario} className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex items-center bg-white border border-gray-200 rounded-lg pl-4 pr-1 py-1 focus-within:ring-2 focus-within:ring-blue-500 shadow-sm">
             <input 
                type="text"
                required
                value={novoHorario}
                onChange={handleHorarioChange}
                placeholder="00:00"
                className="bg-transparent outline-none font-bold text-gray-700 text-lg text-center w-16"
             />
             <button type="button" onClick={() => setShowTimePicker(!showTimePicker)} className="ml-2 p-2">
                <Clock size={18} className="text-gray-400" />
             </button>
             {showTimePicker && (
               <>
                 <div className="fixed inset-0 z-40" onClick={() => setShowTimePicker(false)} />
                 <div className="absolute top-full right-0 mt-2 w-48 max-h-56 overflow-y-auto bg-white border rounded-xl shadow-xl z-50 p-2 grid grid-cols-2 gap-1">
                    {OPCOES_HORARIOS_RAPIDOS.map(hora => (
                      <button key={hora} type="button" onClick={() => selecionarHorarioVisual(hora)} className="py-2 text-sm font-semibold text-gray-700 hover:bg-blue-50 rounded-lg">
                        {hora}
                      </button>
                    ))}
                 </div>
               </>
             )}
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold">
            Adicionar
          </button>
        </form>
      </div>

      {loading ? (
        <div className="p-10 text-center text-gray-500">Carregando...</div>
      ) : (
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 bg-slate-50">
          {horarios.map((item) => (
            <div key={item.id} className={`border rounded-xl p-3 flex flex-col items-center gap-3 ${item.ativo ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
              <span className="text-2xl font-bold text-gray-800">{item.horario.substring(0, 5)}</span>
              <div className="flex gap-2 w-full border-t pt-2">
                <button onClick={() => toggleStatus(item.id, item.ativo, item.horario)} className="flex-1 py-2 rounded-lg flex justify-center">
                  {item.ativo ? <CheckCircle2 size={16} className="text-green-600" /> : <XCircle size={16} className="text-gray-400" />}
                </button>
                <button onClick={() => setHorarioParaExcluir({ id: item.id, horario: item.horario })} className="flex-1 py-2 text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {horarioParaExcluir && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 text-center max-w-sm">
            <h3 className="text-xl font-bold mb-4">Excluir horário?</h3>
            <div className="flex gap-3">
              <button onClick={() => setHorarioParaExcluir(null)} className="flex-1 bg-gray-100 py-3 rounded-xl">Cancelar</button>
              <button onClick={confirmarExclusao} className="flex-1 bg-red-600 text-white py-3 rounded-xl">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {showToast.visible && <Toast message={showToast.message} onClose={() => setShowToast({ visible: false, message: '', type: 'success' })} />}
    </div>
  );
}
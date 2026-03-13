import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Clock, Trash2, CheckCircle2, XCircle, ChevronRight, Home, CalendarDays, CalendarHeart } from 'lucide-react';
import { Toast } from '../../components/ui/Toast';
import { Title, Description } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';

type Horario = {
  id: number;
  horario: string;
  ativo: boolean;
  tipo_dia: 'semana' | 'fim_semana'; // NOVO TIPO
};

const OPCOES_HORARIOS_RAPIDOS = Array.from({ length: 68 }, (_, i) => {
  const hora = Math.floor(i / 4) + 6; // Começa às 06:00
  const minuto = (i % 4) * 15; // Multiplica por 15 (0, 15, 30, 45)
  return `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
});

interface GerenciarHorariosProps {
  onBack: () => void;
}

export function GerenciarHorarios({ onBack }: GerenciarHorariosProps) {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [novoHorario, setNovoHorario] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'semana' | 'fim_semana'>('semana'); // CONTROLE DE ABAS
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
        // AGORA INSERE COM O TIPO DE DIA DA ABA ATIVA
        .insert([{ horario: horarioFormatado, ativo: true, tipo_dia: abaAtiva }]);

      if (error) throw error;
      
      setShowToast({ visible: true, message: `Horário ${novoHorario} adicionado!`, type: 'success' });
      setNovoHorario('');
      fetchHorarios();
} catch (error: any) {
      // 23505 é o código padrão do banco de dados para "Registro Duplicado"
      if (error.code === '23505') {
        setShowToast({ visible: true, message: 'Horário já cadastrado!', type: 'error' });
      } else {
        setShowToast({ visible: true, message: 'Erro ao adicionar horário.', type: 'error' });
      }
    }
  };

  const toggleStatus = async (id: number, statusAtual: boolean) => {
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

  const horariosFiltrados = horarios.filter(h => h.tipo_dia === abaAtiva);

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

      <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
            <div>
            <Title className="!text-2xl !mb-0 flex items-center gap-2 text-gray-800 dark:text-white">
                <Clock size={28} className="text-orange-500" /> Grade de Horários
            </Title>
            <Description className="!mt-1">Configure os horários disponíveis para o Pronto Atendimento.</Description>
            </div>
            
            <form onSubmit={adicionarHorario} className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
            <div className="relative flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg pl-4 pr-1 py-1 focus-within:ring-2 focus-within:ring-blue-500 shadow-sm transition-colors">
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
                Adicionar em {abaAtiva === 'semana' ? 'Dia de Semana' : 'Finais de Semana'}
            </Button>
            </form>
        </div>

        {/* NAVEGAÇÃO DAS ABAS */}
        <div className="flex gap-2">
            <button 
                onClick={() => setAbaAtiva('semana')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-colors ${abaAtiva === 'semana' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
                <CalendarDays size={18} />
                Dias de Semana (Seg a Sex)
            </button>
            <button 
                onClick={() => setAbaAtiva('fim_semana')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-colors ${abaAtiva === 'fim_semana' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
                <CalendarHeart size={18} />
                Finais de Semana (Sáb e Dom)
            </button>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-gray-500 dark:text-slate-400">Carregando...</div>
      ) : (
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 bg-slate-50 dark:bg-slate-950 transition-colors min-h-[200px] items-start content-start">
          {horariosFiltrados.length === 0 ? (
            <div className="col-span-full text-center py-10 text-slate-400 font-medium">Nenhum horário cadastrado para este grupo.</div>
          ) : (
            horariosFiltrados.map((item) => (
                <div key={item.id} className={`border dark:border-slate-700/50 rounded-xl p-3 flex flex-col items-center gap-3 transition-colors ${item.ativo ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-gray-100 dark:bg-slate-800/40 opacity-60'}`}>
                <span className="text-2xl font-bold text-gray-800 dark:text-slate-200">{item.horario.substring(0, 5)}</span>
                <div className="flex gap-2 w-full border-t border-gray-100 dark:border-slate-700/50 pt-2">
                    <button onClick={() => toggleStatus(item.id, item.ativo)} className="flex-1 py-2 rounded-lg flex justify-center hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    {item.ativo ? <CheckCircle2 size={16} className="text-green-600 dark:text-green-500" /> : <XCircle size={16} className="text-gray-400 dark:text-slate-500" />}
                    </button>
                    <button onClick={() => setHorarioParaExcluir({ id: item.id, horario: item.horario })} className="flex-1 py-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex justify-center transition-colors">
                    <Trash2 size={16} />
                    </button>
                </div>
                </div>
            ))
          )}
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
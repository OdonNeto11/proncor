import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Clock, Plus, Trash2, CheckCircle2, XCircle, Settings, LayoutDashboard, ArrowLeft, AlertCircle } from 'lucide-react';
import { Toast } from '../components/ui/Toast';
import { Dashboard } from './Dashboard';

type Horario = {
  id: number;
  horario: string;
  ativo: boolean;
};

type AdminView = 'hub' | 'horarios' | 'dashboard';

// Lista pré-definida para o nosso seletor visual (das 07:00 às 20:30)
const OPCOES_HORARIOS_RAPIDOS = Array.from({ length: 28 }, (_, i) => {
  const hora = Math.floor(i / 2) + 7;
  const minuto = i % 2 === 0 ? '00' : '30';
  return `${hora.toString().padStart(2, '0')}:${minuto}`;
});

export function Admin() {
  const { roleId, loading: authLoading } = useAuth();
  const location = useLocation();
  
  const [view, setView] = useState<AdminView>('hub');
  const [horarios, setHorarios] = useState<Horario[]>([]);
  
  const [novoHorario, setNovoHorario] = useState('');
  // NOVO: Controla a exibição do nosso menu de seleção visual
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [horarioParaExcluir, setHorarioParaExcluir] = useState<{id: number, horario: string} | null>(null);

  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    if (location.state && (location.state as any).reset) {
      setView('hub');
    }
  }, [location.state]);

  useEffect(() => {
    if (!authLoading && roleId === 1 && view === 'horarios') {
      fetchHorarios();
    }
  }, [authLoading, roleId, view]);

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
      setShowToast({ visible: true, message: 'Digite um horário válido (ex: 17:40).', type: 'error' });
      return;
    }

    const horarioFormatado = `${novoHorario}:00`;

    try {
      const { error } = await supabase
        .from('config_horarios')
        .insert([{ horario: horarioFormatado, ativo: true }]);

      if (error) throw error;
      
      setShowToast({ visible: true, message: `Horário ${novoHorario} adicionado com sucesso!`, type: 'success' });
      setNovoHorario('');
      fetchHorarios();
    } catch (error: any) {
      if (error.code === '23505') {
        setShowToast({ visible: true, message: `O horário ${novoHorario} já existe na grade.`, type: 'error' });
      } else {
        setShowToast({ visible: true, message: 'Erro ao adicionar horário.', type: 'error' });
      }
    }
  };

  const toggleStatus = async (id: number, statusAtual: boolean, horarioStr: string) => {
    try {
      const { error } = await supabase
        .from('config_horarios')
        .update({ ativo: !statusAtual })
        .eq('id', id);

      if (error) throw error;
      
      const acao = statusAtual ? 'desativado' : 'ativado';
      setShowToast({ visible: true, message: `Horário ${horarioStr.substring(0, 5)} ${acao}.`, type: 'success' });
      fetchHorarios();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const confirmarExclusao = async () => {
    if (!horarioParaExcluir) return;

    try {
      const { error } = await supabase
        .from('config_horarios')
        .delete()
        .eq('id', horarioParaExcluir.id);

      if (error) throw error;
      
      setShowToast({ visible: true, message: `Horário ${horarioParaExcluir.horario.substring(0, 5)} excluído definitivamente.`, type: 'success' });
      fetchHorarios();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      setShowToast({ visible: true, message: 'Erro ao tentar excluir o horário.', type: 'error' });
    } finally {
      setHorarioParaExcluir(null);
    }
  };

  if (authLoading) return null;
  if (roleId !== 1) return <Navigate to="/" replace />;

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Settings className="text-blue-600" size={28} />
            <h1 className="text-2xl font-bold text-gray-800">Painel de Administração</h1>
          </div>
          <p className="text-gray-500 text-sm">Gerencie os indicadores, configurações e acessos do sistema.</p>
        </div>
        
        {view !== 'hub' && (
          <button 
            onClick={() => setView('hub')} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold transition-colors shadow-sm"
          >
            <ArrowLeft size={18} /> Voltar ao Menu
          </button>
        )}
      </div>

      {view === 'hub' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-300">
          
          <div onClick={() => setView('dashboard')} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer transition-all group">
             <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <LayoutDashboard size={24} />
             </div>
             <h3 className="text-lg font-bold text-gray-800 mb-2">Dashboard Operacional</h3>
             <p className="text-sm text-gray-500">Acesse as métricas gerais, quantidade de atendimentos e indicadores.</p>
          </div>

          <div onClick={() => setView('horarios')} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-400 cursor-pointer transition-all group">
             <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Clock size={24} />
             </div>
             <h3 className="text-lg font-bold text-gray-800 mb-2">Horários de Agendamento</h3>
             <p className="text-sm text-gray-500">Adicione, remova ou desative os horários disponíveis na agenda.</p>
          </div>

        </div>
      )}

      {view === 'dashboard' && (
        <div className="animate-in slide-in-from-right-8 duration-300">
          <Dashboard />
        </div>
      )}

      {view === 'horarios' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-right-8 duration-300">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Clock size={20} className="text-orange-500" /> Grade de Horários
              </h2>
              <p className="text-xs text-gray-500 mt-1">Gerencie as opções que aparecem no momento do agendamento.</p>
            </div>
            
            <form onSubmit={adicionarHorario} className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              
              {/* CAMPO HÍBRIDO: Texto com máscara + Botão de Menu Dropdown */}
              <div className="relative flex items-center bg-white border border-gray-200 rounded-lg pl-4 pr-1 py-1 focus-within:ring-2 focus-within:ring-blue-500 shadow-sm flex-1 sm:flex-none">
                 <input 
                    type="text"
                    required
                    value={novoHorario}
                    onChange={handleHorarioChange}
                    placeholder="00:00"
                    className="bg-transparent outline-none font-bold text-gray-700 text-lg text-center w-16 tracking-widest placeholder:font-normal placeholder:text-gray-300"
                 />
                 
                 <button 
                    type="button" 
                    onClick={() => setShowTimePicker(!showTimePicker)}
                    className="ml-2 p-2 hover:bg-gray-100 rounded-md transition-colors"
                 >
                    <Clock size={18} className="text-gray-400" />
                 </button>

                 {/* O MENU SUSPENSO */}
                 {showTimePicker && (
                   <>
                     {/* Overlay invisível para fechar ao clicar fora */}
                     <div className="fixed inset-0 z-40" onClick={() => setShowTimePicker(false)} />
                     
                     <div className="absolute top-full right-0 mt-2 w-48 max-h-56 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-2 grid grid-cols-2 gap-1 animate-in slide-in-from-top-2 duration-200">
                        {OPCOES_HORARIOS_RAPIDOS.map(hora => (
                          <button
                            key={hora}
                            type="button"
                            onClick={() => selecionarHorarioVisual(hora)}
                            className="py-2 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                          >
                            {hora}
                          </button>
                        ))}
                     </div>
                   </>
                 )}
              </div>
              
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm w-full sm:w-auto">
                <Plus size={18} /> Adicionar
              </button>
            </form>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">Carregando horários...</div>
          ) : (
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {horarios.map((item) => (
                <div key={item.id} className={`border rounded-xl p-3 flex flex-col items-center gap-3 transition-colors hover:shadow-sm ${item.ativo ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                  <span className="text-2xl font-bold text-gray-800 tracking-tight">
                    {item.horario.substring(0, 5)}
                  </span>
                  
                  <div className="flex gap-2 w-full mt-2 pt-2 border-t border-gray-100">
                    <button 
                      onClick={() => toggleStatus(item.id, item.ativo, item.horario)}
                      title={item.ativo ? "Desativar" : "Ativar"}
                      className={`flex-1 py-2 rounded-lg flex justify-center items-center transition-colors ${item.ativo ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                    >
                      {item.ativo ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </button>
                    
                    <button 
                      onClick={() => setHorarioParaExcluir({ id: item.id, horario: item.horario })}
                      title="Excluir Definitivamente"
                      className="flex-1 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg flex justify-center items-center transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {horarioParaExcluir && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center">
            
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-red-100 text-red-600 mb-4">
              <AlertCircle size={32} />
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-2">Excluir horário?</h3>
            <p className="text-gray-500 text-sm mb-6">
              O horário <strong className="text-gray-800 text-base">{horarioParaExcluir.horario.substring(0, 5)}</strong> será removido permanentemente da sua grade de agendamentos.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setHorarioParaExcluir(null)} 
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarExclusao} 
                className="flex-1 text-white py-3 rounded-xl font-semibold bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
              >
                Sim, Excluir
              </button>
            </div>

          </div>
        </div>
      )}

      {showToast.visible && <Toast message={showToast.message} onClose={() => setShowToast({ visible: false, message: '', type: 'success' })} />}
    </div>
  );
}
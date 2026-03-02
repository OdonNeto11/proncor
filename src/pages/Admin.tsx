import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Clock, Plus, Trash2, CheckCircle2, XCircle, Settings, LayoutDashboard, ArrowLeft, Users } from 'lucide-react';
import { Toast } from '../components/ui/Toast';
import { Dashboard } from './Dashboard';

type Horario = {
  id: number;
  horario: string;
  ativo: boolean;
};

type AdminView = 'hub' | 'horarios' | 'dashboard';

export function Admin() {
  const { roleId, loading: authLoading } = useAuth();
  
  // NOVO: Estado para controlar qual tela do Admin está aberta
  const [view, setView] = useState<AdminView>('hub');
  
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [novoHorario, setNovoHorario] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState({ visible: false, message: '', type: 'success' });

  // Só busca os horários se o usuário abrir a tela de horários
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

  const adicionarHorario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoHorario) return;

    const horarioFormatado = `${novoHorario}:00`;

    try {
      const { error } = await supabase
        .from('config_horarios')
        .insert([{ horario: horarioFormatado, ativo: true }]);

      if (error) throw error;
      
      setShowToast({ visible: true, message: 'Horário adicionado!', type: 'success' });
      setNovoHorario('');
      fetchHorarios();
    } catch (error: any) {
      if (error.code === '23505') {
        setShowToast({ visible: true, message: 'Este horário já existe.', type: 'error' });
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

  const excluirHorario = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este horário?')) return;

    try {
      const { error } = await supabase
        .from('config_horarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setShowToast({ visible: true, message: 'Horário excluído.', type: 'success' });
      fetchHorarios();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      setShowToast({ visible: true, message: 'Erro ao excluir.', type: 'error' });
    }
  };

  if (authLoading) return null;
  if (roleId !== 1) return <Navigate to="/" replace />;

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      
      {/* HEADER DO PAINEL ADMIN */}
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

      {/* TELA 1: HUB CENTRAL (CARDS DE ACESSO) */}
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

          <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-300 opacity-70 cursor-not-allowed">
             <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-lg flex items-center justify-center mb-4">
                <Users size={24} />
             </div>
             <h3 className="text-lg font-bold text-slate-700 mb-2">Controle de Usuários</h3>
             <p className="text-sm text-slate-500 font-medium bg-slate-200 inline-block px-2 py-0.5 rounded text-[11px] mb-1">EM BREVE</p>
             <p className="text-sm text-slate-500">Cadastre e gerencie os acessos da sua equipe.</p>
          </div>

        </div>
      )}

      {/* TELA 2: DASHBOARD */}
      {view === 'dashboard' && (
        <div className="animate-in slide-in-from-right-8 duration-300">
          <Dashboard />
        </div>
      )}

      {/* TELA 3: GESTÃO DE HORÁRIOS */}
      {view === 'horarios' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-right-8 duration-300">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Clock size={20} className="text-orange-500" /> Grade de Horários
              </h2>
              <p className="text-xs text-gray-500 mt-1">Gerencie as opções que aparecem no momento do agendamento.</p>
            </div>
            
            <form onSubmit={adicionarHorario} className="flex gap-2 w-full md:w-auto">
              <input 
                type="time" 
                required
                value={novoHorario}
                onChange={(e) => setNovoHorario(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors">
                <Plus size={18} /> Adicionar
              </button>
            </form>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">Carregando horários...</div>
          ) : (
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {horarios.map((item) => (
                <div key={item.id} className={`border rounded-lg p-3 flex flex-col items-center gap-3 transition-colors ${item.ativo ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                  <span className="text-xl font-bold text-gray-800">
                    {item.horario.substring(0, 5)}
                  </span>
                  
                  <div className="flex gap-2 w-full mt-2 pt-2 border-t border-gray-100">
                    <button 
                      onClick={() => toggleStatus(item.id, item.ativo)}
                      title={item.ativo ? "Desativar" : "Ativar"}
                      className={`flex-1 py-1.5 rounded flex justify-center items-center transition-colors ${item.ativo ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                    >
                      {item.ativo ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </button>
                    <button 
                      onClick={() => excluirHorario(item.id)}
                      title="Excluir"
                      className="flex-1 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded flex justify-center items-center transition-colors"
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

      {showToast.visible && <Toast message={showToast.message} onClose={() => setShowToast({ visible: false, message: '', type: 'success' })} />}
    </div>
  );
}
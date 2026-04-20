import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from "../../../lib/supabase"; 
import { useTheme } from '../../../contexts/ThemeContext';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList,
  PieChart, Pie, Cell, Legend
} from 'recharts';

import { Card } from '../../../components/ui/Card';
import { Title, Description } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';

import { Download, X, Filter, Calendar as CalendarIcon, User, Activity, ChevronRight, Home, HelpCircle } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';

const CONFIG_STATUS: Record<number, { label: string, color: string }> = {
  1: { label: 'Agendado', color: '#3b82f6' },
  2: { label: 'Reagendado', color: '#f59e0b' },
  3: { label: 'Cancelado', color: '#ef4444' },
  4: { label: 'Não Atende', color: '#94a3b8' },
  5: { label: 'Finalizado', color: '#10b981' },
  6: { label: 'Encaminhado Amb', color: '#8b5cf6' },
  7: { label: 'Retorno ao PA', color: '#6366f1' }
};

interface DashPAProps {
  onBack: () => void;
}

export function DashPA({ onBack }: DashPAProps) {
  const { isDark } = useTheme();

  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<string>('');
  const [crmFiltro, setCrmFiltro] = useState<string>('');

  const [tipoGraficoMensal, setTipoGraficoMensal] = useState<'todos' | 'sucesso'>('todos');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<any[]>([]);
  const [rawAgendamentos, setRawAgendamentos] = useState<any[]>([]);

  const [stats, setStats] = useState({
    totalGeral: 0, sucesso: 0, filaAgendados: 0, agendadosCount: 0,
    reagendadosCount: 0, semConversao: 0, mensal: [] as any[], porStatus: [] as any[]
  });

  async function fetchStats() {
    try {
      let query = supabase
        .from('agendamentos')
        .select(`id, data_agendamento, hora_agendamento, nome_paciente, numero_atendimento, crm_responsavel, status_id, status:status_id (nome, agrupamento)`);

      if (dataInicio) query = query.gte('data_agendamento', format(dataInicio, 'yyyy-MM-dd'));
      if (dataFim) query = query.lte('data_agendamento', format(dataFim, 'yyyy-MM-dd'));
      if (statusFiltro) query = query.eq('status_id', parseInt(statusFiltro));
      if (crmFiltro) query = query.ilike('crm_responsavel', `%${crmFiltro}%`);

      const { data: allData, error } = await query;
      if (error) throw error;

      setRawAgendamentos(allData || []);

      const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const ultimos6Meses: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        ultimos6Meses.push({ 
          num: d.getMonth(), 
          name: mesesNomes[d.getMonth()], 
          year: d.getFullYear(), 
          todos: 0, 
          sucesso: 0, 
          perdidos: 0, 
          labelPerdidos: '' 
        });
      }

      let countTotalGeral = 0, countFila = 0, countAgendados = 0, countReagendados = 0, countSucesso = 0, countSemConversao = 0;
      const statusMap: Record<number, { nome: string, count: number }> = {};

      allData?.forEach((item: any) => {
        if (!item.status) return; 
        const statusId = item.status_id;
        if (statusId === 3) return; 

        countTotalGeral++;
        const agrupamento = item.status.agrupamento;

        if (agrupamento === 'sucesso') {
          countSucesso++;
        } else if (agrupamento === 'pendente') {
          countFila++;
          if (statusId === 1) countAgendados++;
          if (statusId === 2) countReagendados++;
        } else if (statusId === 4) {
          countSemConversao++;
        }
        
        if (item.data_agendamento) {
          const [y, m, d] = item.data_agendamento.split('-').map(Number);
          const dataAg = new Date(y, m - 1, d);
          const mesRef = ultimos6Meses.find(mRef => mRef.num === dataAg.getMonth() && mRef.year === dataAg.getFullYear());
          if (mesRef) {
            mesRef.todos++; 
            if (agrupamento === 'sucesso') {
              mesRef.sucesso++; 
            }
            if (statusId === 4) {
              mesRef.perdidos++;
            }
          }
        }

        if (!statusMap[statusId]) statusMap[statusId] = { nome: item.status.nome, count: 0 };
        statusMap[statusId].count++;
      });

      // Cálculo de percentual e labels para a linha de perdidos
      ultimos6Meses.forEach(mes => {
        const percentual = mes.todos > 0 ? Math.round((mes.perdidos / mes.todos) * 100) : 0;
        mes.labelPerdidos = mes.perdidos > 0 ? `${mes.perdidos} (${percentual}%)` : '';
      });

      const statusFormatted = Object.keys(statusMap).map(key => {
        const idNum = parseInt(key);
        return {
          name: CONFIG_STATUS[idNum]?.label || statusMap[idNum].nome.toUpperCase().replace('_', ' '),
          value: statusMap[idNum].count,
          color: CONFIG_STATUS[idNum]?.color || '#94a3b8' 
        };
      }).sort((a, b) => b.value - a.value);

      setStats({ 
        totalGeral: countTotalGeral, 
        sucesso: countSucesso, 
        filaAgendados: countFila, 
        agendadosCount: countAgendados, 
        reagendadosCount: countReagendados, 
        semConversao: countSemConversao, 
        mensal: ultimos6Meses, 
        porStatus: statusFormatted 
      });
    } catch (err) { 
      console.error('Erro ao buscar KPIs:', err); 
    }
  }

  useEffect(() => { fetchStats(); }, [dataInicio, dataFim, statusFiltro, crmFiltro]);

  const openModal = (title: string, filtroFn: (item: any) => boolean) => {
    setModalTitle(title); 
    setModalData(rawAgendamentos.filter(filtroFn)); 
    setIsModalOpen(true);
  };

  const handleBarClick = (data: any) => {
    if (!data) return;
    const titulo = `Agendamentos - ${data.name}/${data.year} (${tipoGraficoMensal === 'todos' ? 'Todos' : 'Sucesso'})`;
    openModal(titulo, (item) => {
      if (item.status_id === 3) return false; 
      if (!item.data_agendamento) return false;
      const [y, m, d] = item.data_agendamento.split('-').map(Number);
      const isSameMonth = (m - 1 === data.num) && (y === data.year);
      if (!isSameMonth) return false;
      if (tipoGraficoMensal === 'sucesso' && item.status?.agrupamento !== 'sucesso') return false;
      return true;
    });
  };

  const exportToExcel = () => {
    const dataToExport = modalData.map(item => ({
      'Data': item.data_agendamento ? format(parseISO(item.data_agendamento), 'dd/MM/yyyy') : '-',
      'Hora': item.hora_agendamento || '-', 
      'Nº Atendimento': item.numero_atendimento || '-',
      'Paciente': item.nome_paciente || '-', 
      'CRM': item.crm_responsavel || '-',
      'Status': CONFIG_STATUS[item.status_id]?.label?.toUpperCase() || 'DESCONHECIDO'
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Agendamentos");
    XLSX.writeFile(workbook, `Relatorio_${modalTitle.replace(/\s+/g, '_')}.xlsx`);
  };

  const renderCustomLegend = () => (
    <ul className="grid grid-cols-2 gap-x-2 gap-y-3 m-0 p-0 list-none mt-4">
      {stats.porStatus.map((entry, index) => (
        <li key={`legend-${index}`} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: entry.color }} />
          <span className="font-black text-slate-800 dark:text-white text-sm">{entry.value}</span>
          <span className="truncate font-medium text-slate-500 dark:text-slate-400 text-xs">{entry.name}</span>
        </li>
      ))}
    </ul>
  );

  const totalDesfechos = stats.totalGeral - stats.filaAgendados;
  const taxaConversao = totalDesfechos > 0 ? ((stats.sucesso / totalDesfechos) * 100).toFixed(1) : '0.0';
  const taxaSemRetorno = totalDesfechos > 0 ? ((stats.semConversao / totalDesfechos) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-10">
      
      <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <nav className="flex items-center space-x-2 text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium mb-5 overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"><Home size={14} /> <span>Home</span></Link>
          <ChevronRight size={14} className="text-slate-400" />
          <Link to="/admin" state={{ forceAdminHub: true }} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Administração</Link>
          <ChevronRight size={14} className="text-slate-400" />
          <button onClick={onBack} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Dashboards</button>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-800 dark:text-slate-200 font-bold">Dash PA</span>
        </nav>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Activity className="text-blue-600 dark:text-blue-500 hidden sm:block" size={32} />
            <Title className="!text-2xl md:!text-3xl !mb-0 text-gray-800 dark:text-white">Painel do Pronto Atendimento</Title>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-gray-50 dark:border-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <DatePicker selected={dataInicio} onChange={setDataInicio} isClearable locale="pt-BR" dateFormat="dd/MM/yyyy" placeholderText="Início" className="!h-10 !text-sm !pl-10 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-800 dark:text-slate-200 outline-none" onFocus={(e) => e.target.blur()} />
            </div>
            <span className="text-gray-400 text-xs">até</span>
            <div className="relative flex-1">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <DatePicker selected={dataFim} onChange={setDataFim} isClearable locale="pt-BR" dateFormat="dd/MM/yyyy" placeholderText="Fim" className="!h-10 !text-sm !pl-10 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-800 dark:text-slate-200 outline-none" onFocus={(e) => e.target.blur()} />
            </div>
          </div>
          
          <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="CRM..." value={crmFiltro} onChange={e => setCrmFiltro(e.target.value.replace(/\D/g, ''))} maxLength={5} className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-800 dark:text-slate-200 text-sm h-10 outline-none" />
          </div>

          <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-800 dark:text-slate-200 text-sm h-10 outline-none appearance-none">
                  <option value="">Todos os Status</option>
                  {Object.entries(CONFIG_STATUS).map(([id, config]) => (<option key={id} value={id}>{config.label}</option>))}
              </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 border-l-4 border-l-slate-600 dark:border-l-slate-400 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => openModal('Total de Registros', (i) => i.status_id !== 3)}>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase mb-1">Total Registros</p>
          <p className="text-3xl font-black text-gray-800 dark:text-white">{stats.totalGeral}</p>
        </Card>
        
        <Card className="p-4 border-l-4 border-l-green-500 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => openModal('Finalizados', (i) => i.status?.agrupamento === 'sucesso')}>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase mb-1">Finalizado</p>
          <p className="text-3xl font-black text-gray-800 dark:text-white">{stats.sucesso}</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500 cursor-pointer hover:scale-[1.02] transition-transform overflow-hidden" onClick={() => openModal('Fila', (i) => i.status?.agrupamento === 'pendente')}>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase mb-1">Fila</p>
          <p className="text-3xl font-black text-gray-800 dark:text-white mb-3">{stats.filaAgendados}</p>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50 dark:bg-blue-900/30 px-3 md:px-8 py-2 rounded-lg flex flex-col items-center border border-blue-100/50 dark:border-blue-800/50 w-full">
                <span className="text-blue-600 dark:text-blue-300 font-black text-xs">{stats.agendadosCount}</span>
                <span className="text-[9px] md:text-[10px] font-black uppercase text-blue-400/70 dark:text-blue-500/70 tracking-tighter">Agendados</span>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/30 px-3 md:px-8 py-2 rounded-lg flex flex-col items-center border border-orange-100/50 dark:border-orange-800/50 w-full">
                <span className="text-orange-600 dark:text-orange-300 font-black text-xs">{stats.reagendadosCount}</span>
                <span className="text-[9px] md:text-[10px] font-black uppercase text-orange-400/70 dark:text-orange-500/70 tracking-tighter">Reagendados</span>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-l-4 border-l-indigo-500">
          <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase mb-1">Taxa Conversão</p>
          <p className="text-3xl font-black text-gray-800 dark:text-white">{taxaConversao}%</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-red-500 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => openModal('Sem Contato', (i) => i.status_id === 4)}>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase mb-1">Sem Contato</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-gray-800 dark:text-white">{stats.semConversao}</p>
            <span className="text-sm font-bold text-gray-400">({taxaSemRetorno}%)</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <Card className="p-4 md:p-6 overflow-hidden">
          <div className="flex justify-between items-start sm:items-center mb-8 flex-col sm:flex-row gap-4 sm:gap-0">
            <div>
              <Title className="!text-lg !mb-0 text-gray-700 dark:text-slate-200">Evolução de Agendamentos</Title>
              <Description className="!mt-0 !text-xs">Visualização dos últimos 6 meses</Description>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="group relative flex items-center justify-center">
                <HelpCircle size={18} className="text-slate-400 hover:text-blue-500 cursor-help transition-colors" />
                <div className="absolute right-0 top-6 w-60 p-3 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                   <p className="font-bold mb-2 border-b border-slate-600 pb-1">Regras do Filtro:</p>
                   <div className="text-[11px]">
                     <span className="font-bold text-green-400 mb-1 block">Sucesso:</span>
                     <span className="text-slate-300">Contabiliza apenas os status:</span>
                     <ul className="mt-1.5 ml-4 space-y-1 list-disc text-slate-200">
                       <li><strong>Finalizado</strong></li>
                       <li><strong>Encaminhado Amb</strong></li>
                       <li><strong>Retorno ao PA</strong></li>
                     </ul>
                   </div>
                </div>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button 
                  onClick={() => setTipoGraficoMensal('todos')} 
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${tipoGraficoMensal === 'todos' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setTipoGraficoMensal('sucesso')} 
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${tipoGraficoMensal === 'sucesso' ? 'bg-white dark:bg-slate-700 shadow-sm text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  Sucesso
                </button>
              </div>
            </div>
          </div>

          <div className="h-[300px] md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {/* MARGEM ADICIONADA: resolve o problema da barra mais alta cortando o número */}
              <ComposedChart data={stats.mensal} margin={{ top: 25, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                
                {/* TOOLTIP CUSTOMIZADO COM CORREÇÃO DE TS E ORDENAÇÃO */}
                <RechartsTooltip 
                  cursor={{fill: isDark ? '#1e293b' : '#f8fafc', opacity: 0.4}} 
                  contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderRadius: '12px', border: 'none' }} 
                  itemSorter={(item) => item.dataKey === 'perdidos' ? 1 : -1}
                  formatter={(value: any, name: any) => [value, name === 'todos' ? 'Todos' : name === 'sucesso' ? 'Sucesso' : 'Perdidos']}
                />
                
                <Bar 
                  dataKey={tipoGraficoMensal} 
                  fill={tipoGraficoMensal === 'todos' ? '#3b82f6' : '#10b981'} 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                  onClick={handleBarClick} 
                  cursor="pointer"
                >
                  <LabelList dataKey={tipoGraficoMensal} position="top" style={{ fill: isDark ? '#cbd5e1' : '#1e293b', fontSize: '12px', fontWeight: '900' }} />
                </Bar>

                {tipoGraficoMensal === 'todos' && (
                  <Line 
                    type="monotone" 
                    dataKey="perdidos" 
                    stroke={isDark ? '#ff3333' : '#ef4444'} 
                    strokeWidth={isDark ? 4 : 3} 
                    dot={{ r: 5, strokeWidth: 2, fill: isDark ? '#ff3333' : '#ef4444' }} 
                    activeDot={{ r: 7 }}
                    isAnimationActive={false}
                  >
                    <LabelList 
                      dataKey="labelPerdidos" 
                      position="top" 
                      offset={12} 
                      style={{ fill: isDark ? '#ff3333' : '#ef4444', fontSize: '12px', fontWeight: '900' }} 
                    />
                  </Line>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 md:p-6 flex flex-col h-[450px]">
          <Title className="!text-lg !mb-2 text-gray-700 dark:text-slate-200">Status Detalhados</Title>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={stats.porStatus} 
                  cx="50%" 
                  cy="45%" 
                  innerRadius={65} 
                  outerRadius={90} 
                  paddingAngle={5} 
                  dataKey="value" 
                  stroke="none"
                >
                  {stats.porStatus.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderRadius: '12px', border: isDark ? '1px solid #1e293b' : 'none' }} 
                  itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 'bold' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" content={renderCustomLegend} wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 dark:bg-black/90 z-[70] flex items-center justify-center p-2 md:p-4 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-transparent dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-t-2xl px-4 md:px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <Title className="!text-base md:!text-lg !mb-0 text-gray-800 dark:text-slate-100">{modalTitle}</Title>
                <Description className="!text-[10px] md:!text-xs !mt-0 !mb-0">{modalData.length} registros</Description>
              </div>
              <div className="flex gap-2">
                <Button variant="success" size="sm" onClick={exportToExcel} className="hidden sm:flex">Excel</Button>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}><X size={20} /></Button>
              </div>
            </div>

            <div className="p-0 overflow-auto flex-1 bg-white dark:bg-slate-900 rounded-b-2xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10">
                  <tr className="text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800">
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Paciente</th>
                    <th className="px-4 py-3 hidden sm:table-cell">CRM</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
                  {modalData.map(item => (
                    <tr key={item.id} className="text-xs md:text-sm hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium dark:text-slate-300">
                        {item.data_agendamento ? format(parseISO(item.data_agendamento), 'dd/MM') : '-'}
                        <span className="ml-2 text-[10px] text-gray-400">{item.hora_agendamento}</span>
                      </td>
                      <td className="px-4 py-3 font-bold dark:text-slate-200 truncate max-w-[120px] md:max-w-none">{item.nome_paciente}</td>
                      <td className="px-4 py-3 hidden sm:table-cell dark:text-slate-400">{item.crm_responsavel || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="font-black uppercase text-[9px] md:text-[10px] px-2 py-0.5 rounded-md" style={{ backgroundColor: `${CONFIG_STATUS[item.status_id]?.color}15`, color: CONFIG_STATUS[item.status_id]?.color }}>
                          {CONFIG_STATUS[item.status_id]?.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
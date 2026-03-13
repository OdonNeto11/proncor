import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from "../../../lib/supabase"; 
import { useTheme } from '../../../contexts/ThemeContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList,
  PieChart, Pie, Cell, Legend
} from 'recharts';

// COMPONENTES NORMALIZADOS
import { Card } from '../../../components/ui/Card';
import { Title, Description } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';

import { Download, X, Filter, Calendar as CalendarIcon, User, Activity, ChevronRight, Home } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';

const CONFIG_STATUS: Record<number, { label: string, color: string }> = {
  1: { label: 'Agendado', color: '#3b82f6' },
  2: { label: 'Reagendado', color: '#f59e0b' },
  3: { label: 'Cancelado', color: '#ef4444' },
  4: { label: 'Não Atende', color: '#6b7280' },
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<any[]>([]);
  const [rawAgendamentos, setRawAgendamentos] = useState<any[]>([]);

  const [stats, setStats] = useState({
    totalGeral: 0, sucesso: 0, filaAgendados: 0, agendadosCount: 0,
    reagendadosCount: 0, semConversao: 0, mensal: [] as any[], porStatus: [] as any[]
  });

  useEffect(() => {
    fetchStats();
  }, [dataInicio, dataFim, statusFiltro, crmFiltro]);

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
        ultimos6Meses.push({ num: d.getMonth(), name: mesesNomes[d.getMonth()], year: d.getFullYear(), total: 0 });
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
          if (item.data_agendamento) {
            const [y, m, d] = item.data_agendamento.split('-').map(Number);
            const dataAg = new Date(y, m - 1, d);
            const mesRef = ultimos6Meses.find(mRef => mRef.num === dataAg.getMonth() && mRef.year === dataAg.getFullYear());
            if (mesRef) mesRef.total++;
          }
        } else if (agrupamento === 'pendente') {
          countFila++;
          if (statusId === 1) countAgendados++;
          if (statusId === 2) countReagendados++;
        } else if (statusId === 4) {
          countSemConversao++;
        }
        
        if (!statusMap[statusId]) statusMap[statusId] = { nome: item.status.nome, count: 0 };
        statusMap[statusId].count++;
      });

      const statusFormatted = Object.keys(statusMap).map(key => {
        const idNum = parseInt(key);
        return {
          name: CONFIG_STATUS[idNum]?.label || statusMap[idNum].nome.toUpperCase().replace('_', ' '),
          value: statusMap[idNum].count,
          color: CONFIG_STATUS[idNum]?.color || '#94a3b8' 
        };
      }).sort((a, b) => b.value - a.value);

      setStats({ totalGeral: countTotalGeral, sucesso: countSucesso, filaAgendados: countFila, agendadosCount: countAgendados, reagendadosCount: countReagendados, semConversao: countSemConversao, mensal: ultimos6Meses, porStatus: statusFormatted });
    } catch (err) { console.error('Erro ao buscar KPIs:', err); }
  }

  const openModal = (title: string, filtroFn: (item: any) => boolean) => {
    setModalTitle(title); setModalData(rawAgendamentos.filter(filtroFn)); setIsModalOpen(true);
  };

  const exportToExcel = () => {
    const dataToExport = modalData.map(item => ({
      'Data': item.data_agendamento ? format(parseISO(item.data_agendamento), 'dd/MM/yyyy') : '-',
      'Hora': item.hora_agendamento || '-', 'Nº Atendimento': item.numero_atendimento || '-',
      'Paciente': item.nome_paciente || '-', 'CRM': item.crm_responsavel || '-',
      'Status': CONFIG_STATUS[item.status_id]?.label?.toUpperCase() || 'DESCONHECIDO'
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Agendamentos");
    XLSX.writeFile(workbook, `Relatorio_${modalTitle.replace(/\s+/g, '_')}.xlsx`);
  };

  const renderCustomLegend = () => (
    <ul className="flex flex-col gap-2 m-0 p-0 list-none text-[11px] font-medium text-slate-600 dark:text-slate-400">
      {stats.porStatus.map((entry, index) => (
        <li key={`legend-${index}`} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="truncate">{entry.name}</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 ml-auto pl-2">{entry.value}</span>
        </li>
      ))}
    </ul>
  );

  const totalDesfechos = stats.totalGeral - stats.filaAgendados;
  const taxaConversao = totalDesfechos > 0 ? ((stats.sucesso / totalDesfechos) * 100).toFixed(1) : '0.0';
  const taxaSemRetorno = totalDesfechos > 0 ? ((stats.semConversao / totalDesfechos) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
        
        {/* NAVEGAÇÃO BREADCRUMB */}
        <nav className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 font-medium mb-5">
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors">
            <Home size={14} />
            <span>Home</span>
          </Link>
          <ChevronRight size={14} className="text-slate-400 dark:text-slate-600" />
          
          <Link 
            to="/admin" 
            state={{ reset: Date.now() }} 
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Administração
          </Link>
          
          <ChevronRight size={14} className="text-slate-400 dark:text-slate-600" />
          <button 
            onClick={onBack} 
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
          >
            Dashboards
          </button>
          <ChevronRight size={14} className="text-slate-400 dark:text-slate-600" />
          <span className="text-slate-800 dark:text-slate-200 font-bold">Dash PA</span>
        </nav>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="flex items-center gap-3">
            <Activity className="text-blue-600 dark:text-blue-500" size={32} />
            <Title className="!text-3xl !mb-0 text-gray-800 dark:text-white">Painel do Pronto Atendimento</Title>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 pt-4 border-t border-gray-50 dark:border-slate-800/50">
          <div className="flex items-center gap-2 lg:w-1/3">
            <div className="relative flex-1">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none z-10" size={16} />
                <DatePicker selected={dataInicio} onChange={setDataInicio} isClearable locale="pt-BR" dateFormat="dd/MM/yyyy" placeholderText="Início" className="custom-datepicker-input !h-10 !text-sm !pl-10 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-colors" onFocus={(e) => e.target.blur()} />
            </div>
            <span className="text-gray-400 dark:text-slate-500 text-sm">até</span>
            <div className="relative flex-1">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none z-10" size={16} />
                <DatePicker selected={dataFim} onChange={setDataFim} isClearable locale="pt-BR" dateFormat="dd/MM/yyyy" placeholderText="Fim" className="custom-datepicker-input !h-10 !text-sm !pl-10 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-colors" onFocus={(e) => e.target.blur()} />
            </div>
          </div>
          
          <div className="relative flex-1 max-w-[200px]">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
              <input type="text" placeholder="Filtrar CRM..." value={crmFiltro} onChange={e => setCrmFiltro(e.target.value.replace(/\D/g, ''))} maxLength={5} className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 transition-colors" />
          </div>

          <div className="relative flex-1 max-w-xs">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
              <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-800 dark:text-slate-200 text-sm focus:outline-none appearance-none h-10 transition-colors">
                  <option value="">Todos os Status</option>
                  {Object.entries(CONFIG_STATUS).map(([id, config]) => (<option key={id} value={id}>{config.label}</option>))}
              </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="h-full" title="Considera todos os registros no período, exceto status Cancelado.">
          <Card className="h-full p-4 border-l-4 border-l-slate-600 dark:border-l-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group flex flex-col justify-center" onClick={() => openModal('Total de Registros', (i) => i.status_id !== 3)}>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase group-hover:text-slate-700 dark:group-hover:text-slate-300 mb-1">Total Registros</p>
            <p className="text-2xl font-black text-gray-800 dark:text-white group-hover:text-slate-900 dark:group-hover:text-gray-100">{stats.totalGeral}</p>
          </Card>
        </div>
        
        <div className="h-full" title="Considera os status: Finalizado, Encaminhado Amb e Retorno ao PA.">
          <Card className="h-full p-4 border-l-4 border-l-green-500 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors group flex flex-col justify-center" onClick={() => openModal('Finalizados', (i) => i.status?.agrupamento === 'sucesso')}>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase group-hover:text-green-600 dark:group-hover:text-green-400 mb-1">Finalizado</p>
            <p className="text-2xl font-black text-gray-800 dark:text-white group-hover:text-green-800 dark:group-hover:text-green-300">{stats.sucesso}</p>
          </Card>
        </div>

        <div className="h-full" title="Considera os status: Agendado e Reagendado.">
          <Card className="h-full p-4 border-l-4 border-l-blue-500 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group flex flex-col justify-between" onClick={() => openModal('Fila', (i) => i.status?.agrupamento === 'pendente')}>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-1">Fila</p>
            <div className="flex flex-col mt-1">
              <p className="text-3xl font-black text-gray-800 dark:text-white group-hover:text-blue-800 dark:group-hover:text-blue-300 leading-none mb-3">{stats.filaAgendados}</p>
              <div className="flex justify-between items-center text-[11px] font-bold text-blue-600/80 dark:text-blue-300/90 bg-blue-50 dark:bg-blue-900/40 px-2 py-1.5 rounded-md w-full transition-colors">
                <span>{stats.agendadosCount} Agendados</span><span className="text-blue-200 dark:text-blue-500/50">|</span><span>{stats.reagendadosCount} Reagendados</span>
              </div>
            </div>
          </Card>
        </div>
        
        <div className="h-full" title="Cálculo: (Finalizados / (Total Registros - Fila)) * 100">
          <Card className="h-full p-4 border-l-4 border-l-indigo-500 flex flex-col justify-center">
            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase mb-1">Taxa Conversão</p>
            <p className="text-2xl font-black text-gray-800 dark:text-white">{taxaConversao}%</p>
          </Card>
        </div>

        <div className="h-full" title="Considera estritamente o status: Não Atende.">
          <Card className="h-full p-4 border-l-4 border-l-red-500 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group flex flex-col justify-center" onClick={() => openModal('Sem Contato', (i) => i.status_id === 4)}>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase group-hover:text-red-600 dark:group-hover:text-red-400 mb-1">Sem Contato</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-2xl font-black text-gray-800 dark:text-white group-hover:text-red-800 dark:group-hover:text-red-300">{stats.semConversao}</p><span className="text-xl font-light text-gray-300 dark:text-slate-600">|</span><p className="text-2xl font-black text-gray-800 dark:text-white group-hover:text-red-800 dark:group-hover:text-red-300">{taxaSemRetorno}%</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <Title className="!text-lg !mb-6 text-gray-700 dark:text-slate-200">Evolução de Sucessos</Title>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.mensal}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f0f0f0'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <RechartsTooltip 
                  cursor={{fill: isDark ? '#1e293b' : '#f8fafc'}} 
                  contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0', color: isDark ? '#f8fafc' : '#0f172a' }} 
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={45}>
                  <LabelList dataKey="total" position="top" style={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: '12px', fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <Title className="!text-lg !mb-6 text-gray-700 dark:text-slate-200">Status Detalhados</Title>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.porStatus} cx="40%" cy="50%" outerRadius={100} dataKey="value" labelLine={false} label={false}>
                  {stats.porStatus.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke={isDark ? '#0f172a' : '#fff'} strokeWidth={2} />))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0', color: isDark ? '#f8fafc' : '#0f172a' }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" content={renderCustomLegend} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm transition-colors">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-t-2xl px-6 py-4 border-b border-gray-200 dark:border-slate-700/50 flex justify-between items-center transition-colors">
              <div>
                <Title className="!text-lg !mb-0 text-gray-800 dark:text-slate-100">{modalTitle}</Title>
                <Description className="!text-xs !font-medium !mt-0 !mb-0">{modalData.length} registros encontrados</Description>
              </div>
              <div className="flex gap-2">
                <Button variant="success" size="sm" onClick={exportToExcel} className="!py-2">
                    <Download size={16} /> Exportar Excel
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                  <X size={20} />
                </Button>
              </div>
            </div>

            <div className="p-0 overflow-auto flex-1 bg-white dark:bg-slate-900 rounded-b-2xl transition-colors">
              {modalData.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-slate-500 font-medium">Nenhum dado para este filtro.</div>
              ) : (
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 shadow-sm transition-colors">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data/Hora</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nº Atend.</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CRM</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Paciente</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
                    {modalData.map(item => (
                      <tr key={item.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="text-sm font-semibold text-gray-800 dark:text-slate-200">{item.data_agendamento ? format(parseISO(item.data_agendamento), 'dd/MM/yyyy') : '-'}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">{item.hora_agendamento || '-'}</div>
                        </td>
                        <td className="px-6 py-3 text-sm font-mono text-gray-600 dark:text-slate-400">{item.numero_atendimento || '-'}</td>
                        <td className="px-6 py-3 text-sm font-bold text-gray-700 dark:text-slate-300">{item.crm_responsavel || '-'}</td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-800 dark:text-slate-200">{item.nome_paciente}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border`} style={{ backgroundColor: `${CONFIG_STATUS[item.status_id]?.color}15`, color: CONFIG_STATUS[item.status_id]?.color, borderColor: `${CONFIG_STATUS[item.status_id]?.color}40`}}>
                            {CONFIG_STATUS[item.status_id]?.label || 'DESCONHECIDO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
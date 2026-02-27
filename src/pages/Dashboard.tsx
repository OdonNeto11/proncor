import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Card } from '../components/ui/Card';
import { LayoutDashboard, Download, X, Filter, Calendar as CalendarIcon, User } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';

registerLocale('pt-BR', ptBR);

const CONFIG_STATUS: Record<number, { label: string, color: string }> = {
  1: { label: 'Agendado', color: '#3b82f6' },
  2: { label: 'Reagendado', color: '#f59e0b' },
  3: { label: 'Cancelado', color: '#ef4444' },
  4: { label: 'Não Atende', color: '#6b7280' },
  5: { label: 'Finalizado', color: '#10b981' },
  6: { label: 'Encaminhado Amb', color: '#8b5cf6' },
  7: { label: 'Retorno ao PA', color: '#6366f1' }
};

export function Dashboard() {
  const { permissoes, loading: authLoading } = useAuth();
  
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<string>('');
  const [crmFiltro, setCrmFiltro] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<any[]>([]);
  const [rawAgendamentos, setRawAgendamentos] = useState<any[]>([]);

  const [stats, setStats] = useState({
    totalGeral: 0,
    sucesso: 0,
    filaAgendados: 0,
    agendadosCount: 0,
    reagendadosCount: 0,
    semConversao: 0,
    mensal: [] as any[],
    porStatus: [] as any[]
  });

  useEffect(() => {
    if (!authLoading && permissoes.includes('acessar_dashboard')) {
      fetchStats();
    }
  }, [authLoading, permissoes, dataInicio, dataFim, statusFiltro, crmFiltro]);

  async function fetchStats() {
    try {
      let query = supabase
        .from('agendamentos')
        .select(`
          id,
          data_agendamento,
          hora_agendamento,
          nome_paciente,
          numero_atendimento,
          crm_responsavel,
          status_id,
          status:status_id (
            nome,
            agrupamento
          )
        `);

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

      let countTotalGeral = 0;
      let countFila = 0;
      let countAgendados = 0;
      let countReagendados = 0;
      let countSucesso = 0;
      let countSemConversao = 0;
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
        
        if (!statusMap[statusId]) {
            statusMap[statusId] = { nome: item.status.nome, count: 0 };
        }
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

  const openModal = (title: string, filtroFn: (item: any) => boolean) => {
    setModalTitle(title);
    setModalData(rawAgendamentos.filter(filtroFn));
    setIsModalOpen(true);
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

  const renderCustomLegend = () => {
    return (
      <ul className="flex flex-col gap-2 m-0 p-0 list-none text-[11px] font-medium text-slate-600">
        {stats.porStatus.map((entry, index) => (
          <li key={`legend-${index}`} className="flex items-center gap-2">
            <span 
              className="w-2.5 h-2.5 rounded-full shrink-0" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="truncate">{entry.name}</span>
            <span className="font-bold text-slate-800 ml-auto pl-2">{entry.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  if (authLoading) return null;
  if (!permissoes.includes('acessar_dashboard')) return <Navigate to="/" replace />;

  const totalDesfechos = stats.totalGeral - stats.filaAgendados;
  const taxaConversao = totalDesfechos > 0 ? ((stats.sucesso / totalDesfechos) * 100).toFixed(1) : '0.0';
  const taxaSemRetorno = totalDesfechos > 0 ? ((stats.semConversao / totalDesfechos) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-blue-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-800">Painel de Produtividade</h1>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-2 lg:w-1/3">
            <div className="relative flex-1">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={16} />
                <DatePicker 
                    selected={dataInicio} 
                    onChange={(date: Date | null) => setDataInicio(date)} 
                    isClearable
                    locale="pt-BR" 
                    dateFormat="dd/MM/yyyy" 
                    placeholderText="Início" 
                    className="custom-datepicker-input !h-10 !text-sm !pl-10" 
                    onFocus={(e) => e.target.blur()} 
                />
            </div>
            <span className="text-gray-400 text-sm">até</span>
            <div className="relative flex-1">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={16} />
                <DatePicker 
                    selected={dataFim} 
                    onChange={(date: Date | null) => setDataFim(date)} 
                    isClearable
                    locale="pt-BR" 
                    dateFormat="dd/MM/yyyy" 
                    placeholderText="Fim" 
                    className="custom-datepicker-input !h-10 !text-sm !pl-10" 
                    onFocus={(e) => e.target.blur()} 
                />
            </div>
          </div>
          
          <div className="relative flex-1 max-w-[200px]">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                  type="text" 
                  placeholder="Filtrar CRM..." 
                  value={crmFiltro} 
                  onChange={e => setCrmFiltro(e.target.value.replace(/\D/g, ''))}
                  maxLength={5}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-10 transition-all"
              />
          </div>

          <div className="relative flex-1 max-w-xs">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none appearance-none bg-white h-10">
                  <option value="">Todos os Status</option>
                  {Object.entries(CONFIG_STATUS).map(([id, config]) => (
                    <option key={id} value={id}>{config.label}</option>
                  ))}
              </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="h-full" title="Considera todos os registros no período, exceto status Cancelado.">
          <Card 
            className="h-full p-4 border-l-4 border-l-slate-600 cursor-pointer hover:bg-slate-50 hover:shadow-md transition-all group flex flex-col justify-center"
            onClick={() => openModal('Total de Registros (Exclui Cancelados)', (i) => i.status_id !== 3)}
          >
            <p className="text-[10px] text-gray-500 font-bold uppercase group-hover:text-slate-700 mb-1">Total Registros</p>
            <p className="text-2xl font-black text-gray-800 group-hover:text-slate-900">{stats.totalGeral}</p>
          </Card>
        </div>
        
        <div className="h-full" title="Considera os status: Finalizado, Encaminhado Amb e Retorno ao PA.">
          <Card 
            className="h-full p-4 border-l-4 border-l-green-500 cursor-pointer hover:bg-green-50 hover:shadow-md transition-all group flex flex-col justify-center"
            onClick={() => openModal('Agendamentos Finalizados', (i) => i.status?.agrupamento === 'sucesso')}
          >
            <p className="text-[10px] text-gray-500 font-bold uppercase group-hover:text-green-600 mb-1">Finalizado</p>
            <p className="text-2xl font-black text-gray-800 group-hover:text-green-800">{stats.sucesso}</p>
          </Card>
        </div>

        <div className="h-full" title="Considera os status: Agendado e Reagendado.">
          <Card 
            className="h-full p-4 border-l-4 border-l-blue-500 cursor-pointer hover:bg-blue-50 hover:shadow-md transition-all group flex flex-col justify-between"
            onClick={() => openModal('Fila de Pendentes', (i) => i.status?.agrupamento === 'pendente')}
          >
            <p className="text-[10px] text-gray-500 font-bold uppercase group-hover:text-blue-600 mb-1">Fila</p>
            <div className="flex flex-col mt-1">
              <p className="text-3xl font-black text-gray-800 group-hover:text-blue-800 leading-none mb-3">{stats.filaAgendados}</p>
              <div className="flex justify-between items-center text-[11px] font-bold text-blue-600/80 bg-blue-50 px-2 py-1.5 rounded-md w-full">
                <span>{stats.agendadosCount} Agendados</span>
                <span className="text-blue-200">|</span>
                <span>{stats.reagendadosCount} Reagendados</span>
              </div>
            </div>
          </Card>
        </div>
        
        <div className="h-full" title="Cálculo: (Finalizados / (Total Registros - Fila)) * 100">
          <Card 
            className="h-full p-4 border-l-4 border-l-indigo-500 flex flex-col justify-center"
          >
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Taxa Conversão</p>
            <p className="text-2xl font-black text-gray-800">{taxaConversao}%</p>
          </Card>
        </div>

        <div className="h-full" title="Considera estritamente o status: Não Atende.">
          <Card 
            className="h-full p-4 border-l-4 border-l-red-500 cursor-pointer hover:bg-red-50 hover:shadow-md transition-all group flex flex-col justify-center"
            onClick={() => openModal('Sem Contato (Não Atende)', (i) => i.status_id === 4)}
          >
            <p className="text-[10px] text-gray-500 font-bold uppercase group-hover:text-red-600 mb-1">Sem Contato</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-2xl font-black text-gray-800 group-hover:text-red-800">{stats.semConversao}</p>
              <span className="text-xl font-light text-gray-300">|</span>
              <p className="text-2xl font-black text-gray-800 group-hover:text-red-800">{taxaSemRetorno}%</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6 shadow-sm bg-white border border-gray-100">
          <h3 className="text-lg font-bold text-gray-700 mb-6">Evolução de Sucessos</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.mensal}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={45}>
                  <LabelList dataKey="total" position="top" style={{ fill: '#64748b', fontSize: '12px', fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 shadow-sm bg-white border border-gray-100">
          <h3 className="text-lg font-bold text-gray-700 mb-6">Status Detalhados</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                    data={stats.porStatus} 
                    cx="40%" 
                    cy="50%" 
                    outerRadius={100} 
                    dataKey="value" 
                    labelLine={false}
                    label={false}
                >
                  {stats.porStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    content={renderCustomLegend} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-gray-50 rounded-t-2xl px-6 py-4 border-b flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{modalTitle}</h3>
                <p className="text-xs text-gray-500 font-medium">{modalData.length} registros encontrados</p>
              </div>
              <div className="flex gap-2">
                <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
                    <Download size={16} /> Exportar Excel
                </button>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600 rounded-lg transition-colors">
                    <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-0 overflow-auto flex-1 bg-white rounded-b-2xl">
              {modalData.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium">Nenhum dado para este filtro.</div>
              ) : (
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Data/Hora</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nº Atend.</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">CRM</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Paciente</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {modalData.map(item => (
                      <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="text-sm font-semibold text-gray-800">{item.data_agendamento ? format(parseISO(item.data_agendamento), 'dd/MM/yyyy') : '-'}</div>
                          <div className="text-xs text-gray-500">{item.hora_agendamento || '-'}</div>
                        </td>
                        <td className="px-6 py-3 text-sm font-mono text-gray-600">{item.numero_atendimento || '-'}</td>
                        <td className="px-6 py-3 text-sm font-bold text-gray-700">{item.crm_responsavel || '-'}</td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-800">{item.nome_paciente}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border`} 
                                style={{
                                    backgroundColor: `${CONFIG_STATUS[item.status_id]?.color}15`, 
                                    color: CONFIG_STATUS[item.status_id]?.color,
                                    borderColor: `${CONFIG_STATUS[item.status_id]?.color}40`
                                }}>
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
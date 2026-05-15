import { useState, useMemo } from 'react';
import { addDays } from 'date-fns';
import { Agendamento } from '../types/agendamento';

export function useFiltrosAgenda(agendamentos: Agendamento[]) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('padrao'); 
  
  const [dataInicio, setDataInicio] = useState<Date | null>(new Date()); 
  const [dataFim, setDataFim] = useState<Date | null>(addDays(new Date(), 30)); 

  const agendamentosFiltrados = useMemo(() => {
    return agendamentos.filter(ag => {
      const termo = busca.toLowerCase();
      const matchNome = ag.nome_paciente?.toLowerCase().includes(termo);
      const telefoneLimpoBanco = ag.telefone_paciente?.replace(/\D/g, '') || '';
      const termoLimpoBusca = termo.replace(/\D/g, '');
      const matchTelefone = ag.telefone_paciente?.includes(termo) || (termoLimpoBusca.length > 0 && telefoneLimpoBanco.includes(termoLimpoBusca));
      const matchNumero = ag.numero_atendimento?.toLowerCase().includes(termo);
      const matchCrm = ag.crm_responsavel?.toLowerCase().includes(termo);

      let matchStatus = true;
      const agrupamento = ag.status?.agrupamento?.toLowerCase() || '';
      
      let statusIdNum = Number(ag.status_id);
      if (!statusIdNum || isNaN(statusIdNum) || statusIdNum === 0) {
          statusIdNum = 1;
      }

      if (filtroStatus === 'padrao') {
          matchStatus = agrupamento.includes('pendent') || statusIdNum === 1 || statusIdNum === 2; 
      } 
      else if (filtroStatus === 'todos_ativos') {
          matchStatus = statusIdNum !== 3; 
      } 
      else if (filtroStatus !== '') {
          matchStatus = statusIdNum === Number(filtroStatus);
      }

      return (matchNome || matchTelefone || matchNumero || matchCrm) && matchStatus;
    });
  }, [agendamentos, busca, filtroStatus]);

  const grupos = useMemo(() => {
    return agendamentosFiltrados.reduce((acc, curr) => {
      (acc[curr.data_agendamento] = acc[curr.data_agendamento] || []).push(curr); 
      return acc;
    }, {} as Record<string, Agendamento[]>);
  }, [agendamentosFiltrados]);

  const limparFiltros = () => {
    setDataInicio(new Date()); 
    setDataFim(addDays(new Date(), 30));
    setFiltroStatus('padrao');
    setBusca('');
  };

  return {
    filtros: {
      busca,
      setBusca,
      filtroStatus,
      setFiltroStatus,
      dataInicio,
      setDataInicio,
      dataFim,
      setDataFim,
    },
    limparFiltros,
    agendamentosFiltrados,
    grupos
  };
}

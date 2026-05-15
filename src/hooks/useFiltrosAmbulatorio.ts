import { useState, useMemo } from 'react';
import { EncaminhamentoAmbulatorio } from '../types/ambulatorio';

export function useFiltrosAmbulatorio(lista: EncaminhamentoAmbulatorio[]) {
  const [busca, setBusca] = useState('');
  const [filtroTab, setFiltroTab] = useState('pendentes');
  const [dataInicio, setDataInicio] = useState<Date | null>(null); 
  const [dataFim, setDataFim] = useState<Date | null>(null);       

  const listaFiltrada = useMemo(() => {
    const termo = busca.toLowerCase();
    if (!termo) return lista;
    
    return lista.filter(item => {
      return (item.nome_paciente || '').toLowerCase().includes(termo) || 
             (item.numero_atendimento || '').includes(termo) ||
             (item.crm_solicitante || '').includes(termo);
    });
  }, [lista, busca]);

  const limparFiltros = () => {
    setDataInicio(null); 
    setDataFim(null);
    setFiltroTab('pendentes');
    setBusca('');
  };

  return {
    filtros: {
      busca,
      setBusca,
      filtroTab,
      setFiltroTab,
      dataInicio,
      setDataInicio,
      dataFim,
      setDataFim,
    },
    limparFiltros,
    listaFiltrada
  };
}

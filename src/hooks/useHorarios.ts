import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { format, isSameDay } from 'date-fns';

export function useHorarios(selectedDate: Date | null) {
  const [todosHorarios, setTodosHorarios] = useState<any[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [isLoadingHorarios, setIsLoadingHorarios] = useState(false);

  // 1. Busca todos os horários ativos do banco uma única vez
  useEffect(() => {
    const fetchConfigHorarios = async () => {
      setIsLoadingHorarios(true);
      const { data, error } = await supabase
        .from('config_horarios')
        .select('horario, tipo_dia')
        .eq('ativo', true)
        .order('horario', { ascending: true });
        
      if (data && !error) {
        setTodosHorarios(data);
      }
      setIsLoadingHorarios(false);
    };
    fetchConfigHorarios();
  }, []);

  // 2. Regra: Filtra Dia de Semana vs Final de Semana sempre que a data mudar
  useEffect(() => {
    if (!selectedDate) {
      setHorariosDisponiveis([]);
      return;
    }
    
    const diaDaSemana = selectedDate.getDay(); 
    // 0 = Domingo, 6 = Sábado
    const isFimDeSemana = diaDaSemana === 0 || diaDaSemana === 6;
    const tipoCorreto = isFimDeSemana ? 'fim_semana' : 'semana';

    const filtrados = todosHorarios
      .filter(h => h.tipo_dia === tipoCorreto)
      .map(h => h.horario.substring(0, 5));

    setHorariosDisponiveis(filtrados);
  }, [selectedDate, todosHorarios]);

  // 3. Regra: Busca os horários que já foram agendados para a data selecionada
  const fetchBookedTimes = useCallback(async () => {
    if (!selectedDate) {
      setBookedTimes([]);
      return;
    }
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('agendamentos')
      .select('hora_agendamento')
      .eq('data_agendamento', dateStr)
      .in('status_id', [1, 2]); // Status 1 (Agendado) e 2 (Reagendado)

    if (data && !error) {
      setBookedTimes(data.map(item => item.hora_agendamento.substring(0, 5)));
    }
  }, [selectedDate]);

  // Dispara a busca de ocupados sempre que a data mudar
  useEffect(() => {
    fetchBookedTimes();
  }, [fetchBookedTimes]);

  // 4. Regra Mestra: Verifica se o botão do horário deve ser desabilitado
  const checkIsDisabled = useCallback((timeStr: string) => {
    if (!selectedDate) return true;
    
    // Regra A: Já está agendado no banco?
    if (bookedTimes.includes(timeStr)) return true;
    
    // Regra B: A data selecionada é hoje e o horário já passou?
    if (isSameDay(selectedDate, new Date())) {
      const [hora, minuto] = timeStr.split(':').map(Number);
      const dataHoraOpcao = new Date(selectedDate);
      dataHoraOpcao.setHours(hora, minuto, 0, 0);
      
      // Se o horário for menor que o momento atual (com 1 minuto de margem)
      if (dataHoraOpcao.getTime() < new Date().getTime() - 60000) {
        return true;
      }
    }
    
    return false;
  }, [selectedDate, bookedTimes]);

  // Função auxiliar para atualizar a tela instantaneamente após um agendamento novo
  const marcarHorarioComoOcupado = (horario: string) => {
    setBookedTimes(prev => [...prev, horario]);
  };

  return {
    horariosDisponiveis,
    checkIsDisabled,
    isLoadingHorarios,
    refreshBookedTimes: fetchBookedTimes,
    marcarHorarioComoOcupado
  };
}
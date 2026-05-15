import { supabase } from '../lib/supabase';
import { Agendamento } from '../types/agendamento';

export const agendamentoService = {
  async fetchAgendamentos(dataInicioStr: string, dataFimStr: string): Promise<Agendamento[]> {
    let query = supabase
      .from('agendamentos')
      .select('*, status:status_id(*)')
      .order('data_agendamento', { ascending: true })
      .order('hora_agendamento', { ascending: true });

    if (dataInicioStr) {
      query = query.gte('data_agendamento', dataInicioStr);
    }
    if (dataFimStr) {
      query = query.lte('data_agendamento', dataFimStr);
    }

    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return data as Agendamento[];
  },

  async createAgendamento(agendamentoData: any) {
    const { error } = await supabase.from('agendamentos').insert([agendamentoData]);
    if (error) throw error;
    return true;
  },

  async uploadAnexo(fileName: string, fileToUpload: File) {
    const { error } = await supabase.storage.from('anexos').upload(fileName, fileToUpload);
    if (error) throw error;
    
    const { data } = supabase.storage.from('anexos').getPublicUrl(fileName);
    return data.publicUrl;
  }
};

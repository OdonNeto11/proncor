import { supabase } from '../lib/supabase';
import { EncaminhamentoAmbulatorio } from '../types/ambulatorio';

export const ambulatorioService = {
  async fetchBibliotecaExames(): Promise<any[]> {
    const { data, error } = await supabase.from('exames_especialidades').select('id, nome, tipo');
    if (error) throw error;
    return data || [];
  },

  async fetchEncaminhamentos(
    statusIds: number[],
    dataInicioStr?: string,
    dataFimStr?: string
  ): Promise<EncaminhamentoAmbulatorio[]> {
    let query = supabase
      .from('encaminhamentos_ambulatorio')
      .select('*, status:status_id(*)')
      .order('created_at', { ascending: false });

    if (statusIds && statusIds.length > 0) {
      query = query.in('status_id', statusIds);
    }

    if (dataInicioStr) {
      query = query.gte('created_at', dataInicioStr + 'T00:00:00');
    }
    if (dataFimStr) {
      query = query.lte('created_at', dataFimStr + 'T23:59:59');
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data as EncaminhamentoAmbulatorio[];
  },

  async updateStatus(id: number, novoStatusId: number): Promise<boolean> {
    const { error } = await supabase
      .from('encaminhamentos_ambulatorio')
      .update({ status_id: novoStatusId, updated_at: new Date().toISOString() })
      .eq('id', id);
      
    if (error) throw error;
    return true;
  },

  async updateEncaminhamento(id: number, data: Partial<EncaminhamentoAmbulatorio>): Promise<boolean> {
    const { error } = await supabase
      .from('encaminhamentos_ambulatorio')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async createEncaminhamento(encaminhamentoData: any): Promise<EncaminhamentoAmbulatorio> {
    const { data, error } = await supabase
      .from('encaminhamentos_ambulatorio')
      .insert([encaminhamentoData])
      .select()
      .single();
      
    if (error) throw error;
    return data as EncaminhamentoAmbulatorio;
  },

  async createEncaminhamentoExames(itens: any[]): Promise<boolean> {
    const { error } = await supabase
      .from('encaminhamento_exames')
      .insert(itens);
      
    if (error) throw error;
    return true;
  },

  async fetchEncaminhamentoExames(encaminhamentoId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('encaminhamento_exames')
      .select('id, nome_customizado, data_agendamento, status_id, exames_especialidades(nome)')
      .eq('encaminhamento_id', encaminhamentoId);

    if (error) throw error;
    return data || [];
  },

  async updateEncaminhamentoExames(updates: {id: number, status_id: number | null, data_agendamento: string | null}[]): Promise<boolean> {
    const promises = updates.map(update => 
      supabase.from('encaminhamento_exames').update({
        status_id: update.status_id,
        data_agendamento: update.data_agendamento
      }).eq('id', update.id)
    );

    const results = await Promise.all(promises);
    const hasDatabaseError = results.some(r => r.error);
    if (hasDatabaseError) throw new Error("Erro ao atualizar registros de exames.");
    
    return true;
  },

  async uploadAnexo(fileName: string, fileToUpload: File): Promise<string> {
    const { error } = await supabase.storage.from('anexos').upload(fileName, fileToUpload);
    if (error) throw error;
    
    return fileName;
  },

  getAnexoUrl(fileName: string): string {
    const { data } = supabase.storage.from('anexos').getPublicUrl(fileName);
    return data.publicUrl;
  }
};

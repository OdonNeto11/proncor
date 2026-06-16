export type Anexo = {
  nome: string;
  url: string;
};

export type StatusItem = {
  id: number;
  nome: string;
  agrupamento: string;
};

export type Agendamento = {
  id: number;
  data_agendamento: string;
  hora_agendamento: string;
  numero_atendimento: string;
  nome_paciente: string;
  telefone_paciente: string;
  diagnostico: string;
  plano_saude?: string;
  procedimentos: string[] | null;
  status_id: number;
  status?: StatusItem;
  anexos: Anexo[] | null;
  medico_id: number | null;
  crm_responsavel?: string;
  usuario_id?: string;
  profiles?: {
    nome: string;
  };
};
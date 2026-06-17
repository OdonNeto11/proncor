import { StatusItem, Anexo } from './agendamento';

export type StatusExame = {
  nome: string;
  status: 'pendente' | 'agendado' | 'realizado' | 'cancelado' | 'nao_atende';
  data_agendada?: string;
  hora_agendada?: string;
  observacao?: string;
};

export type EncaminhamentoAmbulatorio = {
  id: number;
  created_at: string;
  updated_at?: string;
  numero_atendimento?: string;
  nome_paciente: string;
  telefone_paciente: string;
  plano_saude?: string;
  exames_especialidades: string[] | null;
  observacoes?: string;
  status_id: number;
  status?: StatusItem;
  criado_por?: string;
  origem: string;
  crm_solicitante?: string;
  anexos?: Anexo[] | null;
  anexo_url?: string | null;
  status_exames?: Record<string, StatusExame>; // Assuming there might be a JSONB field for this, based on ModalStatusExames
  cpf?: string | null;
  usuario_id?: string;
  profiles?: {
    nome: string;
  };
};
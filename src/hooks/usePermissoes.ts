import { useAuth } from '../contexts/AuthContext';

export function usePermissoes() {
  const { permissoes } = useAuth();
  const tem = (p: string) => permissoes?.includes(p) || false;

  return {
    // --- MÓDULO PA ---
    podeVerPA: tem('pa_visualizar_agendamentos'),
    podeCriarPA: tem('pa_criar_agendamento'),
    podeEditarPA: tem('pa_editar_agendamento'),
    podeAtualizarStatusPA: tem('pa_atualizar_status_agendamento'),
    podeCancelarPA: tem('pa_cancelar_agendamento'),
    podeWhatsAppPA: tem('pa_acionar_whatsapp'),
    podeReagendarPA: tem('pa_reagendar_agendamento'),

    // --- MÓDULO AMBULATÓRIO ---
    podeCriarAmb: tem('amb_criar_encaminhamento'), // <-- ADICIONE ESTA LINHA
    podeVerAmb: tem('amb_visualizar_encaminhamentos'),
    podeGerenciarStatusAmb: tem('amb_gerenciar_status_encaminhamento'),
    podeEditarAmb: tem('amb_editar_encaminhamento'),
    podeCancelarAmb: tem('amb_cancelar_encaminhamento'),

    // --- ADM / GESTÃO ---
    podeAcessarDashboard: tem('adm_acessar_dashboard'),
    podeGerenciarHorarios: tem('adm_gerenciar_horarios'),
  };
}
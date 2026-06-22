export function abrirWhatsAppPesquisa(telefone: string | null | undefined, nome: string, agendamentoId: number | string) {
  // Se não houver telefone cadastrado, aborta a execução silenciosamente
  if (!telefone) return;

  // 1. Remove qualquer caractere que não seja número (espaços, traços, parênteses)
  const numeroLimpo = telefone.replace(/\D/g, '');
  
  // 2. Garante o DDI do Brasil (55) caso o usuário não tenha digitado
  const numeroFinal = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;

  // 3. Pega o domínio raiz onde o sistema está rodando (funciona em localhost e em produção)
  const baseUrl = window.location.origin;
  const linkPesquisa = `${baseUrl}/pesquisa/${agendamentoId}`;

  // 4. Monta a string do WhatsApp (o asterisco * deixa o nome em negrito)
  const mensagem = `Olá, *${nome}*! O seu atendimento no Pronto Atendimento Proncor foi finalizado.\n\nSua opinião é muito importante para melhorarmos continuamente!\n\nPor favor, responda nossa rápida pesquisa de satisfação clicando no link abaixo:\n${linkPesquisa}\n\nAgradecemos a confiança!`;

  // 5. Converte o texto para o padrão seguro de URL (trocando espaços por %20, etc)
  const textoEncoded = encodeURIComponent(mensagem);

  // 6. Dispara a abertura da nova aba do WhatsApp Web/App
  window.open(`https://wa.me/${numeroFinal}?text=${textoEncoded}`, '_blank');
}
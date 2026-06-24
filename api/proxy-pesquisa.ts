// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';

// 1. Defina as duas URLs
const URL_HML = 'http://3.235.136.208:5678/webhook-test/enviar-pesquisa';
const URL_PRD = 'http://3.235.136.208:5678/webhook/enviar-pesquisa';

// 2. Chave de controle: mude para 'false' quando for publicar
const IS_HML = true;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 3. O sistema escolhe a URL automaticamente baseado na chave acima
  const targetUrl = IS_HML ? URL_HML : URL_PRD;

  try {
    // Exemplo de como seu fetch deve ficar, usando a variável targetUrl
    const n8nResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (!n8nResponse.ok) {
      throw new Error(`Erro no n8n: ${n8nResponse.statusText}`);
    }

    return res.status(200).json({ success: true, message: 'Repassado ao n8n com sucesso' });
    
  } catch (error: any) {
    console.error('Erro no Proxy:', error);
    return res.status(500).json({ error: error.message });
  }
}
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Garante que só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Repassa o Payload que chegou do Supabase para o IP do seu n8n
    const n8nResponse = await fetch('http://3.235.136.208:5678/webhook/enviar-pesquisa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
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
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://htadelcgavcaztnmzyor.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YWRlbGNnYXZjYXp0bm16eW9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1MDIxMiwiZXhwIjoyMDg1MDI2MjEyfQ.PDVSqK58Pd8yFShQeW3qsmU9XFh988xHBVqJNiFwrAM'; 

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// IDs mapeados conforme o banco
const ROLE_COORDENADOR = 1;
const SETOR_PA = 1;
const SETOR_AMBULATORIO = 2;

// Lista de Coordenadores
const coordenadores = [
  { nome: 'Neto', crm: '0000', email: 'odonnetocarvalho@gmail.com' },
];

async function importarCoordenadores() {
  console.log(`Iniciando importação de ${coordenadores.length} coordenadores...`);

  for (const usuario of coordenadores) {
    try {
      console.log(`\nProcessando: ${usuario.email}`);

      // 1. Cria o usuário no GoTrue
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: usuario.email,
        password: '123456',
        email_confirm: true 
      });

      if (authError) {
        console.error(`❌ Erro no Auth para ${usuario.email}:`, authError.message);
        continue; 
      }

      const userId = authData.user.id;
      console.log(`✅ Auth criado. UUID: ${userId}`);

      // 2. Insere na tabela public.profiles
      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: userId,
        nome: usuario.nome,
        email: usuario.email,
        crm: usuario.crm,
        is_active: true,
        primeiro_acesso: true
      });

      if (profileError) throw new Error(`Erro Profile: ${profileError.message}`);

      // 3. Insere na tabela public.usuario_alocacoes (PA e Ambulatório)
      const { error: alocacaoError } = await supabaseAdmin.from('usuario_alocacoes').insert([
        { user_id: userId, role_id: ROLE_COORDENADOR, setor_id: SETOR_PA },
        { user_id: userId, role_id: ROLE_COORDENADOR, setor_id: SETOR_AMBULATORIO }
      ]);

      if (alocacaoError) throw new Error(`Erro Alocação: ${alocacaoError.message}`);

      // 4. Insere na tabela public.usuario_setores (PA e Ambulatório)
      const { error: setorError } = await supabaseAdmin.from('usuario_setores').insert([
        { user_id: userId, setor_id: SETOR_PA },
        { user_id: userId, setor_id: SETOR_AMBULATORIO }
      ]);

      if (setorError) throw new Error(`Erro Setor: ${setorError.message}`);

      console.log(`✅ Acessos de Coordenador (PA + Ambulatório) configurados para ${usuario.nome}.`);

    } catch (err) {
      console.error(`❌ Falha na operação para ${usuario.email}:`, err.message);
    }
  }
  console.log('\n🚀 Importação de Coordenadores finalizada!');
}

importarCoordenadores();
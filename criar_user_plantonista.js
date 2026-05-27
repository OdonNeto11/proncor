import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mutabkeqnzpikcxyzzmy.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dGFia2VxbnpwaWtjeHl6em15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTEwMTQ5OSwiZXhwIjoyMDg0Njc3NDk5fQ.jmLBjCOymJACedq5ufBxRNAxUukINEn3OS7XYWnXwQw'; 

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Lista completa (sem a Mariana, que já foi importada)
const plantonistas = [
  { nome: 'Raphael Pinheiro Nunes', crm: '11306', email: 'raphap69@msn.com' },
  { nome: 'Mirian dos Santos Santana', crm: '16068', email: 'msantanamirian@gmail.com' },
  { nome: 'Kamilla Azevedo Domingos', crm: '14714', email: 'kamilladomingos1@gmail.com' },
  { nome: 'Jéssica Feltraco', crm: '13436', email: 'jessifeltraco@gmail.com' },
  { nome: 'Maria Eduarda Curado de Oliveira', crm: '15862', email: 'dedecurado@gmail.com' },
  { nome: 'Jessica Thaynna Resende Figueiredo', crm: '15104', email: 'j.thaynna@hotmail.com' },
  { nome: 'Tiago Munhoz Parma', crm: '13892', email: 'tiago37_mp@hotmail.com' },
  { nome: 'Maria Luiza Congro Rodrigues', crm: '15491', email: 'malucongro@gmail.com' },
  { nome: 'Williany Alves Tumitan Zorzan', crm: '15859', email: 'willianyalves@live.com' },
  { nome: 'Breno evangelista de Sousa', crm: '13138', email: 'Breno.ev12@gmail.com' },
  { nome: 'Ana Vitória de Barros Bernardes', crm: '14023', email: 'anavitoriaabb@hotmail.com' },
  { nome: 'Amanda de Sousa Mendes Ribeiro', crm: '14717', email: 'amanda-mendesdds@hotmail.com' },
  { nome: 'Peribiano Godoi Neto', crm: '15780', email: 'godoiperibiano@gmail.com' },
  { nome: 'Vinicius Suguita Azuma', crm: '14893', email: 'vinicius_azuma@hotmail.com' },
  { nome: 'Gabriel Kojun Yamaki', crm: '11647', email: 'gkyamaki@gmail.com' },
  { nome: 'Gustavo Pereira da Silva Custódio', crm: '15590', email: 'g.uto00933@gmail.com' },
  { nome: 'Larissa Buytendorp Passos', crm: '10796', email: 'laris.b.passos@gmail.com' }
];

async function importarUsuarios() {
  console.log(`Iniciando importação de ${plantonistas.length} usuários...`);

  for (const usuario of plantonistas) {
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
      console.log(`✅ Auth criado no GoTrue. UUID: ${userId}`);

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

      // 3. Insere na tabela public.usuario_alocacoes (Role: 3 = Plantonista, Setor: 1 = PA)
      const { error: alocacaoError } = await supabaseAdmin.from('usuario_alocacoes').insert({
        user_id: userId,
        role_id: 3,
        setor_id: 1
      });

      if (alocacaoError) throw new Error(`Erro Alocação: ${alocacaoError.message}`);

      // 4. Insere na tabela public.usuario_setores (Setor: 1 = PA)
      const { error: setorError } = await supabaseAdmin.from('usuario_setores').insert({
        user_id: userId,
        setor_id: 1
      });

      if (setorError) throw new Error(`Erro Setor: ${setorError.message}`);

      console.log(`✅ Alocações de negócio concluídas para ${usuario.nome}.`);

    } catch (err) {
      console.error(`❌ Falha na consistência dos dados para ${usuario.email}:`, err.message);
    }
  }

  console.log('\n🚀 Importação finalizada!');
}

importarUsuarios();
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mutabkeqnzpikcxyzzmy.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dGFia2VxbnpwaWtjeHl6em15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTEwMTQ5OSwiZXhwIjoyMDg0Njc3NDk5fQ.jmLBjCOymJACedq5ufBxRNAxUukINEn3OS7XYWnXwQw'; 

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// IDs mapeados conforme o seu banco
const ROLE_CHEFE = 2;
const SETOR_PA = 1;
const SETOR_AMBULATORIO = 2;

// Lista de Chefes limpa e formatada
const chefes = [
  { nome: 'Jorge Gomes Da Silva Domingos', crm: '14965', email: 'jorgegomesneto@outlook.com' },
  { nome: 'Letícia Réa Dracxler', crm: '14117', email: 'dracxlerrealeticia@gmail.com' },
  { nome: 'Camila Guenka Scarcelli', crm: '14777', email: 'camilagscarcelli@gmail.com' },
  { nome: 'Camila Freitas Gomes', crm: '12278', email: 'camila.freitasg@hotmail.com' },
  { nome: 'Lucas Chagas Moroni Alvares', crm: '145573', email: 'Lucaschagasmoroni@gmail.com' },
  { nome: 'Otávio Moreli Carneiro Monteiro', crm: '12989', email: 'otaviomcm@gmail.com' },
  { nome: 'Clarissa Silva Cubel', crm: '14720', email: 'cubelclarissa@gmail.com' },
  { nome: 'Nádia Meneguesso Calheiros', crm: '9099', email: 'nadiameneguesso@hotmail.com' },
  { nome: 'Rayhanne Dutra', crm: '14729', email: 'Bernardes416@gmail.com' },
  { nome: 'Rotterdam Pereira Guimarães', crm: '10730', email: 'dr.rotterdamguimaraes@gmail.com' },
  { nome: 'Carlos Magno Neves Guimarães', crm: '8621', email: 'carlosmagnoguimaraes@hotmail.com' },
  { nome: 'Pedro Henrique de Oliveira Lima Miranda', crm: '14476', email: 'dr.pedrohmiranda@gmail.com' },
  { nome: 'Késia Lacerda da SIlva', crm: '8466', email: 'Kesialacerda1@gmail.com' },
  { nome: 'Alexia de Melo Ferreira', crm: '13165', email: 'alexiamelof@gmail.com' },
  { nome: 'Patrick Borges Ribeiro', crm: '12100', email: 'patrick_ribeiro45@hotmail.com' },
  { nome: 'Rafael Laraia Harfuch', crm: '13864', email: 'rafael.harfuch@gmail.com' }
];

async function importarChefes() {
  console.log(`Iniciando importação de ${chefes.length} chefes...`);

  for (const usuario of chefes) {
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

      // 3. Insere na tabela public.usuario_alocacoes (Role: Chefe, Setores: PA e Ambulatório)
      const { error: alocacaoError } = await supabaseAdmin.from('usuario_alocacoes').insert([
        { user_id: userId, role_id: ROLE_CHEFE, setor_id: SETOR_PA },
        { user_id: userId, role_id: ROLE_CHEFE, setor_id: SETOR_AMBULATORIO }
      ]);

      if (alocacaoError) throw new Error(`Erro Alocação: ${alocacaoError.message}`);

      // 4. Insere na tabela public.usuario_setores (PA e Ambulatório)
      const { error: setorError } = await supabaseAdmin.from('usuario_setores').insert([
        { user_id: userId, setor_id: SETOR_PA },
        { user_id: userId, setor_id: SETOR_AMBULATORIO }
      ]);

      if (setorError) throw new Error(`Erro Setor: ${setorError.message}`);

      console.log(`✅ Acessos de Chefe (PA + Ambulatório) configurados para ${usuario.nome}.`);

    } catch (err) {
      console.error(`❌ Falha na operação para ${usuario.email}:`, err.message);
    }
  }
  console.log('\n🚀 Importação de Chefes finalizada!');
}

importarChefes();
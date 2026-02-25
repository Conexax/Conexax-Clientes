import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.server' });
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

const plans = [
  {
    name: 'IRON',
    price_quarterly: 7500.00,
    price_semiannual: 13500.00,
    price_yearly: 24000.00,
    features: [
      'Edição de criativos: Diferente por planos',
      'Segmentação estratégica para campanhas, SMS e e-mail: Diferente por planos',
      'Estruturação da loja virtual',
      'Benchmarking: Diferente por planos',
      'Gestão de mídias sociais: Diferente por planos',
      'Aquisição de mídia paga: Diferente por planos',
      'Consultoria estratégica: Diferente por planos',
      'Suporte e comunicação: Diferente por planos',
      'Relatórios de desempenho: Diferentes por planos'
    ],
    active: true,
    order_index: 1,
    description_quarterly: '10% das vendas realizadas através do tráfego pago',
    description_semiannual: '7.5% das vendas realizadas através do tráfego pago',
    description_yearly: '5% das vendas realizadas através do tráfego pago'
  },
  {
    name: 'GOLD',
    price_quarterly: 12900.00,
    price_semiannual: 19200.00,
    price_yearly: 30000.00,
    features: [
      'Edição de criativos: Diferente por planos',
      'Segmentação estratégica para campanhas, SMS e e-mail: Diferente por planos',
      'Estruturação da loja virtual',
      'Benchmarking: Diferente por planos',
      'Gestão de mídias sociais: Diferente por planos',
      'Aquisição de mídia paga: Diferente por planos',
      'Consultoria estratégica: Diferente por planos',
      'Suporte e comunicação: Diferente por planos',
      'Relatórios de desempenho: Diferentes por planos',
      'Captação de conteúdos',
      'Criação de conteúdo com IA',
      'Cálculo de margem de lucro',
      'Estruturação de ERP'
    ],
    active: true,
    order_index: 2,
    description_quarterly: '10% das vendas realizadas através do tráfego pago',
    description_semiannual: '7.5% das vendas realizadas através do tráfego pago',
    description_yearly: '5% das vendas realizadas através do tráfego pago'
  },
  {
    name: 'CONEXAX X',
    price_quarterly: 18000.00,
    price_semiannual: 33000.00,
    price_yearly: 57600.00,
    features: [
      'Edição de criativos: Diferente por planos',
      'Segmentação estratégica para campanhas, SMS e e-mail: Diferente por planos',
      'Estruturação da loja virtual',
      'Benchmarking: Diferente por planos',
      'Gestão de mídias sociais: Diferente por planos',
      'Aquisição de mídia paga: Diferente por planos',
      'Consultoria estratégica: Diferente por planos',
      'Suporte e comunicação: Diferente por planos',
      'Relatórios de desempenho: Diferentes por planos',
      'Captação de conteúdos',
      'Criação de conteúdo com IA',
      'Cálculo de margem de lucro',
      'Estruturação de ERP',
      'Automação de ERP',
      'Criação de loja virtual'
    ],
    active: true,
    order_index: 3,
    description_quarterly: '7% das vendas realizadas através do tráfego pago',
    description_semiannual: '5% das vendas realizadas através do tráfego pago',
    description_yearly: '3.5% das vendas realizadas através do tráfego pago'
  }
];

async function run() {
  for (const plan of plans) {
    const { data: existing } = await supabaseAdmin.from('plans').select('id').eq('name', plan.name).single();
    if (existing) {
      console.log(`Updating ${plan.name}...`);
      await supabaseAdmin.from('plans').update(plan).eq('id', existing.id);
    } else {
      console.log(`Inserting ${plan.name}...`);
      await supabaseAdmin.from('plans').insert(plan);
    }
  }
  console.log('Done!');
}

run().catch(console.error);

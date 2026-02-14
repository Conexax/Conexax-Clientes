
import dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { getAsaasClient } from './asaas.js';
import { createNotification } from './notificationService.js';

// Load server env
dotenv.config({ path: '.env.server' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[SyncScheduler] Missing Supabase configuration (SUPABASE_URL / KEY).');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function mapOrder(o, tenantId) {
  const rawTotal = o.value_total ?? o.total ?? 0;
  const statusAlias = (typeof o.status === 'string' ? o.status : o.status?.data?.alias || '').toLowerCase();

  const paymentMethod = (() => {
    const method = o.payment_method || o.payments?.data?.[0]?.payment_method_id || o.payments?.data?.[0]?.payment_method_alias || 'unknown';
    const m = String(method).toLowerCase();
    if (m.includes('pix')) return 'PIX';
    if (m.includes('card') || m.includes('credit')) return 'Cartão';
    if (m.includes('billet') || m.includes('boleto')) return 'Boleto';
    return 'Cartão';
  })();

  return {
    tenant_id: tenantId,
    external_id: o.id?.toString?.() || String(o.id || o.number || ''),
    client_name: `${o.customer?.data?.first_name || 'Cliente'} ${o.customer?.data?.last_name || ''}`.trim(),
    client_email: o.customer?.data?.email || '',
    product_name: o.items?.data?.[0]?.product_name || o.items?.data?.[0]?.name || 'Produto',
    order_date: o.created_at?.date || o.created_at || new Date().toISOString(),
    status: (statusAlias === 'paid' || statusAlias === 'shipping' || statusAlias === 'delivered' || statusAlias === 'approved') ? 'APROVADO' : 'AGUARDANDO',
    payment_method: paymentMethod,
    total_value: Number(rawTotal) || 0,
    coupon_code: o.promocode?.data?.code || o.promotions?.data?.[0]?.code || null
  };
}

function mapAbandoned(a, tenantId) {
  const rawTotal = a.value_total ?? a.total ?? 0;
  return {
    tenant_id: tenantId,
    external_id: a.id?.toString?.() || String(a.id || ''),
    client_name: `${a.customer?.data?.first_name || 'Interessado'} ${a.customer?.data?.last_name || ''}`.trim(),
    email: a.customer?.data?.email || '',
    phone: a.customer?.data?.phone || '',
    product_name: a.items?.data?.[0]?.product_name || a.items?.data?.[0]?.name || 'Carrinho Abandonado',
    value: Number(rawTotal) || 0,
    date: a.created_at?.date || a.created_at || new Date().toISOString(),
    items: a.items?.data?.map(i => i.product_name || i.name).join(', ') || 'Carrinho sem itens',
    recovered: false
  };
}

import { YampiSyncService } from './yampiSync.js';

async function syncTenant(tenant) {

  try {
    await YampiSyncService.syncOrders(tenant);
  } catch (err) {
    console.error(`[SyncScheduler] Error syncing ${tenant.yampi_alias || tenant.id}:`, err.message);
  }
}


async function syncAllTenants() {
  console.log('[SyncScheduler] Starting global sync...');
  const { data: tenants, error } = await supabase.from('tenants').select('*');

  if (error) {
    console.error('[SyncScheduler] Failed to fetch tenants:', error.message);
    return;
  }

  for (const tenant of (tenants || [])) {
    await syncTenant(tenant);
  }
  console.log('[SyncScheduler] Global sync finished.');
}


async function checkExpiringPlans() {
  console.log('[SyncScheduler] Checking expiring plans...');
  const now = new Date();

  // 1. Expire Plans
  const { data: expired } = await supabase.from('subscriptions')
    .select('*, users(id, tenant_id)')
    .eq('status', 'active')
    .lt('end_date', now.toISOString());

  for (const sub of (expired || [])) {
    console.log(`[SyncScheduler] Expiring subscription ${sub.id}`);

    // Update Status
    await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id);

    // Update Tenant
    // Handle the fact that users is an object/array returned by join
    const tenantId = Array.isArray(sub.users) ? sub.users[0]?.tenant_id : sub.users?.tenant_id;

    if (tenantId) {
      await supabase.from('tenants').update({ subscription_status: 'expired', status: 'frozen' }).eq('id', tenantId);
    }

    // Cancel Asaas if monthly
    if (sub.billing_type === 'monthly' && sub.asaas_subscription_id) {
      try {
        const { client } = await getAsaasClient();
        await client.delete(`/subscriptions/${sub.asaas_subscription_id}`);
        console.log(`[SyncScheduler] Canceled Asaas subscription ${sub.asaas_subscription_id}`);
      } catch (e) {
        console.warn(`[SyncScheduler] Failed to cancel Asaas sub ${sub.asaas_subscription_id}`, e.message);
      }
    }

    // Notify
    await createNotification(sub.user_id, 'error', 'Plano Expirado', 'Seu plano acabou de expirar. Renove para continuar acessando o sistema.', { label: 'Renovar', link: '/planos' });
  }

  // 2. Warn Expiring (7, 3, 1 days)
  const daysToCheck = [7, 3, 1];
  for (const days of daysToCheck) {
    const targetDateStart = new Date();
    targetDateStart.setDate(targetDateStart.getDate() + days);
    targetDateStart.setHours(0, 0, 0, 0);

    const targetDateEnd = new Date(targetDateStart);
    targetDateEnd.setHours(23, 59, 59, 999);

    const { data: expiring } = await supabase.from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .gte('end_date', targetDateStart.toISOString())
      .lte('end_date', targetDateEnd.toISOString());

    for (const sub of (expiring || [])) {
      // Idempotency: Check if notification already sent today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count } = await supabase.from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', sub.user_id)
        .eq('title', 'Renovação Próxima')
        .gte('created_at', todayStart.toISOString());

      if (!count) {
        await createNotification(sub.user_id, 'warning', 'Renovação Próxima', `Seu plano expira em ${days} dia(s). Renove agora para evitar interrupções.`, { label: 'Ver Planos', link: '/planos' });
      }
    }
  }
}

export function startSyncJob(intervalMinutes = 10) {
  // Run immediately
  syncAllTenants();
  checkExpiringPlans();

  // Schedule Sync
  const intervalMs = intervalMinutes * 60 * 1000;
  setInterval(() => {
    syncAllTenants();
  }, intervalMs);

  // Schedule Expiration Check (Hourly)
  setInterval(() => {
    checkExpiringPlans();
  }, 60 * 60 * 1000);

  console.log(`[SyncScheduler] Scheduled sync every ${intervalMinutes} min and expiration check hourly.`);
}

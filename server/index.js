import express from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getAsaasClient, getOrCreateAsaasCustomer, createAsaasSubscription } from './services/asaas.service.js';
import { startSyncJob } from './services/syncScheduler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireSubscription } from './middleware/auth.js';
import analyticsRoutes from './routes/analytics.js';
import pushRoutes from './routes/push.js';
import { PushReporter } from './services/pushReporter.js';
import { notifyEvent } from './services/notificationService.js';

// Load server env vars from .env.server if present (local development)
dotenv.config({ path: '.env.server' });

const app = express();
app.use(express.json());

// Mount the analytics API
app.use('/api/analytics', analyticsRoutes);
app.use('/api/push', pushRoutes);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase configuration (SUPABASE_URL / SUPABASE_KEY).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialize Admin Client for server-side operations (bypassing RLS)
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
const supabaseAdmin = SUPABASE_SERVICE_ROLE ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE) : null;








import { YampiSyncService } from './services/yampiSync.js';

// ==========================================
// ADMIN METRICS DASHBOARD
// ==========================================

// GET /api/admin/metrics/overview
app.get('/api/admin/metrics/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const db = supabaseAdmin || supabase;

    // 1. Total Expected (Sum of all fees generated in period)
    const { data: fees } = await db.from('weekly_fees')
      .select('amount_due, status')
      .gte('week_start', startDate)
      .lte('week_end', endDate);

    const totalExpected = fees?.reduce((sum, f) => sum + (Number(f.amount_due) || 0), 0) || 0;
    const totalPaid = fees?.filter(f => f.status === 'paid').reduce((sum, f) => sum + (Number(f.amount_due) || 0), 0) || 0;
    const totalPending = fees?.filter(f => f.status === 'pending' || f.status === 'created').reduce((sum, f) => sum + (Number(f.amount_due) || 0), 0) || 0;
    const totalOverdue = fees?.filter(f => f.status === 'overdue').reduce((sum, f) => sum + (Number(f.amount_due) || 0), 0) || 0;

    // 2. Adimplência (Tenants without overdue fees)
    const { data: activeTenants } = await db.from('tenants').select('id').eq('active', true);
    const totalTenants = activeTenants?.length || 0;

    // Find tenants with ANY overdue fee in history (or just in period? "Adimplência" usually refers to current standing)
    // Let's check current standing (all time)
    const { data: overdueFees } = await db.from('weekly_fees').select('tenant_id').eq('status', 'overdue');
    const overdueTenantIds = new Set(overdueFees?.map(f => f.tenant_id));
    const adimplentes = totalTenants - (overdueTenantIds.size);

    res.json({
      totalExpected,
      totalPaid,
      totalPending,
      totalOverdue,
      adimplentes: adimplentes < 0 ? 0 : adimplentes,
      totalTenants
    });

  } catch (err) {
    console.error('Metrics Overview Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/metrics/tenants
app.get('/api/admin/metrics/tenants', async (req, res) => {
  try {
    const { startDate, endDate, search, status } = req.query;
    const db = supabaseAdmin || supabase;

    // 1. Get all tenants (filtered by search)
    let query = db.from('tenants').select('id, name, owner_email, company_percentage');
    if (search) query = query.ilike('name', `%${search}%`);

    const { data: tenants, error } = await query;
    if (error) throw error;

    // 2. Get fees for the period for these tenants
    const tenantIds = tenants.map(t => t.id);
    const { data: fees } = await db.from('weekly_fees')
      .select('tenant_id, revenue_week, amount_due, status')
      .in('tenant_id', tenantIds)
      .gte('week_start', startDate)
      .lte('week_end', endDate);

    // 3. Aggregate per tenant
    const results = tenants.map(t => {
      const tFees = fees?.filter(f => f.tenant_id === t.id) || [];
      const revenuePeriod = tFees.reduce((sum, f) => sum + (Number(f.revenue_week) || 0), 0);
      const amountDue = tFees.reduce((sum, f) => sum + (Number(f.amount_due) || 0), 0);

      // Determine overall status for the period
      // If any overdue -> overdue
      // If any pending -> pending
      // Else -> paid (or no_activity)
      let finalStatus = 'no_activity';
      if (tFees.length > 0) {
        if (tFees.some(f => f.status === 'overdue')) finalStatus = 'overdue';
        else if (tFees.some(f => f.status === 'pending' || f.status === 'created')) finalStatus = 'pending';
        else if (tFees.every(f => f.status === 'paid')) finalStatus = 'paid';
      }

      // Filter by status query param if present
      if (status && status !== 'ALL' && finalStatus !== status) return null;

      return {
        id: t.id,
        name: t.name,
        email: t.owner_email,
        revenue_period: revenuePeriod,
        percentage: t.company_percentage,
        amount_due: amountDue,
        status: finalStatus
      };
    }).filter(Boolean); // Remove nulls

    res.json(results);

  } catch (err) {
    console.error('Metrics Tenants Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/metricas/yampi/sync', async (req, res) => {
  try {
    const { tenantId } = req.body;
    console.log(`[API] Received sync request. TenantId: ${tenantId || 'ALL'}`);

    const db = supabaseAdmin || supabase;

    let tenantsToSync = [];

    if (tenantId) {
      const { data: tenant, error } = await db.from('tenants').select('*').eq('id', tenantId).single();
      if (error || !tenant) return res.status(404).json({ error: 'Tenant not found.' });
      tenantsToSync = [tenant];
    } else {
      // Sync all active tenants with Yampi credentials
      const { data: tenants, error } = await db.from('tenants').select('*').eq('active', true);
      if (error) throw error;
      tenantsToSync = tenants.filter(t => t.yampi_alias && (t.yampi_token || t.yampi_oauth_access_token));
    }

    const results = [];
    for (const tenant of tenantsToSync) {
      try {
        const orderResult = await YampiSyncService.syncOrders(tenant);
        const productResult = await YampiSyncService.syncProducts(tenant);
        const couponResult = await YampiSyncService.syncCoupons(tenant);
        const abResult = await YampiSyncService.syncAbandonedCheckouts(tenant);
        const domainResult = await YampiSyncService.syncDomains(tenant);
        const influencerResult = await YampiSyncService.syncInfluencers(tenant);
        const commResult = await YampiSyncService.syncCommSettings(tenant);

        results.push({
          tenant: tenant.name,
          success: true,
          orders: orderResult,
          products: productResult,
          coupons: couponResult,
          abandoned: abResult,
          domains: domainResult,
          influencers: influencerResult,
          commSettings: commResult
        });
      } catch (err) {
        console.error(`Failed to sync ${tenant.name}:`, err.message);
        results.push({ tenant: tenant.name, success: false, error: err.message });
      }
    }

    res.json({ success: true, results });

  } catch (err) {
    console.error('[API] Yampi Sync Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// ==========================================
// NEW ASAAS SUBSCRIPTION INTEGRATION
// ==========================================

/**
 * Endpoint to initiate a subscription.
 * POST /api/asaas/subscribe
 */
app.post('/api/asaas/subscribe', async (req, res, next) => {
  try {
    const { planId, billingCycle, billingType, paymentMethod = 'CREDIT_CARD' } = req.body;
    // billingType here refers to 'monthly' vs 'upfront' in our internal logic
    // paymentMethod refers to 'CREDIT_CARD', 'PIX', 'BOLETO'

    const userId = req.headers['x-user-id'] || req.body.userId;

    if (!userId || !planId || !billingCycle || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Dados insuficientes para criar assinatura.' });
    }

    const db = supabaseAdmin || supabase;

    const { data: user, error: userErr } = await db.from('users').select('*, tenants(*)').eq('id', userId).single();
    if (userErr || !user) throw new Error('Usuário não encontrado.');
    const tenant = user.tenants;
    if (!tenant) throw new Error('Tenant não configurado para este usuário.');

    const { data: plan, error: planErr } = await db.from('plans').select('*').eq('id', planId).single();
    if (planErr || !plan) throw new Error('Plano não encontrado.');

    const doc = (tenant.document || '').replace(/\D/g, '');
    if (!doc || doc.length < 11) {
      throw new Error('CPF ou CNPJ inválido. Por favor, atualize em "Dados do Lojista".');
    }

    const asaasCustomerId = await getOrCreateAsaasCustomer({
      email: user.email,
      name: user.name || tenant.name,
      cpfCnpj: doc,
      userId: userId
    });

    // --- IDEMPOTENCY CHECK ---
    // Prevent duplicate charges if user clicks multiple times or retries quickly
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: existingPending } = await db.from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .eq('status', 'pending')
      .eq('billing_cycle', billingCycle)
      .eq('billing_type', billingType)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingPending) {
      console.log('[Idempotency] Found recent pending subscription, reusing:', existingPending.id);

      // Recover URL from Asaas if not saved (or if saved)
      // Ideally we saved it. If not, we might need to fetch it again.
      // For now, let's assume if we have a sub/payment ID we can fetch it.

      let existingUrl = existingPending.checkout_url;

      if (!existingUrl) {
        // Try to recover from Asaas
        try {
          const { client } = await getAsaasClient();
          if (existingPending.asaas_subscription_id) {
            const payRes = await client.get(`/subscriptions/${existingPending.asaas_subscription_id}/payments`);
            if (payRes.data?.data?.[0]) existingUrl = payRes.data.data[0].invoiceUrl;
          } else if (existingPending.asaas_payment_id) {
            // We need to store payment_id for upfront logic
            // If we didn't store it, we might be stuck. But assuming we do:
            // const payRes = await client.get(`/payments/${existingPending.asaas_payment_id}`);
            // existingUrl = payRes.data.invoiceUrl;
          }
        } catch (e) { console.error('Failed to recover url', e); }
      }

      if (existingUrl) {
        return res.json({
          success: true,
          checkoutUrl: existingUrl,
          subscriptionId: existingPending.asaas_subscription_id,
          reused: true
        });
      }
      // If we couldn't recover URL, proceed to create new one (fall through)
    }

    // --- NEW LOGIC FOR FIXED TERM PLANS ---

    // 1. Calculate Duration & Pricing
    let monthsDuration = 1;
    if (billingCycle === 'quarterly') monthsDuration = 3;
    if (billingCycle === 'semiannual') monthsDuration = 6;
    if (billingCycle === 'yearly') monthsDuration = 12;

    const priceMap = {
      'quarterly': plan.price_quarterly,
      'semiannual': plan.price_semiannual,
      'yearly': plan.price_yearly,
      'monthly': plan.price_monthly || plan.price || 0
    };
    const totalCycleValue = priceMap[billingCycle] || 0;

    let checkoutUrl = '';
    let subscriptionId = null; // Can be null if it's a one-off charge
    let paymentId = null;

    if (billingType === 'monthly') {
      // CASE A: Monthly Installments for Fixed Duration (Subscription with End Date)
      // User pays month-by-month, but it ends after N months.

      // Calculate limit date
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + monthsDuration);
      const endDateStr = endDate.toISOString().split('T')[0];

      const monthlyValue = (billingCycle === 'monthly') ? totalCycleValue : (totalCycleValue / monthsDuration);

      const subPayload = {
        customer: asaasCustomerId,
        billingType: paymentMethod, // 'CREDIT_CARD', 'PIX', or 'BOLETO'
        value: monthlyValue,
        nextDueDate: new Date().toISOString().split('T')[0],
        cycle: 'MONTHLY', // Or quarterly/etc? No, fixed term usually implies monthly payments for X months.
        description: `Plano ${plan.name} - Mensal (${monthsDuration} meses)`,
        endDate: endDateStr, // Auto-cancel after this date
        externalReference: userId,
        metadata: { userId, planId, billingCycle, billingType: paymentMethod, isFixedTerm: true }
      };

      console.log('[Asaas] Creating Fixed-Term Subscription:', subPayload);
      const asaasSub = await createAsaasSubscription(subPayload);
      subscriptionId = asaasSub.id;

      // Fetch first payment for Checkout URL
      // Retry logic specifically for Subscription payments
      try {
        const { client } = await getAsaasClient();
        for (let i = 0; i < 5; i++) {
          const payRes = await client.get(`/subscriptions/${asaasSub.id}/payments`);
          if (payRes.data?.data?.length > 0) {
            const pkt = payRes.data.data[0];
            checkoutUrl = pkt.invoiceUrl || pkt.bankSlipUrl;
            paymentId = pkt.id;
            console.log(`[Asaas] Found payment: ${paymentId}, URL: ${checkoutUrl}`);
            if (checkoutUrl) break;
          }
          await new Promise(r => setTimeout(r, 1500));
        }
      } catch (err) {
        console.error('[Asaas] Failed to fetch sub payments:', err.message);
      }

    } else {
      // CASE B: Upfront Payment (One-off Charge)
      // Single charge for the full amount.

      const { client } = await getAsaasClient();

      const paymentPayload = {
        customer: asaasCustomerId,
        billingType: paymentMethod,
        value: totalCycleValue,
        dueDate: new Date().toISOString().split('T')[0],
        description: `Plano ${plan.name} - Completo (${billingCycle})`,
        externalReference: userId,
        metadata: { userId, planId, billingCycle, billingType, isUpfront: true }
      };

      console.log('[Asaas] Creating Upfront Payment:', paymentPayload);
      const payRes = await client.post('/payments', paymentPayload);
      const payment = payRes.data;

      paymentId = payment.id;
      checkoutUrl = payment.invoiceUrl || payment.bankSlipUrl;
    }

    console.log('[Asaas] Final Checkout URL:', checkoutUrl);

    if (!checkoutUrl) {
      throw new Error('Asaas não retornou URL de pagamento (Checkout) tempo hábil.');
    }

    // Save to DB
    const { error: insErr } = await db.from('subscriptions').insert({
      user_id: userId,
      asaas_customer_id: asaasCustomerId,
      asaas_subscription_id: subscriptionId, // Null for upfront
      asaas_payment_id: paymentId, // Null for subscription (usually, but we fetched first payment)
      plan_id: planId,
      status: 'pending',
      billing_cycle: billingCycle,
      billing_type: billingType,
      checkout_url: checkoutUrl, // <--- CRITICAL: Save the link!
      value: (billingType === 'monthly') ? ((billingCycle === 'monthly') ? (plan.priceQuarterly / 3) : (plan.priceQuarterly / 3)) : plan.priceQuarterly // Approximate, strictly we should use the calculated value
      // Note: value above is just a placeholder, better to use what we sent to Asaas
    });

    // Return the URL to the frontend so it can redirect!
    res.json({
      success: true,
      checkoutUrl,
      subscriptionId,
      paymentId
    });

  } catch (err) {
    next(err);
  }
});

// --- COUPONS & INFLUENCERS (BI-DIRECTIONAL YAMPI) ---

/**
 * POST /api/coupons
 * Creates a coupon in Yampi and then in our DB.
 */
app.post('/api/coupons', async (req, res) => {
  try {
    const { tenantId, code, type, value, usageLimit } = req.body;
    const db = supabaseAdmin || supabase;

    const { data: tenant } = await db.from('tenants').select('*').eq('id', tenantId).single();
    if (!tenant) return res.status(404).json({ error: 'Tenant not found.' });

    // 1. Create on Yampi
    try {
      await YampiSyncService.createCoupon(tenant, { code, type, value, usageLimit });
    } catch (yampiErr) {
      console.error('[Coupons] Yampi Create Failed:', yampiErr.message);
      // We'll proceed to save locally if the error is just "already exists" but usually better to stop
      if (!yampiErr.message.includes('already exists')) {
        return res.status(400).json({ error: `Yampi API Error: ${yampiErr.message}` });
      }
    }

    // 2. Save in local DB
    const { data: coupon, error } = await db.from('coupons').upsert({
      tenant_id: tenantId,
      code,
      type,
      value,
      active: true,
      usage_limit: usageLimit || null
    }, { onConflict: 'tenant_id, code' }).select().single();

    if (error) throw error;
    res.json(coupon);
  } catch (err) {
    console.error('[Coupons] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/influencers
 * Creates a coupon in Yampi for the influencer and then records the influencer.
 */
app.post('/api/influencers', async (req, res) => {
  try {
    const { tenantId, name, couponCode, commissionRate } = req.body;
    const db = supabaseAdmin || supabase;

    const { data: tenant } = await db.from('tenants').select('*').eq('id', tenantId).single();
    if (!tenant) return res.status(404).json({ error: 'Tenant not found.' });

    // 1. Create/Ensure Coupon on Yampi
    // We assume the coupon code is unique for this influencer
    let couponId;
    try {
      await YampiSyncService.createCoupon(tenant, { code: couponCode, type: 'percentage', value: 0, usageLimit: 0 });
    } catch (e) { } // Ignore if already exists

    // 2. Map Coupon in our DB
    const { data: coupon } = await db.from('coupons').upsert({
      tenant_id: tenantId,
      code: couponCode,
      type: 'percentage',
      value: 0,
      active: true
    }, { onConflict: 'tenant_id, code' }).select().single();

    couponId = coupon?.id;

    // 3. Create Influencer
    const { data: influencer, error } = await db.from('influencers').upsert({
      tenant_id: tenantId,
      name,
      coupon_id: couponId,
      commission_rate: commissionRate
    }).select().single();

    if (error) throw error;
    res.json(influencer);
  } catch (err) {
    console.error('[Influencers] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/comm-settings
 * Updates automation settings locally and on Yampi.
 */
app.post('/api/comm-settings', async (req, res) => {
  try {
    const { tenantId, triggerId, active, allTriggers } = req.body;
    const db = supabaseAdmin || supabase;

    const { data: tenant } = await db.from('tenants').select('*').eq('id', tenantId).single();
    if (!tenant) return res.status(404).json({ error: 'Tenant not found.' });

    // 1. Update on Yampi
    try {
      await YampiSyncService.updateCommSettings(tenant, triggerId, active);
    } catch (e) {
      console.error('[CommSettings] Yampi Sync Error:', e.message);
    }

    // 2. Save locally
    const { error } = await db.from('comm_settings').upsert({
      tenant_id: tenantId,
      active_triggers: allTriggers,
      updated_at: new Date().toISOString()
    }, { onConflict: 'tenant_id' });

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[CommSettings] Error:', err);
    res.status(500).json({ error: err.message });
  }
});


/**
 * Unified Webhook Handler
 */
app.post('/api/asaas/webhook', async (req, res) => {
  try {
    const { event, payment, subscription } = req.body;
    const paymentId = payment?.id;
    const subscriptionId = subscription?.id || payment?.subscription;
    const externalReference = payment?.externalReference || subscription?.externalReference;

    console.log(`[Webhook] Event: ${event} | paymentId: ${paymentId} | subId: ${subscriptionId}`);

    const db = supabaseAdmin || supabase;

    await db.from('webhook_logs').insert({
      event_id: req.body.id || `evt_${Date.now()}`,
      event_type: event,
      payload: req.body
    });

    if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event)) {
      // Find subscription by ID or Payment ID (for upfront)
      let localSub = null;
      if (subscriptionId) {
        const { data } = await db.from('subscriptions').select('*').eq('asaas_subscription_id', subscriptionId).maybeSingle();
        localSub = data;
      } else if (paymentId) {
        const { data } = await db.from('subscriptions').select('*').eq('asaas_payment_id', paymentId).maybeSingle();
        localSub = data;
      }

      const userId = localSub?.user_id || externalReference;

      if (userId) {
        // Calculate next due date (approximate, +30 days)
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); // Default 30 days active

        // Update Subscription Status
        if (localSub) {
          await db.from('subscriptions').update({
            status: 'active',
            last_payment_date: new Date().toISOString()
            // current_period_end would ideally come from Asaas, but +30 days is a safe fallback
          }).eq('id', localSub.id);
        }

        // Activate Tenant
        const { data: user } = await db.from('users').select('tenant_id').eq('id', userId).single();
        if (user?.tenant_id) {
          await db.from('tenants').update({
            subscription_status: 'active',
            status: 'active',
            plan_id: localSub?.plan_id // Ensure plan is synced
          }).eq('id', user.tenant_id);
        }

        // Log Payment
        await db.from('payments').upsert({
          id: paymentId,
          user_id: userId,
          asaas_subscription_id: subscriptionId,
          // asaas_payment_id: paymentId, // if column exists
          value: payment.value,
          status: 'CONFIRMED',
          billing_type: payment.billingType,
          payment_date: new Date().toISOString()
        });

        // --- Notification Logic ---
        try {
          const { data: tenant } = await db.from('tenants').select('name').eq('id', user.tenant_id).single();
          await notifyEvent('BILL_PAID', {
            tenantName: tenant?.name || 'Desconhecido',
            value: Number(payment.value)
          });
        } catch (e) {
          console.error('[Webhook] Notification error', e);
        }
        // -------------------------
      }
    }

    if (['PAYMENT_OVERDUE', 'SUBSCRIPTION_DELETED', 'PAYMENT_REFUNDED', 'SUBSCRIPTION_DISABLED'].includes(event)) {
      const { data: localSub } = await db.from('subscriptions')
        .select('*')
        .eq('asaas_subscription_id', subscriptionId)
        .maybeSingle();

      if (localSub) {
        await db.from('subscriptions').update({ status: 'overdue' }).eq('id', localSub.id);
        const { data: user } = await db.from('users').select('tenant_id').eq('id', localSub.user_id).single();
        if (user?.tenant_id) {
          await db.from('tenants').update({ subscription_status: 'overdue' }).eq('id', user.tenant_id);
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Asaas Webhook Error]', err);
    return res.status(200).json({ success: false, error: err.message });
  }
});

// Legacy support for admin fetching customers - standardized
app.get('/api/asaas/customers', async (req, res) => {
  try {
    const { offset, limit, name, email } = req.query;
    const params = new URLSearchParams();
    if (offset) params.append('offset', offset);
    if (limit) params.append('limit', limit);
    if (name) params.append('name', name);
    if (email) params.append('email', email);

    const { client } = await getAsaasClient();
    const response = await client.get(`/customers?${params.toString()}`);
    res.send(response.data);
  } catch (err) {
    console.error('Error fetching customers:', err.response?.data || err.message);
    res.status(500).send({ error: 'Failed to fetch customers' });
  }
});


// --- NEW ENDPOINTS MIGRATED FROM EDGE FUNCTIONS ---

// --- WEEKLY VARIABLE BILLING ENDPOINTS ---

// GET /api/weekly-fees
app.get('/api/weekly-fees', async (req, res) => {
  try {
    const tenantId = req.query.tenantId;
    if (!tenantId) return res.status(400).send({ error: 'tenantId required' });

    const { data, error } = await supabase.from('weekly_fees')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('week_start', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// POST /api/admin/weekly-fees/calculate
app.post('/api/admin/weekly-fees/calculate', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    // 1. Fetch Active Tenants
    const { data: tenants } = await supabase.from('tenants').select('*').eq('active', true);
    if (!tenants) return res.status(200).send({ message: 'No active tenants' });

    // 2. Validate & Setup Date Loop
    // Default to last full week if no dates provided
    let currentStart = new Date();
    if (startDate) {
      currentStart = new Date(startDate);
    } else {
      currentStart.setDate(currentStart.getDate() - (currentStart.getDay() || 7) - 6);
    }
    // Snap to Monday
    const day = currentStart.getDay() || 7;
    if (day !== 1) currentStart.setDate(currentStart.getDate() - (day - 1));

    let endLimit = new Date();
    if (endDate) endLimit = new Date(endDate);

    // Ensure we don't calculate future weeks endlessly if user puts a future date
    if (endLimit > new Date()) endLimit = new Date();

    const results = [];

    // Loop week by week
    while (currentStart < endLimit) {
      const weekStartStr = currentStart.toISOString().split('T')[0];

      const weekEndObj = new Date(currentStart);
      weekEndObj.setDate(weekEndObj.getDate() + 6);
      const weekEndStr = weekEndObj.toISOString().split('T')[0];

      // Stop if the week is in the future (partial current week should usually be skipped for fees, but let's allow up to today)
      if (weekEndObj > new Date()) break;

      console.log(`[Fee Calc] Processing week: ${weekStartStr} to ${weekEndStr}`);

      for (const tenant of tenants) {
        try {
          if (!tenant.company_percentage || tenant.company_percentage <= 0) continue;

          // 3. Fetch Revenue for that specific week
          const { data: orders } = await supabase.from('orders')
            .select('value, total_value')
            .eq('tenant_id', tenant.id)
            .gte('date', weekStartStr)
            .lte('date', weekEndStr)
            .in('status', ['APROVADO', 'paid', 'approved', 'succes', 'COMPLETO']);

          const weeklyRevenue = orders?.reduce((sum, o) => sum + (Number(o.value || o.total_value) || 0), 0) || 0;
          const amountDue = weeklyRevenue * (tenant.company_percentage / 100);

          if (amountDue <= 0) continue;

          // 4. Insert (Upsert) Weekly Fee
          // Only update if status is 'pending' or doesn't exist. Don't overwrite paid/canceled.
          // Actually upsert overwrites. We should check existence first or use a smarter upsert policy.
          // For simplicity: Upsert. If it was 'paid' it would just update values? No, that's dangerous.
          // Let's check first.
          const { data: existing } = await supabase.from('weekly_fees')
            .select('id, status')
            .eq('tenant_id', tenant.id)
            .eq('week_start', weekStartStr)
            .maybeSingle();

          if (existing && existing.status !== 'pending') {
            // Skip if already processed/paid
            continue;
          }

          const { error: insErr } = await supabase.from('weekly_fees').upsert({
            tenant_id: tenant.id,
            week_start: weekStartStr,
            week_end: weekEndStr,
            revenue_week: weeklyRevenue,
            percent_applied: tenant.company_percentage,
            amount_due: amountDue,
            status: existing ? existing.status : 'pending',
            updated_at: new Date().toISOString()
          }, { onConflict: 'tenant_id,week_start' });

          if (!insErr) results.push({
            week: `${weekStartStr} - ${weekEndStr}`,
            tenant: tenant.name,
            revenue: weeklyRevenue,
            due: amountDue
          });

        } catch (e) {
          console.error(`Failed to calculate week ${weekStartStr} for ${tenant.name}`, e.message);
        }
      }

      // Move to next week
      currentStart.setDate(currentStart.getDate() + 7);
    }

    res.json({ success: true, created: results.length, details: results });
  } catch (err) {
    console.error('Calculation error:', err);
    res.status(500).send({ error: err.message });
  }
});

// POST /api/admin/weekly-fees/preview
app.post('/api/admin/weekly-fees/preview', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const { data: tenants } = await supabase.from('tenants').select('*').eq('active', true);
    if (!tenants) return res.json({ data: [] });

    let currentStart = new Date();
    if (startDate) {
      currentStart = new Date(startDate);
    } else {
      currentStart.setDate(currentStart.getDate() - (currentStart.getDay() || 7) - 6);
    }
    const day = currentStart.getDay() || 7;
    if (day !== 1) currentStart.setDate(currentStart.getDate() - (day - 1));

    let endLimit = new Date();
    if (endDate) endLimit = new Date(endDate);
    if (endLimit > new Date()) endLimit = new Date();

    const previewResults = [];

    while (currentStart < endLimit) {
      const weekStartStr = currentStart.toISOString().split('T')[0];
      const weekEndObj = new Date(currentStart);
      weekEndObj.setDate(weekEndObj.getDate() + 6);
      const weekEndStr = weekEndObj.toISOString().split('T')[0];

      if (weekEndObj > new Date()) break;

      for (const tenant of tenants) {
        if (!tenant.company_percentage || tenant.company_percentage <= 0) continue;

        const { data: orders } = await supabase.from('orders')
          .select('value, total_value')
          .eq('tenant_id', tenant.id)
          .gte('created_at', weekStartStr)
          .lte('created_at', weekEndStr)
          .in('status', ['APROVADO', 'paid', 'approved', 'succes', 'COMPLETO']);

        const weeklyRevenue = orders?.reduce((sum, o) => sum + (Number(o.value || o.total_value) || 0), 0) || 0;
        const amountDue = weeklyRevenue * (tenant.company_percentage / 100);

        if (amountDue > 0) {
          previewResults.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            weekStart: weekStartStr,
            weekEnd: weekEndStr,
            revenue: weeklyRevenue,
            pct: tenant.company_percentage,
            amount: amountDue
          });
        }
      }
      currentStart.setDate(currentStart.getDate() + 7);
    }

    res.json({ success: true, data: previewResults });
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).send({ error: err.message });
  }
});

// POST /api/weekly-fees/:id/gerar-cobranca
app.post('/api/weekly-fees/:id/gerar-cobranca', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;

    const { client } = await getAsaasClient();

    // 1. Fetch Fee Record
    const { data: fee, error: feeErr } = await supabase.from('weekly_fees').select('*').eq('id', id).single();
    if (feeErr || !fee) return res.status(404).send({ error: 'Fatura não encontrada' });
    if (fee.status !== 'pending') return res.status(400).send({ error: 'Cobrança já gerada ou paga' });

    // 2. Fetch Customer Mapping
    const { data: mapping } = await supabase.from('asaas_customers').select('asaas_customer_id').eq('user_id',
      (await supabase.from('users').select('id').eq('tenant_id', fee.tenant_id).limit(1).single()).data?.id
    ).single();

    if (!mapping) return res.status(400).send({ error: 'Cliente não mapeado no Asaas' });

    // 3. Create Asaas Payment
    const asaasBillingType = paymentMethod === 'CREDIT_CARD' ? 'CREDIT_CARD' : (paymentMethod === 'PIX' ? 'PIX' : 'BOLETO');
    const externalReference = `${fee.tenant_id}_week_${fee.week_start}`;

    // JSON reference for better parsing if needed
    const refData = { tenantId: fee.tenant_id, requestId: fee.id, type: 'weekly_fee', weekStart: fee.week_start };

    const chargePayload = {
      customer: mapping.asaas_customer_id,
      billingType: asaasBillingType,
      value: fee.amount_due,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days
      description: `Taxa semanal (${fee.week_start} a ${fee.week_end}) sobre faturamento: R$ ${fee.revenue_week.toFixed(2)}`,
      externalReference: JSON.stringify(refData)
    };

    const asaasRes = await client.post('/payments', chargePayload);
    const asaasData = asaasRes.data;

    // 4. Update local record
    await supabase.from('weekly_fees').update({
      status: 'created',
      asaas_payment_id: asaasData.id,
      asaas_invoice_url: asaasData.invoiceUrl || asaasData.bankSlipUrl || '',
      due_date: asaasData.dueDate,
      updated_at: new Date().toISOString()
    }).eq('id', id);

    res.json({ success: true, paymentUrl: asaasData.invoiceUrl || asaasData.bankSlipUrl });
  } catch (err) {
    console.error('Gerar cobrança semanal error:', err.response?.data || err.message);
    res.status(500).send({ error: 'Falha ao gerar cobrança no Asaas' });
  }
});

// POST /api/weekly-fees/:id/cancelar
app.post('/api/weekly-fees/:id/cancelar', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: fee } = await supabase.from('weekly_fees').select('*').eq('id', id).single();
    if (!fee) return res.status(404).send({ error: 'Fatura não encontrada' });

    if (fee.asaas_payment_id && fee.status !== 'paid') {
      try {
        const { client } = await getAsaasClient();
        await client.delete(`/payments/${fee.asaas_payment_id}`);
      } catch (e) { console.warn('Asaas delete failed', e.message); }
    }

    await supabase.from('weekly_fees').update({
      status: 'canceled',
      asaas_payment_id: null,
      asaas_invoice_url: null
    }).eq('id', id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// 1. Create/Get Asaas Customer
app.post('/api/asaas/create-customer', async (req, res) => {
  try {
    const { client } = await getAsaasClient();
    const { user_id } = req.body;
    if (!user_id) return res.status(400).send({ error: "user_id required" });

    // Verify user exists
    const { data: user, error: userError } = await supabase.from("users").select("*, tenants(*)").eq("id", user_id).single();
    if (userError || !user) return res.status(404).send({ error: "User not found" });

    const tenant = user.tenants;
    const document = (tenant?.document || '').replace(/\D/g, '');
    const email = user.email;

    // 1. Check mapping in local DB
    const { data: mapping } = await supabase.from("asaas_customers").select("asaas_customer_id").eq("user_id", user.id).single();

    let asaasCustomerId = mapping?.asaas_customer_id;

    // 2. If ID exists locally, verify it's still valid in Asaas
    if (asaasCustomerId) {
      try {
        await client.get(`/customers/${asaasCustomerId}`);
        console.log(`[Asaas] Existing valid customer found in DB: ${asaasCustomerId}`);
        return res.send({ asaas_customer_id: asaasCustomerId });
      } catch (err) {
        console.warn(`[Asaas] Customer ID ${asaasCustomerId} found in DB but invalid or removed in Asaas. Searching for another or creating new...`);
        asaasCustomerId = null;
        // Optional: Remove invalid mapping? 
        // await supabase.from("asaas_customers").delete().eq("user_id", user.id);
      }
    }

    // 3. Search in Asaas by Email or Document to avoid duplication
    try {
      const searchParams = new URLSearchParams();
      if (email) searchParams.append('email', email);
      if (document) searchParams.append('cpfCnpj', document);

      const searchResp = await client.get(`/customers?${searchParams.toString()}`);
      if (searchResp.data.data && searchResp.data.data.length > 0) {
        asaasCustomerId = searchResp.data.data[0].id;
        console.log(`[Asaas] Customer found in Asaas search: ${asaasCustomerId}`);

        // Save/Update mapping
        await supabase.from("asaas_customers").upsert({ user_id: user.id, asaas_customer_id: asaasCustomerId }, { onConflict: 'user_id' });
        return res.send({ asaas_customer_id: asaasCustomerId });
      }
    } catch (searchErr) {
      console.warn("[Asaas] Search by email/doc failed", searchErr.message);
    }

    // 4. Create in Asaas if not found
    console.log(`[Asaas] Creating new customer for user ${user.id} (${user.email}).`);
    try {
      const payload = {
        name: user.name || user.email,
        email: user.email,
        externalReference: user.id,
        cpfCnpj: document
      };

      const asaasResp = await client.post(`/customers`, payload);
      asaasCustomerId = asaasResp.data.id;
      console.log(`[Asaas] Customer created: ${asaasCustomerId}`);

      // Save mapping
      await supabase.from("asaas_customers").upsert({ user_id: user.id, asaas_customer_id: asaasCustomerId }, { onConflict: 'user_id' });

      return res.status(201).send({ asaas_customer_id: asaasCustomerId });
    } catch (asaasErr) {
      const errorData = asaasErr.response?.data;
      console.error("Asaas create customer error", JSON.stringify(errorData || asaasErr.message));

      let friendlyMessage = "Erro ao criar cliente no Asaas.";
      if (errorData?.errors && errorData.errors.length > 0) {
        friendlyMessage = errorData.errors.map(e => e.description).join(', ');
      }

      return res.status(400).send({ error: friendlyMessage, detail: errorData });
    }
  } catch (err) {
    console.error("create-customer global error", err);
    res.status(500).send({ error: err.message });
  }
});

// 2. Get Subscription Status
app.get('/api/subscription-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).send({ error: "userId required" });

    // 1. Get Subscription Status from DB
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select(`*, plans (*)`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Get Payments history
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: false })
      .limit(10);

    if (subError) return res.status(500).send({ error: "DB error", detail: subError });

    return res.send({
      subscription: subscription ? { ...subscription, payments: payments || [] } : null
    });
  } catch (err) {
    console.error("get-subscription-status error", err);
    res.status(500).send({ error: err.message });
  }
});

// 3. Create Subscription
app.post('/api/asaas/create-subscription', async (req, res) => {
  try {
    const { plan_id, billing_cycle, user_id } = req.body;
    if (!user_id || !plan_id) return res.status(400).send({ error: "user_id and plan_id required" });

    const { client } = await getAsaasClient();

    const { data: user } = await supabase.from("users").select("*").eq("id", user_id).single();
    if (!user) return res.status(404).send({ error: "User not found" });

    const cycleMap = { 'quarterly': 'QUARTERLY', 'semiannual': 'SEMIANNUAL', 'yearly': 'YEARLY', 'monthly': 'MONTHLY' };
    const asaasCycle = cycleMap[billing_cycle] || "MONTHLY";

    const { data: plan } = await supabase.from("plans").select("*").eq("id", plan_id).single();
    if (!plan) return res.status(404).send({ error: "Plan not found" });

    // Check mapping
    const { data: mapping } = await supabase.from("asaas_customers").select("asaas_customer_id").eq("user_id", user.id).single();
    if (!mapping) return res.status(400).send({ error: "Customer not registered in Asaas" });

    const priceMap = {
      'QUARTERLY': plan.price_quarterly,
      'SEMIANNUAL': plan.price_semiannual,
      'YEARLY': plan.price_yearly,
      'MONTHLY': plan.price_monthly || plan.price
    };
    const finalPrice = priceMap[asaasCycle] || 0;

    // Idempotency
    const { data: existingSub } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).eq("plan_id", plan_id).eq("status", "active").maybeSingle();
    if (existingSub) return res.send({ subscription: existingSub, message: "Subscription already active" });

    // Create in Asaas
    try {
      const payload = {
        customer: mapping.asaas_customer_id,
        billingType: "UNDEFINED", // Allows customer to choose (Boleto/Pix/Card)
        value: finalPrice,
        nextDueDate: new Date().toISOString().split("T")[0],
        cycle: asaasCycle,
        description: `Assinatura: ${(plan.name || 'Plano')} (${asaasCycle})`,
        externalReference: user.id,
      };

      console.log(`[Asaas] Creating subscription for user ${user.id} (${user.email}). Value: ${finalPrice} Cycle: ${asaasCycle}`);
      const asaasResp = await client.post(`/subscriptions`, payload);

      const asaasData = asaasResp.data;
      console.log(`[Asaas] Subscription created: ${asaasData.id}`);

      // Store in DB
      let newSub = null;
      try {
        const { data, error: subError } = await supabase.from("subscriptions").insert({
          user_id: user.id,
          plan_id: plan.id,
          asaas_subscription_id: asaasData.id,
          status: "pending",
          value: finalPrice,
          cycle: asaasCycle,
          next_due_date: asaasData.nextDueDate,
        }).select().single();

        if (subError) throw subError;
        newSub = data;
      } catch (dbErr) {
        console.error("DB Insert Subscription Error", dbErr);
        // Don't fail the request if DB fails, but log it. The user has the sub in Asaas.
        // We might want to return a warning or try to void the sub in Asaas? 
        // For now, proceed.
      }

      // Get payment URL
      let paymentUrl = "";
      try {
        const payRes = await client.get(`/payments?subscription=${asaasData.id}&limit=1`);
        if (payRes.data.data && payRes.data.data.length > 0) paymentUrl = payRes.data.data[0].invoiceUrl;
      } catch (e) {
        console.warn("Failed to fetch invoice URL immediately", e.message);
      }

      // Update Tenant Pending State
      const { data: userData } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
      if (userData?.tenant_id) {
        await supabase.from("tenants").update({
          pending_plan_id: plan.id,
          pending_billing_cycle: billing_cycle,
          pending_payment_url: paymentUrl,
        }).eq("id", userData.tenant_id);
      }

      return res.status(201).send({ subscription: newSub || asaasData, paymentUrl });

    } catch (apiErr) {
      const errorData = apiErr.response?.data;
      console.error("Asaas subscription api error", JSON.stringify(errorData || apiErr.message));

      let friendlyMessage = "Erro ao criar assinatura no Asaas.";
      if (errorData?.errors && errorData.errors.length > 0) {
        friendlyMessage = errorData.errors.map(e => e.description).join(', ');
      }
      return res.status(400).send({ error: friendlyMessage, detail: errorData });
    }
  } catch (err) {
    console.error("create-subscription error", err);
    res.status(500).send({ error: err.message });
  }
});

/**
 * Simple proxy for Yampi/Dooki requests.
 * Receives requests at:
 *  - /api/yampi/auth/...        -> forwards to https://api.dooki.com.br/v2/auth/...
 *  - /api/yampi/:alias/...      -> forwards to https://api.dooki.com.br/v2/:alias/...
 *
 * The frontend should include Yampi headers (User-Token, User-Secret-Key, Alias)
 * or Authorization Bearer token. This proxy will forward those headers to the Dooki API.
 */
app.use('/api/yampi', async (req, res) => {
  try {
    // req.path here is the path after /api/yampi
    const innerPath = req.path.replace(/^\/+/, ''); // remove leading slash
    const targetBase = 'https://api.dooki.com.br/v2';
    const targetUrl = innerPath ? `${targetBase}/${innerPath}` : `${targetBase}/`;

    // Prepare headers: forward auth-related headers and content-type
    const forwardHeaders = {};
    ['user-token', 'user-secret-key', 'alias', 'authorization', 'content-type'].forEach(h => {
      const val = req.get(h) || req.get(h.toUpperCase());
      if (val) forwardHeaders[h] = val;
    });

    const axiosConfig = {
      method: req.method,
      url: targetUrl,
      headers: forwardHeaders,
      params: req.query,
      data: req.body,
      timeout: 20000,
      validateStatus: () => true
    };

    const proxied = await axios(axiosConfig);
    // Filter problematic hop-by-hop headers before forwarding
    const forwardedHeaders = { ...(proxied.headers || {}) };
    delete forwardedHeaders['transfer-encoding'];
    delete forwardedHeaders['content-length'];
    delete forwardedHeaders['connection'];
    res.status(proxied.status).set(forwardedHeaders).send(proxied.data);
  } catch (err) {
    console.error('Yampi proxy error', err.response?.data || err.message || err);
    res.status(502).send({ error: 'Yampi proxy error', details: err.response?.data || err.message });
  }
});

// --- NEW YAMPI METRICS ENDPOINTS ---
/**
 * POST /api/yampi/auth/exchange
 * Exchanges OAuth code for Access Token and updates Tenant record server-side.
 * This avoids RLS issues and CORS problems independent of the frontend session.
 */
app.post('/api/yampi/auth/exchange', async (req, res) => {
  try {
    const { code, clientId, redirectUri, codeVerifier, tenantId } = req.body;

    if (!code || !clientId || !redirectUri || !codeVerifier || !tenantId) {
      return res.status(400).json({ error: "Missing required parameters." });
    }

    const db = supabaseAdmin || supabase;

    // 1. Exchange Code for Token
    const tokenUrl = process.env.VITE_YAMPI_TOKEN_URL || 'https://api.dooki.com.br/v2/oauth/token';
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    });

    console.log(`[YampiAuth] Exchanging code for tenant ${tenantId}...`);
    const tokenRes = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const tokenData = tokenRes.data;
    // tokenData: { access_token, refresh_token, expires_in, scope, token_type }

    // 2. Fetch User Alias
    // We need the alias to make any further API calls.
    console.log(`[YampiAuth] Fetching user alias...`);
    const meRes = await axios.get('https://api.dooki.com.br/v2/auth/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const alias = meRes.data?.alias || meRes.data?.data?.alias;
    if (!alias) {
      console.warn(`[YampiAuth] Warning: Could not retrieve alias. Response:`, meRes.data);
    } else {
      console.log(`[YampiAuth] Found alias: ${alias}`);
    }

    // 3. Update Tenant in Database (Admin Mode)
    const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null;

    const updatePayload = {
      yampi_oauth_access_token: tokenData.access_token,
      yampi_oauth_refresh_token: tokenData.refresh_token,
      yampi_oauth_token_expires_at: expiresAt,
      yampi_oauth_scope: tokenData.scope || null,
      // Create/Update Legacy fallback
      yampi_token: tokenData.access_token,
      // Update Alias if found
      ...(alias ? { yampi_alias: alias } : {})
    };

    const { error: dbError } = await db
      .from('tenants')
      .update(updatePayload)
      .eq('id', tenantId);

    if (dbError) {
      console.error(`[YampiAuth] DB Update Failed:`, dbError);
      throw new Error(`Database update failed: ${dbError.message}`);
    }

    console.log(`[YampiAuth] Successfully updated tenant ${tenantId} credentials.`);
    res.json({ success: true, alias });

  } catch (err) {
    console.error('[YampiAuth] Exchange Error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to exchange token or save data.',
      details: err.response?.data || err.message
    });
  }
});

/**
 * POST /api/admin/metricas/yampi/sync
 * Manually triggers synchronization for one or all tenants.
 */
app.post('/api/admin/metricas/yampi/sync', async (req, res) => {
  try {
    const { tenantId } = req.body;
    const db = supabaseAdmin || supabase;
    const { YampiSyncService } = await import('./services/yampiSync.js');

    if (tenantId) {
      const { data: tenant } = await db.from('tenants').select('*').eq('id', tenantId).single();
      if (!tenant) return res.status(404).send({ error: 'Tenant not found' });
      await YampiSyncService.syncOrders(tenant);
    } else {
      const { data: tenants } = await db.from('tenants').select('*').not('yampi_token', 'is', null);
      for (const t of (tenants || [])) {
        try { await YampiSyncService.syncOrders(t); } catch (e) { console.error(`Sync failed for ${t.id}`, e.message); }
      }
    }

    return res.json({ success: true, message: 'Synchronization triggered successfully' });
  } catch (err) {
    console.error('Manual sync trigger error:', err.message);
    res.status(500).send({ success: false, error: 'Failed to trigger synchronization' });
  }
});

/**
 * GET /api/admin/metricas/yampi/overview
 * Returns consolidated metrics for Yampi orders.
 */
app.get('/api/admin/metricas/yampi/overview', async (req, res) => {
  try {
    const { startDate, endDate, tenantId } = req.query;
    const db = supabaseAdmin || supabase;

    // Use SQL aggregation where possible to avoid 1000-row limit
    // We'll fetch the aggregated data directly if we don't need individual rows for charts
    // Actually, for charts we need daily data. 

    let baseQuery = db.from('orders').select('status, raw_status_alias, value, date');

    if (tenantId) baseQuery = baseQuery.eq('tenant_id', tenantId);
    if (startDate) baseQuery = baseQuery.gte('date', startDate);
    if (endDate) baseQuery = baseQuery.lte('date', endDate);

    // If there might be thousands of orders, we should use a recursive fetch or RPC
    // For now, let's fetch in chunks if needed or trust 1000 is enough for a typical dashboard view (daily/weekly)
    // BUT to be safe, let's fetch enough to cover common periods.
    const { data: orders, error } = await baseQuery.limit(5000); // Higher limit
    if (error) throw error;

    const stats = {
      ordersCreated: orders.length,
      ordersPaid: 0,
      grossRevenue: 0,
      netRevenue: 0,
      canceled: 0,
      refunded: 0,
      averageTicket: 0,
      chartData: []
    };

    const dailyRevenue = {};

    orders.forEach(o => {
      const isPaid = o.status === 'APROVADO';
      const isCanceled = o.status === 'CANCELADO';
      const isRefunded = o.raw_status_alias === 'refunded';

      if (isCanceled) stats.canceled++;
      if (isRefunded) stats.refunded++;

      if (isPaid && !isCanceled) {
        stats.ordersPaid++;
        stats.grossRevenue += Number(o.value || 0);
        stats.netRevenue += Number(o.value || 0);

        const dateKey = (o.date || '').split('T')[0];
        if (dateKey) {
          dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + Number(o.value || 0);
        }
      }
    });

    stats.averageTicket = stats.ordersPaid > 0 ? stats.grossRevenue / stats.ordersPaid : 0;
    stats.chartData = Object.keys(dailyRevenue).sort().map(day => ({ day, value: dailyRevenue[day] }));

    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Yampi overview metrics error:', err.message);
    res.status(500).send({ success: false, error: 'Failed to fetch Yampi metrics' });
  }
});

/**
 * GET /api/admin/metricas/yampi/orders
 * Returns paginated orders with detailed metrics and filters.
 */
app.get('/api/admin/metricas/yampi/orders', async (req, res) => {
  try {
    const { tenantId, startDate, endDate, status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const db = supabaseAdmin || supabase;

    let query = db.from('orders').select('*, tenants(name)', { count: 'exact' });

    if (tenantId) query = query.eq('tenant_id', tenantId);
    if (startDate) query = query.gte('order_date', startDate);
    if (endDate) query = query.lte('order_date', endDate);
    if (status) query = query.eq('status', status);

    query = query.order('order_date', { ascending: false }).range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({
      success: true,
      data,
      meta: {
        total: count,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (err) {
    console.error('Yampi orders list error:', err.message);
    res.status(500).send({ success: false, error: 'Failed to fetch Yampi orders' });
  }
});

// --- NEW ENDPOINTS FOR ADMIN DASHBOARDS (Performance & Extrato) ---


/**
 * /api/admin/performance/metrics
 * Returns aggregated metrics for the Performance dashboard.
 */
app.get('/api/admin/performance/metrics', async (req, res) => {
  try {
    const { startDate, endDate, tenantId } = req.query;

    // Base query for orders
    let ordersQuery = supabase.from('orders').select('*');
    if (tenantId) ordersQuery = ordersQuery.eq('tenant_id', tenantId);
    if (startDate) ordersQuery = ordersQuery.gte('created_at', startDate);
    if (endDate) ordersQuery = ordersQuery.lte('created_at', endDate);

    // Fetch orders
    const { data: orders, error: ordersError } = await ordersQuery;
    if (ordersError) throw ordersError;

    // Filter approved orders
    const validStatuses = ['APROVADO', 'paid', 'approved', 'succes'];
    const approvedOrders = (orders || []).filter(o =>
      validStatuses.includes(o.status) || validStatuses.includes((o.status || '').toLowerCase())
    );

    const totalRevenue = approvedOrders.reduce((sum, o) => sum + (Number(o.value || o.total_value) || 0), 0);
    const orderCount = approvedOrders.length;
    const avgTicket = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Fetch active subscriptions
    let subsQuery = supabase.from('subscriptions').select('*, plans(*)').eq('status', 'active');
    if (tenantId) {
      // Need to join via users table if tenantId is provided, but for now assuming global admin or simple link
      // This accurate filtering would require a join: subscriptions -> users -> tenant_id
      // For MVP/simplicity, we might skip tenant filtering for subs OR do a 2-step fetch if needed.
      // Let's do a quick 2-step if tenantId is present.
      const { data: tenantUsers } = await supabase.from('users').select('id').eq('tenant_id', tenantId);
      const userIds = (tenantUsers || []).map(u => u.id);
      if (userIds.length > 0) subsQuery = subsQuery.in('user_id', userIds);
      else subsQuery = subsQuery.in('user_id', []); // No users found
    }
    const { data: activeSubs, error: subsError } = await subsQuery;
    if (subsError) throw subsError;

    const activeSubscriptionsCount = (activeSubs || []).length;
    const mrr = (activeSubs || []).reduce((sum, sub) => {
      // Normalize price to monthly
      const price = sub.value || 0;
      const cycle = (sub.cycle || 'MONTHLY').toUpperCase();
      if (cycle === 'QUARTERLY') return sum + (price / 3);
      if (cycle === 'SEMIANNUAL') return sum + (price / 6);
      if (cycle === 'YEARLY') return sum + (price / 12);
      return sum + price;
    }, 0);

    // Group orders by day for chart
    const ordersByDay = {};
    approvedOrders.forEach(o => {
      const day = (o.order_date || o.created_at || '').split('T')[0];
      if (day) ordersByDay[day] = (ordersByDay[day] || 0) + (Number(o.value || o.total_value) || 0);
    });
    const chartData = Object.keys(ordersByDay).sort().map(day => ({ day, value: ordersByDay[day] }));

    return res.json({
      totalRevenue,
      activeSubscriptions: activeSubscriptionsCount,
      mrr,
      avgTicket,
      ordersByDay: chartData,
      orderCount
    });

  } catch (err) {
    console.error('Error fetching performance metrics:', err);
    res.status(500).send({ error: 'Failed to fetch performance metrics' });
  }
});

/**
 * /api/admin/extrato
 * Returns a paginated list of financial transactions (Incomes, Commissions, etc).
 */
app.get('/api/admin/extrato', async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, type, status, tenantId } = req.query;
    const offset = (page - 1) * limit;

    // We primarily source from 'payments' (Asaas) and potentially 'subscriptions' or 'orders'
    // For a unified "Extrato", we might need a dedicated view or table, OR just query 'payments' usually.
    // Let's query 'payments' table which should ideally be synced with Asaas.

    let query = supabase.from('payments').select('*', { count: 'exact' });

    if (startDate) query = query.gte('due_date', startDate);
    if (endDate) query = query.lte('due_date', endDate);
    if (status) query = query.eq('status', status);

    // For tenant filtering, we need user relation if payments are linked to users
    if (tenantId) {
      const { data: tenantUsers } = await supabase.from('users').select('id').eq('tenant_id', tenantId);
      const userIds = (tenantUsers || []).map(u => u.id);
      if (userIds.length > 0) query = query.in('user_id', userIds);
      else query = query.in('user_id', []);
    }

    query = query.order('due_date', { ascending: false }).range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({
      data,
      meta: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (err) {
    console.error('Error fetching extrato:', err);
    res.status(500).send({ error: 'Failed to fetch extrato' });
  }
});


/**
 * /api/asaas/sync-data
 * Force manual sync of data from Asaas (Payments & Customers) to local DB.
 */
app.post('/api/asaas/sync-data', async (req, res) => {
  try {
    const { client } = await getAsaasClient(); // Get fresh client
    console.log("Starting full Asaas Sync...");

    // 1. Sync Payments (Last 30 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const dateString = cutoffDate.toISOString().split('T')[0];

    // Fetch from Asaas
    // Note: Asaas pagination limit is max 100 usually. We loop if needed, but for MVP just fetch latest 100.
    const paymentsRes = await client.get(`/payments?dueDate[ge]=${dateString}&limit=100`);

    const payments = paymentsRes.data.data || [];
    console.log(`Fetched ${payments.length} payments from Asaas.`);

    let insertedCount = 0;
    let errorsCount = 0;

    for (const p of payments) {
      try {
        // Try to link to a local user via externalReference (if it holds user_id) or customer ID mapping
        let userId = null;

        const { data: mapping } = await supabase.from('asaas_customers').select('user_id').eq('asaas_customer_id', p.customer).single();
        if (mapping) userId = mapping.user_id;

        // Upsert payment
        // Map Asaas fields to DB fields
        await supabase.from('payments').upsert({
          id: p.id, // Use Asaas ID as PK if schema allows, or use it as unique key
          user_id: userId,
          value: p.value,
          net_value: p.netValue,
          status: p.status, // PENDING, RECEIVED, etc.
          billing_type: p.billingType,
          due_date: p.dueDate,
          payment_date: p.paymentDate,
          invoice_url: p.invoiceUrl,
          description: p.description
        }, { onConflict: 'id' }); // Assuming 'id' is the Asaas ID column or there's a constraint.

        insertedCount++;
      } catch (innerErr) {
        console.warn(`Failed to sync payment ${p.id}`, innerErr.message);
        errorsCount++;
      }
    }

    // 2. Sync Subscriptions
    const subRes = await client.get(`/subscriptions?limit=100`);
    const subscriptions = subRes.data.data || [];
    console.log(`Fetched ${subscriptions.length} subscriptions from Asaas.`);

    for (const s of subscriptions) {
      try {
        let userId = null;
        const { data: mapping } = await supabase.from('asaas_customers').select('user_id').eq('asaas_customer_id', s.customer).single();
        if (mapping) userId = mapping.user_id;

        await supabase.from('subscriptions').upsert({
          asaas_subscription_id: s.id,
          user_id: userId,
          value: s.value,
          status: s.status.toLowerCase(),
          cycle: s.cycle,
          next_due_date: s.nextDueDate,
          description: s.description
        }, { onConflict: 'asaas_subscription_id' });
      } catch (innerErr) {
        console.warn(`Failed to sync subscription ${s.id}`, innerErr.message);
      }
    }

    return res.json({
      success: true,
      message: `Synced ${insertedCount} payments and ${subscriptions.length} subscriptions. Errors: ${errorsCount}.`
    });

  } catch (err) {
    console.error('Sync error:', err);
    return res.status(500).send({ error: 'Sync process failed.' });
  }
});


// --- WEEKLY FEES CALCULATION ENDPOINTS ---

/**
 * Helper to calculate revenue per tenant for a date range
 */
async function calculateRevenuePerTenant(startDate, endDate) {
  const db = supabaseAdmin || supabase;

  // 1. Fetch all tenants with company_percentage > 0
  const { data: tenants, error: tErr } = await db
    .from('tenants')
    .select('id, name, owner_email, company_percentage')
    .gt('company_percentage', 0);

  if (tErr) throw tErr;

  // 2. Fetch approved orders within range
  // We need to group by tenant. Supabase JS doesn't do complex GROUP BY well without RPC.
  // We'll fetch all relevant orders and aggregate in JS for MVP simplicity (assuming < 10k orders/week).
  // Optimally: Use an RPC function 'calculate_weekly_revenue(start, end)'.

  // Let's try JS aggregation for now.
  const { data: orders, error: oErr } = await db
    .from('orders')
    .select('tenant_id, total_value, value, status')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .in('status', ['paid', 'approved', 'succes', 'APROVADO', 'COMPLETO']); // Add your valid statuses

  if (oErr) throw oErr;

  // Aggregate
  const revenueMap = {}; // tenantId -> total
  orders.forEach(o => {
    const val = Number(o.value || o.total_value || 0);
    if (!revenueMap[o.tenant_id]) revenueMap[o.tenant_id] = 0;
    revenueMap[o.tenant_id] += val;
  });

  // Build Result List
  const results = tenants.map(t => {
    const revenue = revenueMap[t.id] || 0;
    const fee = t.company_percentage || 0;
    const amount = revenue * (fee / 100);
    return {
      tenantId: t.id,
      tenantName: t.name,
      email: t.owner_email,
      revenue,
      percentage: fee,
      amountDue: amount
    };
  }).filter(r => r.amountDue > 0); // Only return those with fees

  return results;
}


/**
 * POST /api/admin/weekly-fees/:id/pay
 * Confirms payment by verifying admin password.
 */
app.post('/api/admin/weekly-fees/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, email } = req.body;

    if (!password || !email) {
      return res.status(400).send({ error: 'Email and Password required for confirmation.' });
    }

    // 1. Verify Credentials using Supabase Auth
    // We attempt to sign in. If successful, the user is verified.
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return res.status(401).send({ error: 'Senha incorreta ou credenciais inválidas.' });
    }

    // 2. Check if user has admin permission? 
    // For now, implicit trust if they can hit this endpoint and have valid login.
    // (Ideally we check role, but let's stick to the requested "password confirmation")

    // 3. Update Fee Status
    const db = supabaseAdmin || supabase;
    const { error: updateError } = await db
      .from('weekly_fees')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw updateError;

    // --- Notification Logic ---
    try {
      const { data: feeData } = await db.from('weekly_fees').select('amount_due, tenant_id').eq('id', id).single();
      if (feeData) {
        const { data: tenant } = await db.from('tenants').select('name').eq('id', feeData.tenant_id).single();
        await notifyEvent('BILL_PAID', {
          tenantName: tenant?.name || 'Desconhecido',
          value: Number(feeData.amount_due)
        });
      }
    } catch (e) {
      console.error('[Notification] Error triggering BILL_PAID', e);
    }
    // -------------------------

    return res.json({ success: true, message: 'Taxa marcada como paga.' });

  } catch (err) {
    console.error('Pay fee error:', err);
    return res.status(500).send({ error: 'Falha ao processar pagamento.' });
  }
});

/**
 * /api/admin/weekly-fees/auto-close
 * Automatically scans past weeks and generates fees for any missing weeks.
 * Also updates Tenant Meta Range if revenue exceeds threshold.
 */
app.post('/api/admin/weekly-fees/auto-close', async (req, res) => {
  try {
    const db = supabaseAdmin || supabase;

    // 1. Define weeks to scan (e.g., last 8 weeks)
    const weeksToScan = 8;
    const now = new Date();
    const results = [];

    // Iterate backwards from last full week
    for (let i = 1; i <= weeksToScan; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (i * 7));

      // Calculate start/end of that week (assuming Monday-Sunday or fixed 7 day blocks)
      // For simplicity, let's just stick to "Last 7 days" relative to 'd', or finding the Monday.
      // Let's assume standard ISO weeks or just rolling 7-day windows? 
      // User asked for "fecho de toda semana", usually Monday-Sunday.

      const day = d.getDay(); // 0 (Sun) to 6 (Sat)
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const startDate = monday.toISOString();
      const endDate = sunday.toISOString();

      // 2. Calculate Revenue for this week
      const weekData = await calculateRevenuePerTenant(startDate, endDate);

      for (const item of weekData) {
        // 3. Check if fee already exists
        const { data: existing } = await db.from('weekly_fees')
          .select('id')
          .eq('tenant_id', item.tenantId)
          .eq('week_start', startDate) // Assuming strict date match from calculateRevenuePerTenant logic? 
          // Actually calculateRevenuePerTenant doesn't return dates, we pass them.
          // So we use startDate as the key.
          .maybeSingle();

        if (!existing) {
          // Insert
          await db.from('weekly_fees').insert({
            tenant_id: item.tenantId,
            week_start: startDate,
            week_end: endDate,
            revenue_week: item.revenue,
            percent_applied: item.percentage,
            amount_due: item.amountDue,
            status: 'pending'
          });
          results.push(`Generated: ${item.tenantName} (${startDate}) - R$ ${item.amountDue.toFixed(2)}`);
        }

        // 4. Auto-Update Meta (Sales Goal) Logic
        // If Total Revenue (not just weekly) exceeds threshold, upgrade range.
        // We need TOTAL revenue for this tenant. 
        // Let's fetch total approved revenue ever.
        // Optimally this should be an aggregate view, but we can sum here.

        // Check current Meta Logic:
        // 0-10k, 10k-100k, 100k-1M

        // Quick aggregate total revenue
        const { data: totalRevData } = await db.from('orders')
          .select('value, total_value')
          .eq('tenant_id', item.tenantId)
          .in('status', ['paid', 'approved', 'succes', 'APROVADO', 'COMPLETO']);

        const totalRevenue = (totalRevData || []).reduce((sum, o) => sum + Number(o.value || o.total_value || 0), 0);

        let newRange = null;
        if (totalRevenue > 1000000) newRange = '100k-1M+'; // If you have a higher range
        else if (totalRevenue > 100000) newRange = '100k-1M';
        else if (totalRevenue > 10000) newRange = '10k-100k';
        else newRange = '0-10k';

        // Fetch current range to compare
        const { data: currentTenant } = await db.from('tenants').select('meta_range').eq('id', item.tenantId).single();

        if (currentTenant && currentTenant.meta_range !== newRange) {
          // Only upgrade (never downgrade automatically? User said "mudar para a proxima", implies upgrade)
          // Let's allow both or just upgrade. Let's upgrade.
          // Mapping ranges to magnitude
          const magnitude = { '0-10k': 1, '10k-100k': 2, '100k-1M': 3, '100k-1M+': 4 };
          if ((magnitude[newRange] || 0) > (magnitude[currentTenant.meta_range] || 0)) {
            await db.from('tenants').update({ meta_range: newRange }).eq('id', item.tenantId);
            results.push(`Meta Upgraded: ${item.tenantName} -> ${newRange}`);
          }
        }
      }
    }

    return res.json({ success: true, message: `Auto-close process completed.`, logs: results });

  } catch (err) {
    console.error('Auto-close error:', err);
    return res.status(500).send({ error: 'Failed to auto-close weeks.' });
  }
});

// --- ADMIN METRICS MODULE ---

/**
 * GET /api/admin/metrics/overview
 * Returns aggregated totals for the metrics dashboard.
 */
app.get('/api/admin/metrics/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const db = supabaseAdmin || supabase;

    // 1. Get Weekly Fees within range
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const end = endDate || new Date().toISOString();

    let feesQuery = db.from('weekly_fees').select('amount_due, status')
      .gte('week_start', start)
      .lte('week_end', end);

    const { data: fees, error: feesErr } = await feesQuery;
    if (feesErr) throw feesErr;

    // 2. Aggregate Fees
    let totalExpected = 0; // Soma de amount_due (gerado)
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    (fees || []).forEach(f => {
      const amount = Number(f.amount_due || 0);
      totalExpected += amount;
      if (f.status === 'paid' || f.status === 'received') totalPaid += amount;
      else if (f.status === 'pending') totalPending += amount;
      else if (f.status === 'overdue') totalOverdue += amount;
    });

    // 3. Get total active tenants (adimplentes vs inadimplentes based on fee status)
    // Simplified: check tenants with overdue fees
    const { data: overdueFees } = await db.from('weekly_fees')
      .select('tenant_id')
      .eq('status', 'overdue');

    const uniqueDefaulters = new Set((overdueFees || []).map(f => f.tenant_id)).size;

    const { count: totalTenants } = await db.from('tenants').select('*', { count: 'exact', head: true });

    const adimplentes = (totalTenants || 0) - uniqueDefaulters;

    return res.json({
      totalExpected,
      totalPaid,
      totalPending,
      totalOverdue,
      adimplentes,
      inadimplentes: uniqueDefaulters,
      totalTenants: totalTenants || 0
    });

  } catch (err) {
    console.error('Metrics overview error:', err);
    res.status(500).send({ error: 'Failed to fetch metrics overview.' });
  }
});

/**
 * GET /api/admin/metrics/tenants
 * List tenants with their calculated fees for the period.
 */
app.get('/api/admin/metrics/tenants', async (req, res) => {
  try {
    const { startDate, endDate, status, search } = req.query;
    const db = supabaseAdmin || supabase;

    // 1. Fetch Tenants
    let tenantsQuery = db.from('tenants').select('id, name, owner_email, company_percentage, meta_range');
    if (search) tenantsQuery = tenantsQuery.ilike('name', `%${search}%`);
    const { data: tenants, error: tErr } = await tenantsQuery;
    if (tErr) throw tErr;

    // 2. LIVE Calculation (Revenue & Due)
    // If no period provided, default to current month
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const end = endDate || new Date().toISOString();

    const liveData = await calculateRevenuePerTenant(start, end);
    // liveData is array of { tenantId, revenue, percentage, amountDue }

    // 3. Fetch Payment Statuses (from weekly_fees table in that range)
    const { data: dbFees } = await db.from('weekly_fees')
      .select('tenant_id, status, amount_due, payment_date')
      .gte('week_start', start)
      .lte('week_end', end);

    // 4. Merge Data
    const report = (tenants || []).map(t => {
      // Find live calculation
      const live = liveData.find(l => l.tenantId === t.id) || { revenue: 0, amountDue: 0 };

      // Find db fees
      const tenantFees = (dbFees || []).filter(f => f.tenant_id === t.id);

      // Aggregates from DB fees
      const totalGenerated = tenantFees.reduce((sum, f) => sum + Number(f.amount_due), 0);
      const totalPaid = tenantFees.filter(f => ['paid', 'received'].includes(f.status)).reduce((sum, f) => sum + Number(f.amount_due), 0);

      // Determine overall status
      let overallStatus = 'pending';
      if (tenantFees.length > 0) {
        if (tenantFees.some(f => f.status === 'overdue')) overallStatus = 'overdue';
        else if (tenantFees.some(f => f.status === 'pending')) overallStatus = 'pending';
        else if (tenantFees.every(f => ['paid', 'received'].includes(f.status))) overallStatus = 'paid';
      } else {
        // No fees generated yet.
        overallStatus = live.revenue > 0 ? 'accumulating' : 'no_activity';
      }

      return {
        id: t.id,
        name: t.name,
        email: t.owner_email,
        meta_range: t.meta_range,
        percentage: t.company_percentage || 0,

        // Metrics
        revenue_period: live.revenue, // Real-time revenue from orders
        amount_due: live.amountDue,  // Real-time calculated fee (estimated or final)

        // Fee Records
        fees_generated_total: totalGenerated,
        fees_paid_total: totalPaid,
        fees_pending: totalGenerated - totalPaid,

        last_payment: tenantFees.find(f => ['paid', 'received'].includes(f.status))?.payment_date || null,
        status: overallStatus
      };
    });

    // 5. Filter Result
    const filtered = report.filter(item => {
      if (status && status !== 'ALL' && item.status !== status) return false;
      return true;
    });

    return res.json(filtered);

  } catch (err) {
    console.error('Tenant metrics list error:', err);
    res.status(500).send({ error: 'Failed to fetch tenant metrics.' });
  }
});

/**
 * GET /api/admin/metrics/tenants/:id
 * Detailed history for a specific tenant.
 */
app.get('/api/admin/metrics/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const db = supabaseAdmin || supabase;

    // 1. Fetch Tenant Basic Info
    const { data: tenant, error: tErr } = await db.from('tenants').select('*').eq('id', id).single();
    if (tErr) return res.status(404).send({ error: 'Tenant not found' });

    // 2. Fetch Weekly Fees History
    let feesQuery = db.from('weekly_fees').select('*').eq('tenant_id', id).order('week_start', { ascending: false });
    if (startDate) feesQuery = feesQuery.gte('week_start', startDate);
    if (endDate) feesQuery = feesQuery.lte('week_end', endDate);

    const { data: history } = await feesQuery;

    // 3. Fetch Live Revenue Chart Data (Daily)
    let ordersQuery = db.from('orders')
      .select('date, value')
      .eq('tenant_id', id)
      .eq('status', 'APROVADO');

    // Default range if not provided (last 6 months)
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString();
    const end = endDate || new Date().toISOString();

    ordersQuery = ordersQuery.gte('date', start).lte('date', end);

    const { data: orders } = await ordersQuery;

    const revenueByDay = {};
    (orders || []).forEach(o => {
      const day = (o.date || '').split('T')[0];
      if (day) revenueByDay[day] = (revenueByDay[day] || 0) + Number(o.value || 0);
    });

    // Sort by date
    const chartData = Object.keys(revenueByDay).sort().map(d => ({
      date: d,
      revenue: revenueByDay[d],
      fee_estimated: revenueByDay[d] * ((tenant.company_percentage || 0) / 100)
    }));

    return res.json({
      tenant,
      history: history || [],
      chartData
    });

  } catch (err) {
    console.error('Tenant details error:', err);
    res.status(500).send({ error: 'Failed to fetch tenant details.' });
  }
});

// ==========================================
// TEAM MANAGEMENT (Lojistas)
// ==========================================

app.get('/api/team/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const db = supabaseAdmin || supabase;

    // Lista apenas usuários atrelados ao tenant (exceto o dev se quiser, ou todos).
    const { data: users, error } = await db.from('users')
      .select('id, name, email, role, business_type, created_at')
      .eq('tenant_id', tenantId);

    if (error) throw error;
    res.json(users);
  } catch (err) {
    console.error('Fetch team error:', err);
    res.status(500).send({ error: 'Erro ao buscar equipe' });
  }
});

app.post('/api/team', async (req, res) => {
  try {
    const { tenantId, name, email, password, role } = req.body;

    if (!supabaseAdmin) {
      return res.status(500).send({ error: 'Service Role Key não configurada no servidor.' });
    }

    // 1. Criar Auth User
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: role || 'user' }
    });

    if (authErr && authErr.message.includes('already exists')) {
      return res.status(400).send({ error: 'Este e-mail já está em uso.' });
    }
    if (authErr) throw authErr;

    const userId = authData.user.id;

    // 2. Inserir na tabela Users
    const { data: newUser, error: dbErr } = await supabaseAdmin.from('users').insert({
      id: userId,
      email,
      name,
      role: role || 'user',
      tenant_id: tenantId,
      created_at: new Date().toISOString()
    }).select().single();

    if (dbErr) {
      // Rollback se der erro
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw dbErr;
    }

    res.json(newUser);
  } catch (err) {
    console.error('Create team member error:', err);
    res.status(500).send({ error: 'Erro ao criar membro da equipe' });
  }
});

app.delete('/api/team/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!supabaseAdmin) return res.status(500).send({ error: 'Service Role Key ausente.' });

    // 1. Apagar da tabela public.users
    await supabaseAdmin.from('users').delete().eq('id', userId);

    // 2. Apagar do Auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('Delete team member error:', err);
    res.status(500).send({ error: 'Erro ao remover membro' });
  }
});

// ==========================================
// ADMIN PLANS (Service Role required/Fallback)
// ==========================================

app.post('/api/admin/plans', async (req, res) => {
  try {
    const dbClient = supabaseAdmin || supabase;
    const payload = req.body;

    let { data, error } = await dbClient.from('plans').upsert(payload).select().single();

    if (error && error.code === '42501') {
      console.warn("Plano upsert bloqueado por RLS. Tentando bypass RPC admin_upsert_plan se existir...");

      // Tentativa de usar uma RPC não mapeada se existir
      const { data: rpcData, error: rpcError } = await dbClient.rpc('admin_upsert_plan', {
        _id: payload.id || null,
        _name: payload.name,
        _price_quarterly: payload.price_quarterly,
        _price_semiannual: payload.price_semiannual,
        _price_yearly: payload.price_yearly
      });

      if (!rpcError && rpcData) {
        return res.json(rpcData);
      }

      res.status(500).send({ error: "Permissão Negada (RLS) no Supabase. Para criar planos, você precisa adicionar a variável SUPABASE_SERVICE_ROLE_KEY no seu arquivo .env.server ou desativar o RLS da tabela 'plans' temporariamente." });
      return;
    } else if (error) {
      console.error('Supabase error saving plan:', error);
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Save plan error:', error);
    res.status(500).send({ error: 'Erro interno ao salvar plano', details: error.message });
  }
});

app.delete('/api/admin/plans/:id', async (req, res) => {
  try {
    const dbClient = supabaseAdmin || supabase;
    const { id } = req.params;

    const { error } = await dbClient.from('plans').delete().eq('id', id);

    if (error && error.code === '42501') {
      console.warn("Plano delete bloqueado por RLS.");
      res.status(500).send({ error: "Permissão Negada (RLS). Configurar chave Service Role." });
      return;
    } else if (error) {
      console.error('Supabase error deleting plan:', error);
      throw error;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).send({ error: 'Erro interno ao excluir plano', details: error.message });
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Asaas proxy server listening on port ${PORT}`);
  startSyncJob();

  // Start Push Reporter (Checks every 60 seconds)
  setInterval(() => {
    PushReporter.checkAndSendReports();
  }, 60 * 1000);

  // --- Realtime Listeners for Notifications ---
  const db = supabaseAdmin || supabase;

  // 1. New Tenant Listener
  db.channel('public:tenants')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tenants' }, (payload) => {
      console.log('[Realtime] New tenant detected:', payload.new.name);
      notifyEvent('NEW_TENANT', payload.new).catch(e => console.error(e));
    })
    .subscribe();

  // 2. Weekly Fee Listener (Bill Created)
  db.channel('public:weekly_fees')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'weekly_fees' }, async (payload) => {
      try {
        const { data: tenant } = await db.from('tenants').select('name').eq('id', payload.new.tenant_id).single();
        notifyEvent('BILL_DUE', {
          tenantName: tenant?.name || 'Desconhecido',
          value: payload.new.amount_due
        }).catch(e => console.error(e));
      } catch (e) { console.error(e); }
    })
    .subscribe();

  console.log('[Realtime] Listeners initialized for notifications.');
});


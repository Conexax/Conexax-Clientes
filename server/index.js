import express from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load server env vars from .env.server if present (local development)
dotenv.config({ path: '.env.server' });

const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const ASAAS_API_URL = process.env.VITE_ASAAS_API_URL || process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.VITE_ASAAS_API_KEY || process.env.ASAAS_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase configuration (SUPABASE_URL / SUPABASE_KEY).');
  process.exit(1);
}
if (!ASAAS_API_KEY) {
  console.error('Missing Asaas API key (ASAAS_API_KEY).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to compute price for a plan record
function getPriceForCycle(plan, cycle) {
  if (!plan) return 0;
  if (cycle === 'quarterly') return Number(plan.price_quarterly || plan.priceQuarterly || 0);
  if (cycle === 'semiannual') return Number(plan.price_semiannual || plan.priceSemiannual || 0);
  return Number(plan.price_yearly || plan.priceYearly || 0);
}

app.post('/api/asaas/create-payment', async (req, res) => {
  try {
    const { tenantId, planId, cycle } = req.body;
    if (!tenantId || !planId) return res.status(400).send({ error: 'tenantId and planId required' });

    const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
    if (!tenant) return res.status(404).send({ error: 'Tenant not found' });

    const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single();
    if (!plan) return res.status(404).send({ error: 'Plan not found' });

    const price = getPriceForCycle(plan, cycle || 'quarterly');
    const description = `Plano Conexx Hub: ${(plan.name || plan.nome || 'Plano')} (${cycle})`;

    // 1) Get or create customer in Asaas
    const ownerEmail = tenant.owner_email || tenant.ownerEmail || req.body.ownerEmail;
    const ownerName = tenant.owner_name || tenant.ownerName || req.body.ownerName || 'Cliente Conexx';
    const document = tenant.document || tenant.cpfCnpj || '';

    // Search existing customer
    let customerId = null;
    try {
      const searchRes = await axios.get(`${ASAAS_API_URL}/customers`, {
        params: { email: ownerEmail },
        headers: { access_token: ASAAS_API_KEY }
      });
      if (searchRes.data && searchRes.data.data && searchRes.data.data.length > 0) {
        customerId = searchRes.data.data[0].id;
      }
    } catch (err) {
      // ignore and try create
    }

    if (!customerId) {
      const createRes = await axios.post(`${ASAAS_API_URL}/customers`, {
        name: ownerName,
        email: ownerEmail,
        cpfCnpj: (document || '').toString().replace(/\D/g, '')
      }, {
        headers: { access_token: ASAAS_API_KEY }
      });
      customerId = createRes.data.id;
    }

    // 2) Create payment
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // +3 days
    const paymentRes = await axios.post(`${ASAAS_API_URL}/payments`, {
      customer: customerId,
      billingType: 'UNDEFINED',
      value: price,
      dueDate,
      description,
      externalReference: tenantId
    }, {
      headers: { access_token: ASAAS_API_KEY }
    });

    const payment = paymentRes.data;

    // 3) Persist pending state to Supabase
    await supabase.from('tenants').update({
      pending_plan_id: planId,
      pending_billing_cycle: cycle,
      pending_payment_url: payment.invoiceUrl,
      pending_payment_id: payment.id
    }).eq('id', tenantId);

    return res.send({ invoiceUrl: payment.invoiceUrl, paymentId: payment.id });
  } catch (err) {
    console.error('create-payment error', err.response?.data || err.message || err);
    return res.status(500).send({ error: 'Failed to create payment' });
  }
});

// Webhook endpoint that Asaas will call on payment updates
app.post('/api/asaas/webhook', async (req, res) => {
  try {
    const body = req.body || {};
    // Try to extract payment id
    const paymentId = body.id || body?.data?.id || body?.payment?.id || body?.object?.id;

    if (!paymentId) {
      console.warn('Webhook received without identifiable payment id', body);
      return res.status(400).send({ received: true });
    }

    // Fetch payment details to know status
    const paymentDetailRes = await axios.get(`${ASAAS_API_URL}/payments/${paymentId}`, {
      headers: { access_token: ASAAS_API_KEY }
    });
    const payment = paymentDetailRes.data;
    const status = (payment?.status || '').toLowerCase();

    // Consider these statuses as successful payment (adjust if needed)
    const paidStatuses = ['confirmed', 'paid', 'received', 'paid_offline'];
    if (paidStatuses.includes(status)) {
      // Find tenant by pending_payment_id or externalReference
      const { data: tenantsByPending } = await supabase.from('tenants').select('*').eq('pending_payment_id', paymentId).limit(1);
      let tenant = (tenantsByPending && tenantsByPending[0]) || null;
      if (!tenant && payment.externalReference) {
        const { data: tenantsByExternal } = await supabase.from('tenants').select('*').eq('id', payment.externalReference).limit(1);
        tenant = (tenantsByExternal && tenantsByExternal[0]) || null;
      }

      if (!tenant) {
        console.warn('Paid payment but no tenant found for payment', paymentId);
        return res.status(200).send({ received: true });
      }

      // Compute next billing date based on pending_billing_cycle
      const cycle = tenant.pending_billing_cycle || 'quarterly';
      const months = cycle === 'quarterly' ? 3 : cycle === 'semiannual' ? 6 : 12;
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + months);

      await supabase.from('tenants').update({
        plan_id: tenant.pending_plan_id,
        billing_cycle: tenant.pending_billing_cycle,
        next_billing: nextDate.toISOString(),
        pending_plan_id: null,
        pending_billing_cycle: null,
        pending_payment_url: null,
        pending_payment_id: null,
        subscription_status: 'active'
      }).eq('id', tenant.id);
    }

    return res.status(200).send({ received: true });
  } catch (err) {
    console.error('Webhook processing error', err.response?.data || err.message || err);
    return res.status(500).send({ error: 'webhook processing failed' });
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Asaas proxy server listening on port ${PORT}`);
});


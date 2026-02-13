import dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.server' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env vars (SUPABASE_URL / SUPABASE_KEY).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function mapOrder(o, tenantId) {
  const rawTotal = o.value_total ?? o.value_total ?? o.value_total ?? o.value_total ?? o.value_total;
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
    status: (statusAlias === 'paid' || statusAlias === 'shipping' || statusAlias === 'delivered') ? 'APROVADO' : 'AGUARDANDO',
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

async function run(tenantId) {
  try {
    if (!tenantId) {
      console.error('Usage: node server/syncTenant.js <tenant_id>');
      process.exit(1);
    }

    // Fetch tenant from supabase
    const { data: tenants, error: tErr } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .limit(1);
    if (tErr) throw tErr;
    const tenant = (tenants || [])[0];
    if (!tenant) throw new Error('Tenant not found');

    const alias = tenant.yampi_alias || tenant.yampiAlias;
    const token = tenant.yampi_token || tenant.yampiToken;
    const secret = tenant.yampi_secret || tenant.yampiSecret;
    const proxyBase = tenant.yampi_proxy_url || tenant.yampiProxyUrl || '';

    if (!alias || (!token && !tenant.yampi_oauth_access_token)) {
      throw new Error('Missing yampi credentials on tenant.');
    }

    // Build URL to local proxy (server will forward)
    const base = 'http://localhost:4000/api/yampi';

    console.log('Fetching orders from Yampi for', alias);
    const ordersRes = await axios.get(`${base}/${alias}/orders`, {
      params: { limit: 100, include: 'customer,items,payments' },
      headers: {
        'User-Token': token,
        'User-Secret-Key': secret,
        'Alias': alias
      },
      timeout: 20000
    });

    const orders = ordersRes.data?.data || [];

    console.log(`Found ${orders.length} orders — writing to Supabase...`);
    // Delete existing orders for tenant
    await supabase.from('orders').delete().eq('tenant_id', tenantId);
    if (orders.length > 0) {
      const dbOrders = orders.map(o => mapOrder(o, tenantId));
      const { error: ordErr } = await supabase.from('orders').insert(dbOrders);
      if (ordErr) throw ordErr;
    }

    console.log('Fetching abandoned checkouts...');
    const abRes = await axios.get(`${base}/${alias}/abandoned-checkouts`, {
      params: { limit: 100, include: 'customer,items' },
      headers: {
        'User-Token': token,
        'User-Secret-Key': secret,
        'Alias': alias
      },
      timeout: 20000
    });
    const abandoned = abRes.data?.data || [];
    console.log(`Found ${abandoned.length} abandoned checkouts — writing to Supabase...`);
    await supabase.from('abandoned_checkouts').delete().eq('tenant_id', tenantId);
    if (abandoned.length > 0) {
      const dbAb = abandoned.map(a => mapAbandoned(a, tenantId));
      const { error: abErr } = await supabase.from('abandoned_checkouts').insert(dbAb);
      if (abErr) throw abErr;
    }

    // Update cached revenue & last_sync
    const totalRevenue = orders
      .filter(o => {
        const s = (typeof o.status === 'string' ? o.status : o.status?.data?.alias || '').toLowerCase();
        return s === 'paid' || s === 'confirmed' || s === 'received' || s === 'paid_offline' || s === 'approved';
      })
      .reduce((sum, o) => sum + (Number(o.value_total ?? o.total ?? 0) || 0), 0);

    await supabase.from('tenants').update({
      cached_gross_revenue: totalRevenue,
      last_sync: new Date().toISOString()
    }).eq('id', tenantId);

    console.log('Sync complete for tenant', tenantId, 'revenue:', totalRevenue);
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err.response?.data || err.message || err);
    process.exit(2);
  }
}

const tenantId = process.argv[2];
run(tenantId);


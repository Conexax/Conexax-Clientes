import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import { notifyEvent } from './notificationService.js';

dotenv.config({ path: '.env.server' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Normalizes and maps Yampi order data to our database schema.
 * Handles gross/net revenue calculation and status mapping.
 */
function mapYampiOrder(yo, tenantId) {
    // Official Yampi fields:
    // value_total: gross value (items + shipping)
    // value_discount: discounts
    // value_repayment: refunds (if partially or fully refunded)
    // value_tax: gateway fees or taxes if provided

    const grossValue = Number(yo.value_total || yo.total || 0);
    const discountValue = Number(yo.value_discount || 0);
    const taxValue = Number(yo.value_tax || 0);
    const refundValue = Number(yo.value_repayment || 0);

    // Net Value = Gross - Discount - Refund - Tax
    const netValue = grossValue - discountValue - refundValue - taxValue;

    const statusAlias = (typeof yo.status === 'string'
        ? yo.status
        : yo.status?.data?.alias || '').toLowerCase();

    // Map Yampi status to our OrderStatus
    let status = 'AGUARDANDO';
    let isCanceled = false;
    let isRefunded = refundValue > 0 || statusAlias === 'refunded';

    if (['paid', 'shipping', 'delivered', 'approved', 'confirmed', 'received', 'paid_offline'].includes(statusAlias)) {
        status = 'APROVADO';
    } else if (['canceled', 'cancelled', 'voided'].includes(statusAlias)) {
        status = 'CANCELADO';
        isCanceled = true;
    }

    const customer = yo.customer?.data || {};

    return {
        tenant_id: tenantId,
        external_id: String(yo.id || yo.number),
        client: `${customer.first_name || 'Cliente'} ${customer.last_name || ''}`.trim(),
        email: customer.email || '',
        product: yo.items?.data?.[0]?.product_name || yo.items?.data?.[0]?.name || 'Produto',
        date: yo.created_at?.date || yo.created_at || new Date().toISOString(),
        status: status,
        payment_method: (() => {
            const method = yo.payment_method || yo.payments?.data?.[0]?.payment_method_id || 'unknown';
            const m = String(method).toLowerCase();
            if (m.includes('pix')) return 'PIX';
            if (m.includes('card') || m.includes('credit')) return 'Cartão';
            if (m.includes('billet') || m.includes('boleto')) return 'Boleto';
            return 'Cartão';
        })(),
        value: grossValue,
        coupon_code: yo.promocode?.data?.code || yo.promotions?.data?.[0]?.code || null,
        raw_status_alias: statusAlias,
        delivered: statusAlias === 'delivered'
    };
}

export const YampiSyncService = {
    /**
     * Synchronizes all orders for a specific tenant.
     * Uses upsert for idempotency.
     */
    async syncOrders(tenant) {
        const alias = tenant.yampi_alias || tenant.yampiAlias;
        // Legacy credentials
        const token = tenant.yampi_token || tenant.yampiToken;
        const secret = tenant.yampi_secret || tenant.yampiSecret;
        // OAuth credentials
        const oauthToken = tenant.yampi_oauth_access_token || tenant.yampiOauthAccessToken;

        if (!alias) {
            throw new Error(`Tenant ${tenant.id} missing Yampi Alias.`);
        }

        // Ensure we have at least one method of authentication
        if (!oauthToken && (!token || !secret)) {
            throw new Error(`Tenant ${tenant.id} missing Yampi credentials (Token+Secret or OAuth).`);
        }

        console.log(`[YampiSync] Starting paginated sync for ${tenant.name} (${alias})...`);

        const apiBase = `https://api.dooki.com.br/v2/${alias}`;

        const headers = {
            'Alias': alias,
            'Content-Type': 'application/json'
        };

        if (oauthToken) {
            headers['Authorization'] = `Bearer ${oauthToken}`;
            console.log(`[YampiSync] Using OAuth Token for ${alias}`);
        } else {
            headers['User-Token'] = token;
            headers['User-Secret-Key'] = secret;
            console.log(`[YampiSync] Using Legacy Token/Secret for ${alias}`);
        }

        let page = 1;
        let hasMore = true;
        let totalSynced = 0;

        try {
            // We'll sync up to 10 pages (1000 orders) for better coverage
            while (hasMore && page <= 10) {
                console.log(`[YampiSync] Fetching page ${page}...`);
                const response = await axios.get(`${apiBase}/orders`, {
                    params: {
                        limit: 100,
                        page: page,
                        include: 'customer,items,payments',
                        sort: '-created_at'
                    },
                    headers,
                    timeout: 20000
                });

                const rawOrders = response.data?.data || [];
                const meta = response.data?.meta?.pagination || {};

                if (rawOrders.length === 0) {
                    hasMore = false;
                    break;
                }

                const dbOrders = rawOrders.map(yo => mapYampiOrder(yo, tenant.id));

                // --- Notification Logic ---
                const approvedNew = dbOrders.filter(o => o.status === 'APROVADO');
                for (const order of approvedNew) {
                    // Check if this specific order already exists in our DB to avoid spamming
                    const { data: existing } = await supabase.from('orders')
                        .select('id, status')
                        .eq('tenant_id', tenant.id)
                        .eq('external_id', order.external_id)
                        .maybeSingle();

                    if (!existing || (existing.status !== 'APROVADO')) {
                        // This is a "New Approval" event
                        await notifyEvent('SALE', {
                            tenantId: tenant.id,
                            value: order.value,
                            productName: order.product,
                            clientName: order.client
                        });
                    }
                }
                // --------------------------

                const { error } = await supabase
                    .from('orders')
                    .upsert(dbOrders, {
                        onConflict: 'tenant_id, external_id',
                        ignoreDuplicates: false
                    });

                if (error) throw error;

                totalSynced += dbOrders.length;

                if (meta.current_page >= meta.total_pages || rawOrders.length < 100) {
                    hasMore = false;
                } else {
                    page++;
                }
            }

            // Calculate total revenue from ALL orders in DB for this tenant
            // We fetch in batches or use a larger limit if needed, but for strictly summations, 
            // a single select with all rows is fine for moderately sized businesses.
            const { data: revenueData, error: revErr } = await supabase
                .from('orders')
                .select('value')
                .eq('tenant_id', tenant.id)
                .eq('status', 'APROVADO');

            if (revErr) throw revErr;

            const totalRevenue = (revenueData || []).reduce((sum, o) => sum + Number(o.value || 0), 0);

            await supabase.from('tenants').update({
                cached_gross_revenue: totalRevenue,
                last_sync: new Date().toISOString()
            }).eq('id', tenant.id);

            console.log(`[YampiSync] Finished. Synced ${totalSynced} orders. Total DB Revenue: ${totalRevenue}`);
            return { count: totalSynced, revenue: totalRevenue };

        } catch (err) {
            console.error(`[YampiSync] Error for tenant ${alias}:`, err.response?.data || err.message);
            throw err;
        }
    },

    /**
     * Synchronizes all products for a specific tenant.
     * Uses upsert to create or update existing products based on external sku/id.
     */
    async syncProducts(tenant) {
        const alias = tenant.yampi_alias || tenant.yampiAlias;
        const token = tenant.yampi_token || tenant.yampiToken;
        const secret = tenant.yampi_secret || tenant.yampiSecret;
        const oauthToken = tenant.yampi_oauth_access_token || tenant.yampiOauthAccessToken;

        if (!alias) {
            throw new Error(`Tenant ${tenant.id} missing Yampi Alias.`);
        }

        if (!oauthToken && (!token || !secret)) {
            throw new Error(`Tenant ${tenant.id} missing Yampi credentials.`);
        }

        console.log(`[YampiSync] Starting paginated products sync for ${tenant.name} (${alias})...`);

        const apiBase = `https://api.dooki.com.br/v2/${alias}`;

        const headers = {
            'Alias': alias,
            'Content-Type': 'application/json'
        };

        if (oauthToken) {
            headers['Authorization'] = `Bearer ${oauthToken}`;
        } else {
            headers['User-Token'] = token;
            headers['User-Secret-Key'] = secret;
        }

        let page = 1;
        let hasMore = true;
        let totalSynced = 0;

        try {
            while (hasMore && page <= 5) { // sync up to 5 pages (500 products)
                console.log(`[YampiSync Products] Fetching page ${page}...`);
                const response = await axios.get(`${apiBase}/catalog/products`, {
                    params: {
                        limit: 100,
                        page: page
                    },
                    headers,
                    timeout: 20000
                });

                const rawProducts = response.data?.data || [];
                const meta = response.data?.meta?.pagination || {};

                if (rawProducts.length === 0) {
                    hasMore = false;
                    break;
                }

                // Map products
                const dbProducts = rawProducts.map(p => ({
                    tenant_id: tenant.id,
                    // Use a generated unique ID if inserting, but we rely on sku for conflict resolution usually.
                    // Supabase requires UUID for id. Let's use yampi_product_id instead to match against.
                    name: p.name || p.product_name || 'Produto',
                    sku: p.sku || p.id,
                    description: p.description || '',
                    price: parseFloat(p.price || p.value_total || 0) || 0,
                    active: p.active ?? true,
                    operation_type: 'Venda',
                    yampi_product_id: typeof p.id === 'number' ? p.id : parseInt(p.id) || 0,
                    images: p.images?.data?.map(i => i.url) || []
                }));

                // Upsert products. Since our primary key is `id` (uuid), we need to ensure we don't create duplicates.
                // We'll query first or use a unique constraint if one existed.
                // Assuming we don't have a unique constraint on (tenant_id, yampi_product_id), we'll upsert manually.
                for (const prod of dbProducts) {
                    const { data: existing } = await supabase.from('products')
                        .select('id')
                        .eq('tenant_id', tenant.id)
                        .eq('yampi_product_id', prod.yampi_product_id)
                        .maybeSingle();

                    if (existing) {
                        prod.id = existing.id; // Map back to existing UUID
                    } // else Supabase generates new UUID on insert

                    const { error } = await supabase.from('products').upsert(prod, {
                        onConflict: 'id',
                        ignoreDuplicates: false
                    });

                    if (error) {
                        console.error(`[YampiSync Products] Upsert failed for ${prod.sku}`, error.message);
                    } else {
                        totalSynced++;
                    }
                }

                if (meta.current_page >= meta.total_pages || rawProducts.length < 100) {
                    hasMore = false;
                } else {
                    page++;
                }
            }

            console.log(`[YampiSync Products] Finished. Synced ${totalSynced} products.`);
            return { count: totalSynced };

        } catch (err) {
            console.error(`[YampiSync Products] Error for tenant ${alias}:`, err.response?.data || err.message);
            throw err;
        }
    },

    /**
     * Synchronizes all coupons for a specific tenant.
     */
    async syncCoupons(tenant) {
        const alias = tenant.yampi_alias || tenant.yampiAlias;
        const token = tenant.yampi_token || tenant.yampiToken;
        const secret = tenant.yampi_secret || tenant.yampiSecret;
        const oauthToken = tenant.yampi_oauth_access_token || tenant.yampiOauthAccessToken;

        if (!alias) throw new Error(`Tenant ${tenant.id} missing Yampi Alias.`);

        const apiBase = `https://api.dooki.com.br/v2/${alias}`;
        const headers = { 'Alias': alias, 'Content-Type': 'application/json' };
        if (oauthToken) headers['Authorization'] = `Bearer ${oauthToken}`;
        else { headers['User-Token'] = token; headers['User-Secret-Key'] = secret; }

        try {
            console.log(`[YampiSync Coupons] Fetching coupons for ${alias}...`);
            const response = await axios.get(`${apiBase}/promotions/coupons`, { headers, timeout: 20000 });
            const rawCoupons = response.data?.data || [];

            const dbCoupons = rawCoupons.map(c => ({
                tenant_id: tenant.id,
                code: c.code,
                type: c.type === 'percentage' ? 'percentage' : 'fixed',
                value: parseFloat(c.value || 0),
                active: c.active ?? true,
                usage_limit: c.limit_usage || null,
                usage_count: c.used_count || 0
            }));

            // Upsert based on code + tenant_id
            for (const coupon of dbCoupons) {
                const { error } = await supabase.from('coupons')
                    .upsert(coupon, { onConflict: 'tenant_id, code', ignoreDuplicates: false });
                if (error) console.error(`[YampiSync Coupons] Upsert failed for ${coupon.code}`, error.message);
            }

            return { count: dbCoupons.length };
        } catch (err) {
            console.error(`[YampiSync Coupons] Error:`, err.response?.data || err.message);
            throw err;
        }
    },

    /**
     * Synchronizes abandoned checkouts.
     */
    async syncAbandonedCheckouts(tenant) {
        const alias = tenant.yampi_alias || tenant.yampiAlias;
        const headers = { 'Alias': alias, 'Content-Type': 'application/json' };
        if (tenant.yampi_oauth_access_token) headers['Authorization'] = `Bearer ${tenant.yampi_oauth_access_token}`;
        else { headers['User-Token'] = tenant.yampi_token; headers['User-Secret-Key'] = tenant.yampi_secret; }

        try {
            console.log(`[YampiSync Abandoned] Fetching for ${alias}...`);
            const response = await axios.get(`https://api.dooki.com.br/v2/${alias}/abandoned-checkouts`, {
                params: { limit: 100, include: 'customer,items' },
                headers,
                timeout: 20000
            });
            const rawAb = response.data?.data || [];

            const dbAb = rawAb.map(ab => {
                const customer = ab.customer?.data || {};
                return {
                    tenant_id: tenant.id,
                    external_id: String(ab.id),
                    client_name: `${customer.first_name || 'Cliente'} ${customer.last_name || ''}`.trim(),
                    email: customer.email || '',
                    phone: customer.phone || '',
                    product_name: ab.items?.data?.[0]?.product_name || 'Produto',
                    value: parseFloat(ab.total || 0),
                    date: ab.created_at?.date || ab.created_at || new Date().toISOString(),
                    items: ab.items?.data || [],
                    recovered: ab.recovered ?? false
                };
            });

            const { error } = await supabase.from('abandoned_checkouts').upsert(dbAb, { onConflict: 'tenant_id, external_id' });
            if (error) throw error;

            return { count: dbAb.length };
        } catch (err) {
            console.error(`[YampiSync Abandoned] Error:`, err.response?.data || err.message);
            throw err;
        }
    },

    /**
     * Synchronizes domains.
     */
    async syncDomains(tenant) {
        const alias = tenant.yampi_alias || tenant.yampiAlias;
        const headers = { 'Alias': alias, 'Content-Type': 'application/json' };
        if (tenant.yampi_oauth_access_token) headers['Authorization'] = `Bearer ${tenant.yampi_oauth_access_token}`;
        else { headers['User-Token'] = tenant.yampi_token; headers['User-Secret-Key'] = tenant.yampi_secret; }

        try {
            console.log(`[YampiSync Domains] Fetching for ${alias}...`);
            const response = await axios.get(`https://api.dooki.com.br/v2/${alias}/settings/domains`, { headers, timeout: 20000 });
            const rawDomains = response.data?.data || [];

            const dbDomains = rawDomains.map(d => ({
                tenant_id: tenant.id,
                url: d.domain,
                is_main: d.main ?? false,
                status: d.status || 'active',
                ssl: d.ssl ?? true
            }));

            // Domains might not have a unique constraint on (tenant_id, url) in the current init.sql, 
            // but we'll assume we can upsert or at least refresh them.
            // If the table doesn't have a unique constraint, this might duplicate.
            // I'll check init.sql again... it doesn't have a unique constraint on url.
            // I'll delete and re-insert for domains to keep it clean if no external_id.
            await supabase.from('domains').delete().eq('tenant_id', tenant.id);
            const { error } = await supabase.from('domains').insert(dbDomains);
            if (error) throw error;

            return { count: dbDomains.length };
        } catch (err) {
            console.error(`[YampiSync Domains] Error:`, err.response?.data || err.message);
            throw err;
        }
    },

    /**
     * Creates a coupon on Yampi.
     */
    async createCoupon(tenant, couponData) {
        const alias = tenant.yampi_alias || tenant.yampiAlias;
        const headers = { 'Alias': alias, 'Content-Type': 'application/json' };
        if (tenant.yampi_oauth_access_token) headers['Authorization'] = `Bearer ${tenant.yampi_oauth_access_token}`;
        else { headers['User-Token'] = tenant.yampi_token; headers['User-Secret-Key'] = tenant.yampi_secret; }

        try {
            console.log(`[YampiSync] Creating coupon ${couponData.code} on ${alias}...`);
            const payload = {
                code: couponData.code,
                type: couponData.type === 'percentage' ? 'percentage' : 'fixed',
                value: couponData.value,
                active: true,
                limit_usage: couponData.usageLimit > 0 ? couponData.usageLimit : null
            };
            const response = await axios.post(`https://api.dooki.com.br/v2/${alias}/promotions/coupons`, payload, { headers });
            return response.data?.data;
        } catch (err) {
            console.error(`[YampiSync] Create Coupon Error:`, err.response?.data || err.message);
            throw err;
        }
    },

    /**
     * Influencers are local but tied to Yampi coupons. 
     * This syncs the usage stats from Yampi coupons into our influencers table.
     */
    async syncInfluencers(tenant) {
        try {
            // First sync coupons to get latest usage counts
            await this.syncCoupons(tenant);

            const { data: influencers } = await supabase.from('influencers').select('*, coupons(*)').eq('tenant_id', tenant.id);
            if (!influencers) return { count: 0 };

            for (const inf of influencers) {
                const coupon = inf.coupons;
                if (!coupon) continue;

                // Simple: total_sales = usage_count, total_commission = usage_count * (avg ticket? NO, we need order values)
                // Ideally we filter orders by coupon_code. Let's do that.
                const { data: orders } = await supabase.from('orders')
                    .select('value')
                    .eq('tenant_id', tenant.id)
                    .eq('coupon_code', coupon.code)
                    .eq('status', 'APROVADO');

                const totalSales = orders?.length || 0;
                const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.value || 0), 0) || 0;
                const totalCommission = (totalRevenue * Number(inf.commission_rate)) / 100;

                await supabase.from('influencers').update({
                    total_sales: totalSales,
                    total_commission: totalCommission
                }).eq('id', inf.id);
            }

            return { count: influencers.length };
        } catch (err) {
            console.error(`[YampiSync Influencers] Error:`, err.message);
            throw err;
        }
    },

    /**
     * Synchronizes communication settings (automations) from Yampi.
     */
    async syncCommSettings(tenant) {
        const alias = tenant.yampi_alias || tenant.yampiAlias;
        const headers = { 'Alias': alias, 'Content-Type': 'application/json' };
        if (tenant.yampi_oauth_access_token) headers['Authorization'] = `Bearer ${tenant.yampi_oauth_access_token}`;
        else { headers['User-Token'] = tenant.yampi_token; headers['User-Secret-Key'] = tenant.yampi_secret; }

        try {
            console.log(`[YampiSync Settings] Fetching for ${alias}...`);
            // Yampi settings for abandoned checkouts
            const response = await axios.get(`https://api.dooki.com.br/v2/${alias}/settings/abandoned-checkouts`, { headers, timeout: 20000 });
            const settings = response.data?.data || {};

            // Map Yampi settings to our inner triggers
            const activeTriggers = [];
            if (settings.active) activeTriggers.push('cart_abandoned');
            // Add more mappings as we discover them

            const dbSettings = {
                tenant_id: tenant.id,
                active_triggers: activeTriggers,
                updated_at: new Date().toISOString()
            };

            await supabase.from('comm_settings').upsert(dbSettings, { onConflict: 'tenant_id' });
            return dbSettings;
        } catch (err) {
            console.error(`[YampiSync Settings] Error:`, err.response?.data || err.message);
            // Don't throw if endpoint doesn't exist, just return local
            return null;
        }
    },

    /**
     * Updates automation settings on Yampi.
     */
    async updateCommSettings(tenant, triggerId, active) {
        if (triggerId !== 'cart_abandoned' && triggerId !== 'cart_1h' && triggerId !== 'cart_24h') return;

        const alias = tenant.yampi_alias || tenant.yampiAlias;
        const headers = { 'Alias': alias, 'Content-Type': 'application/json' };
        if (tenant.yampi_oauth_access_token) headers['Authorization'] = `Bearer ${tenant.yampi_oauth_access_token}`;
        else { headers['User-Token'] = tenant.yampi_token; headers['User-Secret-Key'] = tenant.yampi_secret; }

        try {
            console.log(`[YampiSync Settings] Updating ${triggerId} to ${active} for ${alias}...`);
            // Yampi usually has one main "abandoned" toggle that controls their internal automation
            await axios.put(`https://api.dooki.com.br/v2/${alias}/settings/abandoned-checkouts`, {
                active: active
            }, { headers, timeout: 20000 });
        } catch (err) {
            console.error(`[YampiSync Settings] Update Error:`, err.response?.data || err.message);
            throw err;
        }
    }
};

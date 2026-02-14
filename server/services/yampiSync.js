import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';

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
        client_name: `${customer.first_name || 'Cliente'} ${customer.last_name || ''}`.trim(),
        client_email: customer.email || '',
        product_name: yo.items?.data?.[0]?.product_name || yo.items?.data?.[0]?.name || 'Produto',
        order_date: yo.created_at?.date || yo.created_at || new Date().toISOString(),
        paid_at: yo.paid_at?.date || yo.paid_at || null,
        status: status,
        payment_method: (() => {
            const method = yo.payment_method || yo.payments?.data?.[0]?.payment_method_id || 'unknown';
            const m = String(method).toLowerCase();
            if (m.includes('pix')) return 'PIX';
            if (m.includes('card') || m.includes('credit')) return 'Cartão';
            if (m.includes('billet') || m.includes('boleto')) return 'Boleto';
            return 'Cartão';
        })(),
        total_value: grossValue, // Keeping for backward compatibility
        gross_value: grossValue,
        net_value: netValue,
        discount_value: discountValue,
        tax_value: taxValue,
        is_refunded: isRefunded,
        is_canceled: isCanceled,
        coupon_code: yo.promocode?.data?.code || yo.promotions?.data?.[0]?.code || null,
        raw_data: yo
    };
}

export const YampiSyncService = {
    /**
     * Synchronizes all orders for a specific tenant.
     * Uses upsert for idempotency.
     */
    async syncOrders(tenant) {
        const alias = tenant.yampi_alias || tenant.yampiAlias;
        const token = tenant.yampi_token || tenant.yampiToken;
        const secret = tenant.yampi_secret || tenant.yampiSecret;

        if (!alias || !token) {
            throw new Error(`Tenant ${tenant.id} missing Yampi credentials.`);
        }

        console.log(`[YampiSync] Starting paginated sync for ${tenant.name} (${alias})...`);

        const apiBase = `https://api.dooki.com.br/v2/${alias}`;
        const headers = {
            'User-Token': token,
            'User-Secret-Key': secret,
            'Alias': alias,
            'Content-Type': 'application/json'
        };

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
                .select('gross_value')
                .eq('tenant_id', tenant.id)
                .eq('status', 'APROVADO')
                .is('is_canceled', false);

            if (revErr) throw revErr;

            const totalRevenue = (revenueData || []).reduce((sum, o) => sum + Number(o.gross_value || 0), 0);

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
    }
};

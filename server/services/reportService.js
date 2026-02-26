
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.server' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const ReportService = {
    /**
     * Aggregates sales and ads data for a tenant for a specific date range.
     */
    async getPerformanceStats(tenantId, startDate, endDate) {
        // 1. Fetch Sales (Yampi Orders in DB)
        const { data: orders, error: ordersErr } = await supabase.from('orders')
            .select('value')
            .eq('tenant_id', tenantId)
            .gte('date', startDate)
            .lte('date', endDate)
            .in('status', ['APROVADO', 'paid', 'approved', 'delivered']);

        if (ordersErr) throw ordersErr;

        const revenue = orders.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
        const orderCount = orders.length;

        // 2. Fetch Ads Spend (using mock or real integration logic from analytics routes)
        // For simplicity and to match current routes, we simulate the fetch or use the same logic
        const adsData = await this.getAdsSpend(tenantId, startDate, endDate);

        // 3. Fetch Push Settings for Costs
        const { data: settings } = await supabase.from('push_settings')
            .select('fixed_costs, variable_costs_pct, meta_roas, meta_margem, max_cpa')
            .eq('tenant_id', tenantId)
            .single();

        const fixedCostsDay = (Number(settings?.fixed_costs) || 0) / 30;
        const varCosts = revenue * ((Number(settings?.variable_costs_pct) || 0) / 100);

        const totalAds = adsData.totalSpend;
        const lucro = revenue - totalAds - fixedCostsDay - varCosts;
        const roas = totalAds > 0 ? (revenue / totalAds) : 0;
        const cpa = orderCount > 0 ? (totalAds / orderCount) : 0;
        const margem = revenue > 0 ? (lucro / revenue) * 100 : 0;
        const ticketMedio = orderCount > 0 ? (revenue / orderCount) : 0;

        return {
            revenue,
            orderCount,
            ads: totalAds,
            lucro,
            roas,
            cpa,
            margem,
            ticketMedio,
            costs: {
                fixed: fixedCostsDay,
                variable: varCosts
            },
            goals: {
                roas: settings?.meta_roas || 0,
                margem: settings?.meta_margem || 0,
                cpa: settings?.max_cpa || 0
            }
        };
    },

    async getAdsSpend(tenantId, startDate, endDate) {
        // This is a simplified version of the logic in server/routes/analytics.js
        // Ideally, it would call the same internal functions.
        const { data: tenant } = await supabase.from('tenants').select('meta_access_token, meta_ad_account_id, ga4_measurement_id').eq('id', tenantId).single();

        let totalSpend = 0;

        // Meta Ads
        if (tenant?.meta_access_token && tenant?.meta_ad_account_id) {
            try {
                const adAccountId = tenant.meta_ad_account_id.startsWith('act_') ? tenant.meta_ad_account_id : `act_${tenant.meta_ad_account_id}`;
                const fbUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?time_range={'since':'${startDate.split('T')[0]}','until':'${endDate.split('T')[0]}'}&fields=spend&access_token=${tenant.meta_access_token}`;
                const response = await fetch(fbUrl);
                const json = await response.json();
                if (json.data?.[0]?.spend) totalSpend += parseFloat(json.data[0].spend);
            } catch (e) {
                console.warn('[ReportService] Meta Ads fetch failed', e.message);
            }
        }

        // Google Ads / GA4 (Mocked for now as in current codebase)
        if (tenant?.ga4_measurement_id) {
            totalSpend += 0; // In a real scenario, fetch from Google Ads API
        }

        return { totalSpend };
    }
};

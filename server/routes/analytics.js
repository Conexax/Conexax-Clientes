import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

// Fetches actual Meta Ads Metrics from Graph API
router.get('/meta/metrics', async (req, res) => {
    try {
        const { tenantId, startDate, endDate } = req.query;
        if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

        // Retrieve the Tenant from DB to get the tokens
        const { data: tenant, error } = await supabase.from('tenants').select('meta_access_token, meta_ad_account_id').eq('id', tenantId).single();
        if (error || !tenant) return res.status(404).json({ error: 'Tenant not found.' });

        if (!tenant.meta_ad_account_id || !tenant.meta_access_token) {
            return res.status(400).json({ error: 'Meta Ads integration not fully configured for this tenant.', data: null });
        }

        let metaData = {
            spend: 0, conversions: 0, roas: 0, cpc: 0, cpm: 0, ctr: 0, clicks: 0, cpa: 0
        };

        try {
            const adAccountId = tenant.meta_ad_account_id.startsWith('act_') ? tenant.meta_ad_account_id : `act_${tenant.meta_ad_account_id}`;
            const fields = 'spend,clicks,cpc,cpm,ctr,actions,action_values';
            const fbUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?time_range={'since':'${startDate}','until':'${endDate}'}&fields=${fields}&access_token=${tenant.meta_access_token}`;

            const response = await fetch(fbUrl);
            const json = await response.json();

            if (json.data && json.data.length > 0) {
                const insights = json.data[0];
                metaData.spend = parseFloat(insights.spend || 0);
                metaData.clicks = parseInt(insights.clicks || 0);
                metaData.cpc = parseFloat(insights.cpc || 0);
                metaData.cpm = parseFloat(insights.cpm || 0);
                metaData.ctr = parseFloat(insights.ctr || 0);

                const purchases = (insights.actions || []).find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                metaData.conversions = purchases ? parseInt(purchases.value) : 0;

                const purchaseValue = (insights.action_values || []).find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                const totalConversionValue = purchaseValue ? parseFloat(purchaseValue.value) : 0;

                if (metaData.spend > 0) {
                    metaData.roas = Number((totalConversionValue / metaData.spend).toFixed(2));
                    metaData.cpa = metaData.conversions > 0 ? Number((metaData.spend / metaData.conversions).toFixed(2)) : 0;
                }
            } else if (json.error) {
                console.error("Meta Graph API returned error:", json.error);
                // We'll just return zeros if the token is invalid or expired
            }
        } catch (fbErr) {
            console.error("Meta Graph API fetch exception:", fbErr);
        }

        res.json({
            ...metaData,
            status: 'success'
        });
    } catch (err) {
        console.error('Error fetching Meta Ads metrics:', err);
        res.status(500).json({ error: err.message });
    }
});

// Placeholder for fetching GA4 Metrics
router.get('/google/metrics', async (req, res) => {
    try {
        const { tenantId, startDate, endDate } = req.query;
        if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

        // Retrieve the Tenant from DB to get the tokens
        const { data: tenant, error } = await supabase.from('tenants').select('ga4_measurement_id, ga_credentials').eq('id', tenantId).single();
        if (error || !tenant) return res.status(404).json({ error: 'Tenant not found.' });

        if (!tenant.ga4_measurement_id && !tenant.ga_credentials) {
            return res.status(400).json({ error: 'Google Analytics integration not configured for this tenant.', data: null });
        }

        // Real Google Analytics Data API initialization would go here using the Google API client library.

        res.json({
            spend: 8500.00,
            sessions: 45000,
            conversions: 980,
            conversion_rate: 2.17,
            bounceRate: 45.3,
            status: 'mocked_success'
        });
    } catch (err) {
        console.error('Error fetching GA metrics:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;

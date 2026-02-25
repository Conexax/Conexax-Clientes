import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

// Placeholder for fetching Meta Ads Metrics
router.get('/meta/metrics', async (req, res) => {
    try {
        const { tenantId, startDate, endDate } = req.query;
        if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

        // Retrieve the Tenant from DB to get the tokens
        const { data: tenant, error } = await supabase.from('tenants').select('meta_access_token, meta_ad_account_id').eq('id', tenantId).single();
        if (error || !tenant) return res.status(404).json({ error: 'Tenant not found or has no integration tokens.' });

        const accessToken = tenant.meta_access_token;
        const adAccountId = tenant.meta_ad_account_id;

        if (!accessToken || !adAccountId) {
            return res.status(400).json({ error: 'Meta Ads integration not fully configured for this tenant.' });
        }

        // Ideally here we perform a fetch to graph.facebook.com:
        // const fbUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?time_range={'since':'${startDate}','until':'${endDate}'}&fields=spend,cpc,roas,clicks&access_token=${accessToken}`;
        // const fbResponse = await fetch(fbUrl);
        // const fbData = await fbResponse.json();

        // Returning mocked successful payload for now
        res.json({
            spend: 12500.50,
            roas: 4.8,
            cpc: 0.85,
            clicks: 14705,
            status: 'mocked_success'
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
        if (error || !tenant) return res.status(404).json({ error: 'Tenant not found or has no integration tokens.' });

        const gaId = tenant.ga4_measurement_id;
        const gaCreds = tenant.ga_credentials;

        if (!gaId || !gaCreds) {
            return res.status(400).json({ error: 'Google Analytics integration not fully configured for this tenant.' });
        }

        // Real Google Analytics Data API initialization would go here using the Google API client library with gaCreds.

        res.json({
            sessions: 45000,
            conversions: 980,
            conversion_rate: 2.17,
            status: 'mocked_success'
        });
    } catch (err) {
        console.error('Error fetching GA metrics:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;

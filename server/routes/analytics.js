import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

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
            spend: 0, conversions: 0, roas: 0, cpc: 0, cpm: 0, ctr: 0, clicks: 0, cpa: 0, daily: []
        };

        try {
            const adAccountId = tenant.meta_ad_account_id.startsWith('act_') ? tenant.meta_ad_account_id : `act_${tenant.meta_ad_account_id}`;
            const fields = 'spend,clicks,cpc,cpm,ctr,actions,action_values,impressions';
            // Added time_increment=1 for daily breakdown
            const fbUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?time_range={'since':'${startDate}','until':'${endDate}'}&fields=${fields}&time_increment=1&access_token=${tenant.meta_access_token}`;

            const response = await fetch(fbUrl);
            const json = await response.json();

            if (json.data && json.data.length > 0) {
                json.data.forEach(insights => {
                    const dSpend = parseFloat(insights.spend || 0);
                    const dClicks = parseInt(insights.clicks || 0);
                    const purchases = (insights.actions || []).find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                    const dConvs = purchases ? parseInt(purchases.value) : 0;

                    metaData.spend += dSpend;
                    metaData.clicks += dClicks;
                    metaData.conversions += dConvs;

                    metaData.daily.push({
                        date: new Date(insights.date_start).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                        metaSpend: dSpend,
                        metaConversions: dConvs
                    });
                });

                if (metaData.spend > 0) {
                    const totalPurchaseValue = json.data.reduce((acc, insights) => {
                        const val = (insights.action_values || []).find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                        return acc + parseFloat(val?.value || 0);
                    }, 0);

                    const totalImpressions = json.data.reduce((acc, i) => acc + parseInt(i.impressions || 0), 0);

                    metaData.roas = Number((totalPurchaseValue / metaData.spend).toFixed(2));
                    metaData.cpa = metaData.conversions > 0 ? Number((metaData.spend / metaData.conversions).toFixed(2)) : 0;
                    metaData.cpc = metaData.clicks > 0 ? Number((metaData.spend / metaData.clicks).toFixed(2)) : 0;
                    metaData.cpm = totalImpressions > 0 ? Number((metaData.spend / (totalImpressions / 1000)).toFixed(2)) : 0;
                    metaData.ctr = json.data.reduce((acc, i) => acc + parseFloat(i.ctr || 0), 0) / json.data.length;
                }
            } else if (json.error) {
                console.error("Meta Graph API returned error:", json.error);
                return res.status(400).json({ error: `Meta API Error: ${json.error.message}`, status: 'error' });
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

// Implementation for fetching real GA4 Metrics
router.get('/google/metrics', async (req, res) => {
    try {
        const { tenantId, startDate, endDate } = req.query;
        if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

        // Retrieve the Tenant from DB to get the tokens/credentials
        const { data: tenant, error } = await supabase.from('tenants').select('ga4_measurement_id, ga_credentials').eq('id', tenantId).single();
        if (error || !tenant) return res.status(404).json({ error: 'Tenant not found.' });

        // We need Property ID (which is numeric) not the Measurement ID (G-XXXX)
        let propertyId = tenant.ga4_measurement_id;
        if (!propertyId || !tenant.ga_credentials) {
            return res.status(400).json({ error: 'Google Analytics integration not fully configured for this tenant.', data: null });
        }

        // Cleanup propertyId if user pasted the full URL or something
        propertyId = propertyId.replace(/\D/g, '');
        if (!propertyId) {
            return res.status(400).json({ error: 'Property ID inválido. Deve ser apenas números.' });
        }

        let credentialsParsed;
        try {
            credentialsParsed = typeof tenant.ga_credentials === 'string' ? JSON.parse(tenant.ga_credentials) : tenant.ga_credentials;
        } catch (e) {
            return res.status(400).json({ error: 'Invalid Google Credentials JSON format.' });
        }

        const analyticsDataClient = new BetaAnalyticsDataClient({
            credentials: credentialsParsed
        });

        // Run report for metrics with date dimension for historical chart
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'date' }],
            metrics: [
                { name: 'sessions' },
                { name: 'totalUsers' },
                { name: 'conversions' },
                { name: 'bounceRate' },
                { name: 'keyEvents' }
            ],
            // Order by date to make chart building easier
            orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
        });

        const metrics = {
            spend: 0,
            sessions: 0,
            conversions: 0,
            conversion_rate: 0,
            bounceRate: 0,
            daily: [],
            status: 'success'
        };

        if (response.rows && response.rows.length > 0) {
            response.rows.forEach(row => {
                const rowSessions = parseInt(row.metricValues[0].value) || 0;
                const rowConvs = parseInt(row.metricValues[2].value) || parseInt(row.metricValues[4].value) || 0;

                metrics.sessions += rowSessions;
                metrics.conversions += rowConvs;
                metrics.bounceRate += parseFloat(row.metricValues[3].value) || 0;

                const dateStr = row.dimensionValues[0].value; // YYYYMMDD
                const formattedDate = `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}`;

                metrics.daily.push({
                    date: formattedDate,
                    googleSpend: 0, // GA4 Property API doesn't include Ads Spend by default
                    googleConversions: rowConvs
                });
            });

            // Average bounce rate across days (simplification)
            metrics.bounceRate = (metrics.bounceRate / response.rows.length) * 100;
            metrics.conversion_rate = metrics.sessions > 0 ? (metrics.conversions / metrics.sessions) * 100 : 0;
        }

        res.json(metrics);
    } catch (err) {
        console.error('Error fetching GA metrics:', err);
        res.status(500).json({ error: `Google API Error: ${err.message}` });
    }
});

export default router;

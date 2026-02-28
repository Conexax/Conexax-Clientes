import { createClient } from '@supabase/supabase-js';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

// Vercel Serverless Function - Google Analytics GA4 metrics
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Supabase environment variables not configured on Vercel.' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { tenantId, startDate, endDate } = req.query;

        if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

        const { data: tenant, error } = await supabase
            .from('tenants')
            .select('ga4_measurement_id, ga_credentials')
            .eq('id', tenantId)
            .single();

        if (error || !tenant) {
            return res.status(404).json({ error: 'Tenant not found.' });
        }

        let propertyId = tenant.ga4_measurement_id;
        if (!propertyId || !tenant.ga_credentials) {
            return res.status(400).json({ error: 'Google Analytics integration not fully configured for this tenant.', data: null });
        }

        propertyId = propertyId.replace(/\D/g, '');
        if (!propertyId) {
            return res.status(400).json({ error: 'Property ID inválido. Deve ser apenas números.' });
        }

        let credentialsParsed;
        try {
            credentialsParsed = typeof tenant.ga_credentials === 'string'
                ? JSON.parse(tenant.ga_credentials)
                : tenant.ga_credentials;
        } catch (e) {
            return res.status(400).json({ error: 'Invalid Google Credentials JSON format.' });
        }

        const analyticsDataClient = new BetaAnalyticsDataClient({ credentials: credentialsParsed });

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

                const dateStr = row.dimensionValues[0].value;
                metrics.daily.push({
                    date: `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}`,
                    googleSpend: 0,
                    googleConversions: rowConvs
                });
            });

            metrics.bounceRate = (metrics.bounceRate / response.rows.length) * 100;
            metrics.conversion_rate = metrics.sessions > 0 ? (metrics.conversions / metrics.sessions) * 100 : 0;
        }

        return res.status(200).json(metrics);

    } catch (err) {
        console.error('Error fetching GA metrics:', err);
        return res.status(500).json({ error: `Google API Error: ${err.message}` });
    }
}

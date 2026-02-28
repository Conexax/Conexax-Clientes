import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function - replaces server/routes/analytics.js for production
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
            .select('meta_access_token, meta_ad_account_id')
            .eq('id', tenantId)
            .single();

        if (error || !tenant) {
            console.error('[Meta Analytics] Tenant not found:', error?.message);
            return res.status(404).json({ error: 'Tenant not found.' });
        }

        if (!tenant.meta_ad_account_id || !tenant.meta_access_token) {
            return res.status(400).json({ error: 'Meta Ads integration not fully configured for this tenant.', data: null });
        }

        let metaData = { spend: 0, conversions: 0, roas: 0, cpc: 0, cpm: 0, ctr: 0, clicks: 0, cpa: 0, daily: [] };

        const adAccountId = tenant.meta_ad_account_id.startsWith('act_')
            ? tenant.meta_ad_account_id
            : `act_${tenant.meta_ad_account_id}`;

        const fields = 'spend,clicks,cpc,cpm,ctr,actions,action_values,impressions';
        const timeRange = encodeURIComponent(JSON.stringify({ since: startDate, until: endDate }));
        const fbUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?time_range=${timeRange}&fields=${fields}&time_increment=1&access_token=${tenant.meta_access_token}`;

        const response = await fetch(fbUrl);
        const json = await response.json();

        if (json.error) {
            console.error('[Meta Analytics] Graph API error:', JSON.stringify(json.error));
            return res.status(400).json({ error: `Meta API Error: ${json.error.message}`, status: 'error' });
        }

        if (json.data && json.data.length > 0) {
            json.data.forEach(insights => {
                const dSpend = parseFloat(insights.spend || 0);
                const dClicks = parseInt(insights.clicks || 0);
                const purchases = (insights.actions || []).find(a =>
                    a.action_type === 'purchase' || a.action_type === 'omni_purchase'
                );
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
                    const val = (insights.action_values || []).find(a =>
                        a.action_type === 'purchase' || a.action_type === 'omni_purchase'
                    );
                    return acc + parseFloat(val?.value || 0);
                }, 0);

                const totalImpressions = json.data.reduce((acc, i) => acc + parseInt(i.impressions || 0), 0);

                metaData.roas = Number((totalPurchaseValue / metaData.spend).toFixed(2));
                metaData.cpa = metaData.conversions > 0 ? Number((metaData.spend / metaData.conversions).toFixed(2)) : 0;
                metaData.cpc = metaData.clicks > 0 ? Number((metaData.spend / metaData.clicks).toFixed(2)) : 0;
                metaData.cpm = totalImpressions > 0 ? Number((metaData.spend / (totalImpressions / 1000)).toFixed(2)) : 0;
                metaData.ctr = json.data.reduce((acc, i) => acc + parseFloat(i.ctr || 0), 0) / json.data.length;
            }
        }

        return res.status(200).json({ ...metaData, status: 'success' });

    } catch (err) {
        console.error('Error fetching Meta Ads metrics:', err);
        return res.status(500).json({ error: err.message });
    }
}

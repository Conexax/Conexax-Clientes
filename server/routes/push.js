
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { ReportService } from '../services/reportService.js';
import { PushReporter } from '../services/pushReporter.js';
import { sendPushNotification } from '../services/notificationService.js';

const router = express.Router();
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

// GET /api/push/settings?tenantId=...
router.get('/settings', async (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

    const { data, error } = await supabase.from('push_settings').select('*').eq('tenant_id', tenantId).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    // Return defaults if not exists
    res.json(data || {
        tenant_id: tenantId,
        enabled: false,
        send_time: '08:00',
        timezone: 'America/Sao_Paulo',
        scope: 'today',
        meta_roas: 0,
        meta_margem: 0,
        max_cpa: 0,
        fixed_costs: 0,
        variable_costs_pct: 0,
        template_id: 'default'
    });
});

// POST /api/push/subscribe
router.post('/subscribe', async (req, res) => {
    const { userId, subscription } = req.body;
    if (!userId || !subscription) return res.status(400).json({ error: 'Missing userId or subscription' });

    const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
    }, { onConflict: 'user_id, endpoint' });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// PUT /api/push/settings
router.post('/settings', async (req, res) => {
    const config = req.body;
    if (!config.tenant_id) return res.status(400).json({ error: 'Tenant ID required' });

    const { data, error } = await supabase.from('push_settings').upsert(config).select().single();
    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
});

// POST /api/push/preview
router.post('/preview', async (req, res) => {
    const { tenantId, scope } = req.body;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

    try {
        const now = new Date();
        let startDate, endDate, dateLabel;

        if (scope === 'yesterday') {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
            endDate = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();
            dateLabel = 'Ontem';
        } else {
            startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
            endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString();
            dateLabel = 'Hoje';
        }

        const stats = await ReportService.getPerformanceStats(tenantId, startDate, endDate);

        // Fetch tenant name
        const { data: tenant } = await supabase.from('tenants').select('name').eq('id', tenantId).single();
        const tenantName = tenant?.name || 'Lojista';

        const copy = PushReporter.generateCopy(stats, dateLabel, tenantName, false);

        res.json({ stats, copy });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/push/send-test
router.post('/send-test', async (req, res) => {
    const { tenantId, userId, scope } = req.body;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

    try {
        const now = new Date();
        let startDate, endDate, dateLabel;

        if (scope === 'yesterday') {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
            endDate = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();
            dateLabel = 'Ontem (Teste)';
        } else {
            startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
            endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString();
            dateLabel = 'Hoje (Teste)';
        }

        const stats = await ReportService.getPerformanceStats(tenantId, startDate, endDate);

        // Fetch tenant name
        const { data: tenant } = await supabase.from('tenants').select('name').eq('id', tenantId).single();
        const tenantName = tenant?.name || 'Lojista';

        // Send to specific user or all admins if not provided
        let targetUsers = [];
        if (userId) {
            const { data: user } = await supabase.from('users').select('id, role').eq('id', userId).single();
            if (user) targetUsers = [user];
        } else {
            const { data: users } = await supabase.from('users').select('id, role').eq('tenant_id', tenantId);
            targetUsers = users || [];
        }

        let success = 0;
        let lastMessage = '';
        for (const user of targetUsers) {
            const isAdmin = user.role === 'CONEXX_ADMIN';
            const copy = PushReporter.generateCopy(stats, dateLabel, tenantName, isAdmin);
            await sendPushNotification(user.id, 'Teste de Notificação', copy);
            success++;
            lastMessage = copy;
        }

        res.json({ success: true, deliveredCount: success, message: lastMessage });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/push/logs?tenantId=...
router.get('/logs', async (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

    const { data, error } = await supabase.from('push_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

export default router;

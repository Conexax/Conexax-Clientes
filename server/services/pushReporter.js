
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { ReportService } from './reportService.js';
import { sendPushNotification } from './notificationService.js';

dotenv.config({ path: '.env.server' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const PushReporter = {
    /**
     * Main job loop: Checks all tenants and sends reports if time matches.
     */
    async checkAndSendReports() {
        console.log('[PushReporter] Checking for scheduled reports...');
        const { data: configs, error } = await supabase.from('push_settings').select('*').eq('enabled', true);
        if (error) {
            console.error('[PushReporter] Error fetching configs:', error.message);
            return;
        }

        for (const config of configs) {
            try {
                if (this.shouldSendNow(config)) {
                    await this.generateAndSendReport(config);
                }
            } catch (err) {
                console.error(`[PushReporter] Failed for tenant ${config.tenant_id}:`, err.message);
            }
        }
    },

    shouldSendNow(config) {
        // Simple logic: Compare current HH:mm in tenant's timezone with config.send_time
        const now = new Date();
        const tenantTime = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: config.timezone || 'America/Sao_Paulo'
        }).format(now);

        // Strip seconds if present in config.send_time (usually HH:mm)
        const targetTime = config.send_time.substring(0, 5);

        // This runs every minute, so exact HH:mm match is what we want.
        // We might want to prevent double-sending within the same minute if the job runs multiple times.
        return tenantTime === targetTime;
    },

    async generateAndSendReport(config) {
        console.log(`[PushReporter] Generating report for tenant ${config.tenant_id}...`);

        const now = new Date();
        let startDate, endDate, dateLabel;

        if (config.scope === 'yesterday') {
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

        const stats = await ReportService.getPerformanceStats(config.tenant_id, startDate, endDate);

        // Fetch tenant name
        const { data: tenant } = await supabase.from('tenants').select('name').eq('id', config.tenant_id).single();
        const tenantName = tenant?.name || 'Lojista';

        const lojistaCopy = this.generateCopy(stats, dateLabel, tenantName, false);
        const adminCopy = this.generateCopy(stats, dateLabel, tenantName, true);

        // Fetch lojista users
        const { data: users } = await supabase.from('users').select('id, role').eq('tenant_id', config.tenant_id);

        // Fetch global admins (CONEXX_ADMIN)
        const { data: globalAdmins } = await supabase.from('users').select('id, role').eq('role', 'CONEXX_ADMIN');

        let successCount = 0;
        let errorMsg = null;

        const allUsersToSend = [
            ...(users || []).map(u => ({ ...u, copy: lojistaCopy })),
            ...(globalAdmins || []).map(u => ({ ...u, copy: adminCopy }))
        ];

        if (allUsersToSend.length > 0) {
            for (const user of allUsersToSend) {
                try {
                    await sendPushNotification(user.id, 'Relatório Performance', user.copy);
                    successCount++;
                } catch (err) {
                    errorMsg = err.message;
                    console.warn(`[PushReporter] Push failed for user ${user.id}`, err.message);
                }
            }
        }

        // Log the event
        await supabase.from('push_logs').insert({
            tenant_id: config.tenant_id,
            date_ref: startDate.split('T')[0],
            payload: { stats, message: lojistaCopy },
            status: successCount > 0 ? 'success' : 'error',
            error_message: errorMsg
        });

        console.log(`[PushReporter] Report sent for tenant ${config.tenant_id} (Scope: ${config.scope}). Recipients: ${successCount}`);
    },

    generateCopy(stats, dateLabel, tenantName, isAdmin = false) {
        const { revenue, ads, lucro, roas, orderCount, margem } = stats;
        const fmt = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        if (isAdmin) {
            const icon = lucro >= 0 ? '💰' : '📉';
            return `Relatório ${dateLabel}: Seu cliente ${tenantName} vendeu ${fmt(revenue)} com ${orderCount} pedidos. Lucro: ${fmt(lucro)}. ${icon}`;
        }

        // 1. Zero Sales & Ads Spend Alert
        if (orderCount === 0 && ads > 0) {
            return `${dateLabel}: 0 vendas e ${fmt(ads)} em ads. Ajuste campanhas para evitar prejuízo. ⚠️`;
        }

        // 2. High Loss Alert
        if (lucro < -50) {
            return `${dateLabel}: Alerta de Prejuízo! ${fmt(lucro)}. Receita: ${fmt(revenue)}. Ads: ${fmt(ads)}. Analise urgente! 📉`;
        }

        // 3. Low Performance / Goals Check
        if (stats.goals.roas > 0 && roas < stats.goals.roas) {
            return `${dateLabel}: ROAS ${roas.toFixed(2)} abaixo da meta ${stats.goals.roas}. Receita: ${fmt(revenue)}. Otimize seus anúncios. 💡`;
        }

        // 4. Standard Positive Report
        const roasText = ads > 0 ? ` | ROAS: ${roas.toFixed(2)}` : '';
        const icon = lucro > 100 ? '🚀' : '💰';
        return `${dateLabel}: Lucro de ${fmt(lucro)}. Receita: ${fmt(revenue)}. Ads: ${fmt(ads)}${roasText}. ${icon}`;
    }
};

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[NotificationService] Missing Supabase configuration.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(
        'mailto:admin@conexx.com',
        VAPID_PUBLIC,
        VAPID_PRIVATE
    );
} else {
    console.warn('[NotificationService] Missing VAPID Keys. Push notifications disabled.');
}

export async function createNotification(userId, type, title, message, action = null) {
    try {
        const { data: notif, error } = await supabase.from('notifications').insert({
            user_id: userId,
            type,
            title,
            message,
            action_label: action?.label,
            action_link: action?.link,
            read: false
        }).select().single();

        if (error) console.error('[NotificationService] DB Insert Error', error.message);

        // Attempt Push
        if (userId && VAPID_PUBLIC) {
            // Fire and forget push to avoid blocking
            sendPushNotification(userId, title, message, action).catch(e => console.error('[Push] Async error', e));
        }

        return notif;
    } catch (e) {
        console.error('[NotificationService] Create Error', e);
    }
}

export async function sendPushNotification(userId, title, body, action) {
    try {
        console.log(`[Push] Attempting to find subscriptions for user: ${userId}`);
        const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId);

        if (!subs || subs.length === 0) {
            console.warn(`[Push] No active subscriptions found for user: ${userId}. Ensure they authorized notifications in the browser.`);
            return;
        }

        console.log(`[Push] Found ${subs.length} subscription(s) for user: ${userId}. Sending...`);

        const payload = JSON.stringify({
            title,
            body,
            action,
            icon: '/logo-conexx.png',
            badge: '/logo-conexx.png'
        });

        const promises = subs.map(async (sub) => {
            try {
                const pushConfig = {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                };
                await webpush.sendNotification(pushConfig, payload);
            } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                } else {
                    console.warn(`[NotificationService] Push failed for sub ${sub.id}`, err.message);
                }
            }
        });

        await Promise.all(promises);
    } catch (e) {
        console.error('[NotificationService] Push global error', e);
    }
}

/**
 * Sends a notification based on a system event.
 * @param {string} eventType - SALE, NEW_TENANT, BILL_PAID, BILL_DUE, INTEGRATION
 * @param {object} data - Event specific data
 */
export async function notifyEvent(eventType, data) {
    console.log(`[EventNotification] Triggered: ${eventType}`, data);

    try {
        if (eventType === 'SALE') {
            const { tenantId, value, productName, clientName } = data;
            // 1. Find the owner/manager of the tenant
            const { data: users } = await supabase.from('users')
                .select('id')
                .eq('tenant_id', tenantId)
                .in('role', ['client_admin', 'manager']);

            if (users) {
                const title = "Venda Realizada! 🚀";
                const body = `Venda de R$ ${value.toLocaleString('pt-BR')} do produto ${productName}. Cliente: ${clientName || 'Não identificado'}`;
                for (const u of users) {
                    await createNotification(u.id, 'sale', title, body, { label: 'Ver Pedido', link: '/orders' });
                }
            }
        }

        if (eventType === 'NEW_TENANT' || eventType.startsWith('BILL_')) {
            // Notify all system admins
            const { data: admins } = await supabase.from('users')
                .select('id')
                .eq('role', 'conexx_admin');

            if (admins) {
                let title = "";
                let body = "";
                let link = "/";

                if (eventType === 'NEW_TENANT') {
                    title = "Nova Loja Cadastrada! 🏪";
                    body = `O lojista ${data.name} acaba de entrar no ConexaX.`;
                    link = "/tenants";
                } else if (eventType === 'BILL_PAID') {
                    title = "Pagamento Recebido! 💰";
                    body = `Recebemos R$ ${data.value.toLocaleString('pt-BR')} de ${data.tenantName}.`;
                    link = "/admin/statement";
                } else if (eventType === 'BILL_DUE') {
                    title = "Fatura Vencendo! ⚠️";
                    body = `A fatura de ${data.tenantName} vence hoje (R$ ${data.value}).`;
                    link = "/admin/statement";
                } else if (eventType === 'BILL_CREATED') {
                    title = "Novo Plano Assinado! 📄";
                    body = `${data.tenantName} assinou o plano ${data.planName} (R$ ${data.value}).`;
                    link = "/admin/statement";
                }

                for (const admin of admins) {
                    await createNotification(admin.id, 'system', title, body, { label: 'Ver Detalhes', link });
                }
            }
        }
    } catch (err) {
        console.error(`[EventNotification] Error processing ${eventType}:`, err);
    }
}

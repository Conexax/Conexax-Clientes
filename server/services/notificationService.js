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

async function sendPushNotification(userId, title, body, action) {
    try {
        const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId);
        if (!subs || subs.length === 0) return;

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

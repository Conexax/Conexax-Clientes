
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.server' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase config');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function simulateWebhook() {
    try {
        console.log('--- Simulating Asaas Webhook ---');

        // 1. Find or create a dummy subscription to test against
        const { data: sub, error: subErr } = await supabase
            .from('subscriptions')
            .select('*')
            .limit(1)
            .single();

        if (subErr || !sub) {
            console.log('No subscription found to test with. Creating a dummy one...');
            // You'd need a valid userId here usually. 
            // Let's just try to send a webhook for a made up sub ID and see if it logs.
        }

        const testSubId = sub?.asaas_subscription_id || 'sub_test_123';

        const payload = {
            id: "evt_test_" + Date.now(),
            event: "PAYMENT_CONFIRMED",
            payment: {
                id: "pay_test_" + Date.now(),
                subscription: testSubId,
                value: 99.90,
                billingType: "CREDIT_CARD",
                externalReference: sub?.user_id || "test_user_id"
            }
        };

        console.log('Sending payload to /api/asaas/webhook...');
        const res = await axios.post('http://localhost:4000/api/asaas/webhook', payload);

        console.log('Response:', res.data);

        // 2. Verify if it was logged in webhook_logs
        const { data: log, error: logErr } = await supabase
            .from('webhook_logs')
            .select('*')
            .eq('event_id', payload.id)
            .single();

        if (log) {
            console.log('SUCCESS: Webhook event logged in database.');
        } else {
            console.error('FAILED: Webhook event not found in database.', logErr);
        }

    } catch (err) {
        console.error('Simulation failed:', err.message);
    }
}

simulateWebhook();

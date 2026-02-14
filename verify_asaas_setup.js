import 'dotenv/config'; // Loads .env
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

// Load .env.server explicitly
const envConfig = dotenv.parse(fs.readFileSync('.env.server'));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const ASAAS_Key = process.env.ASAAS_API_KEY;
const ASAAS_URL = process.env.ASAAS_API_URL || 'https://www.asaas.com/api/v3';

console.log('--- Verifying Asaas Integration ---');
console.log('API URL:', ASAAS_URL);
console.log('API Key Present:', !!ASAAS_Key);
if (ASAAS_Key) {
    console.log('API Key Length:', ASAAS_Key.length);
    console.log('API Key Start:', ASAAS_Key.substring(0, 10));
    console.log('API Key End:', ASAAS_Key.substring(ASAAS_Key.length - 10));
    console.log('Is Trimmed:', ASAAS_Key === ASAAS_Key.trim());
}

const client = axios.create({
    baseURL: ASAAS_URL,
    headers: {
        'access_token': ASAAS_Key ? ASAAS_Key.trim() : '',
        'Content-Type': 'application/json'
    }
});

async function checkRecentSubscriptions() {
    try {
        console.log('\nFetching recent subscriptions...');
        const res = await client.get('/subscriptions?limit=5');
        console.log(`Found ${res.data.data.length} recent subscriptions.`);

        for (const sub of res.data.data) {
            console.log(`\nSubscription [${sub.id}] - Status: ${sub.status}`);
            console.log(`  Customer: ${sub.customer}`);
            console.log(`  Value: ${sub.value}, Cycle: ${sub.cycle}`);
            console.log(`  BillingType: ${sub.billingType}`);

            // Check payments for this sub
            const payRes = await client.get(`/subscriptions/${sub.id}/payments`);
            const payments = payRes.data.data;
            console.log(`  > Payments found: ${payments.length}`);

            if (payments.length > 0) {
                payments.forEach(p => {
                    console.log(`    - Payment [${p.id}] Status: ${p.status}`);
                    console.log(`      InvoiceURL: ${p.invoiceUrl}`);
                    console.log(`      BankSlipURL: ${p.bankSlipUrl}`);
                });
            } else {
                console.log('    ! NO PAYMENTS GENERATED YET !');
                // Why?
                if (sub.status === 'ACTIVE' || sub.status === 'PENDING') {
                    console.log('    ? Creating immediate charge manual test...');
                    // Try create a charge manually linked to this sub? No, can't link manual charge to sub easily via simple endpoint
                }
            }
        }

    } catch (error) {
        console.error('Error fetching data:', error.response ? error.response.data : error.message);
    }
}

checkRecentSubscriptions();

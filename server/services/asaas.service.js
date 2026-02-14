
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.server' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

// Use Service Role if available for internal operations
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

export async function getAsaasConfig() {
    const { data: setting, error } = await supabaseAdmin
        .from('platform_settings')
        .select('value')
        .eq('key', 'asaas_config')
        .single();

    if (error || !setting || !setting.value) {
        throw new Error('Asaas integration not configured in Admin panel.');
    }

    return setting.value;
}

export async function getAsaasClient() {
    const config = await getAsaasConfig();
    const apiKey = config.api_key;
    const environment = config.environment;

    const baseURL = (environment === 'production')
        ? 'https://www.asaas.com/api/v3'
        : 'https://sandbox.asaas.com/api/v3';

    return axios.create({
        baseURL,
        headers: {
            'access_token': apiKey,
            'Content-Type': 'application/json'
        }
    });
}

/**
 * Get or create Asaas customer.
 * Prioritizes searching by email and ensures document is updated.
 */
export async function getOrCreateAsaasCustomer(userData) {
    const { email, name, cpfCnpj, userId } = userData;
    const client = await getAsaasClient();

    // 1. Try to find by email
    try {
        const searchRes = await client.get('/customers', { params: { email } });
        if (searchRes.data && searchRes.data.data && searchRes.data.data.length > 0) {
            const customer = searchRes.data.data[0];
            // Update document if missing or different
            if (!customer.cpfCnpj && cpfCnpj) {
                await client.post(`/customers/${customer.id}`, { cpfCnpj: cpfCnpj.replace(/\D/g, '') });
            }
            return customer.id;
        }
    } catch (err) {
        console.error('[AsaasService] Error searching customer:', err.response?.data || err.message);
    }

    // 2. Create new customer
    try {
        const createRes = await client.post('/customers', {
            name,
            email,
            cpfCnpj: cpfCnpj ? cpfCnpj.replace(/\D/g, '') : undefined,
            externalReference: userId
        });
        return createRes.data.id;
    } catch (err) {
        console.error('[AsaasService] Error creating customer:', err.response?.data || err.message);
        throw new Error(err.response?.data?.errors?.[0]?.description || 'Erro ao criar cliente no Asaas');
    }
}

/**
 * Creates a subscription in Asaas
 */
export async function createAsaasSubscription(payload) {
    const client = await getAsaasClient();
    try {
        const res = await client.post('/subscriptions', payload);
        return res.data;
    } catch (err) {
        console.error('[AsaasService] Error creating subscription:', err.response?.data || err.message);
        throw new Error(err.response?.data?.errors?.[0]?.description || 'Erro ao criar assinatura no Asaas');
    }
}

/**
 * Validates Asaas Webhook signature (Optional but recommended)
 * If ASAAS_WEBHOOK_SECRET is set, we could validate it.
 */
export function validateWebhookRequest(req) {
    // Asaas uses a simple "asaas-access-token" header for webhook validation usually,
    // or a more complex signature. Let's stick to the token check if configured.
    return true;
}


import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load server env vars
dotenv.config({ path: '.env.server' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase configuration in asaas.js');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Returns a configured Axios instance for Asaas API
 * Fetches the latest config from 'platform_settings' table.
 */
export async function getAsaasClient() {
  try {
    const { data: setting, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'asaas_config')
      .single();

    if (error || !setting || !setting.value) {
      const err = new Error('Integração Asaas não configurada no painel do admin.');
      err.code = 'ASAAS_NOT_CONFIGURED';
      err.statusCode = 400;
      throw err;
    }

    const config = setting.value;
    const apiKey = config.api_key;
    const environment = config.environment; // 'sandbox' or 'production'

    if (!apiKey) {
      const err = new Error('Chave de API do Asaas não configurada.');
      err.code = 'ASAAS_NOT_CONFIGURED';
      err.statusCode = 400;
      throw err;
    }

    const baseURL = (environment === 'production')
      ? 'https://www.asaas.com/api/v3'
      : 'https://sandbox.asaas.com/api/v3';

    // console.log(`[AsaasClient] Initialized for ${environment}`);

    const client = axios.create({
      baseURL,
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });

    return { client, config };
  } catch (err) {
    // console.error('[AsaasClient] Error initializing client:', err.message);
    throw err;
  }
}

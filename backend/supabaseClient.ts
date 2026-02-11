
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

console.log('Initializing Supabase...', { url: supabaseUrl, keyExists: !!supabaseKey });

let supabaseInstance;

try {
  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    throw new Error('Invalid Supabase URL');
  }
  supabaseInstance = createClient(supabaseUrl, supabaseKey || '');
} catch (error) {
  console.warn('Supabase client failed to initialize (likely missing .env config):', error);

  // Create a dummy proxy to prevent app crash on import, but fail on usage
  supabaseInstance = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: null,
            error: { message: 'Supabase não configurado. Verifique o arquivo .env.local e as credenciais.' }
          })
        })
      })
    })
  } as any;
}

export const supabase = supabaseInstance;


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.server' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE || SUPABASE_KEY);

/**
 * Middleware to check if the user has an active subscription.
 */
export const requireSubscription = async (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.query.userId;

    if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
    }

    try {
        const { data: subscription, error } = await supabaseAdmin
            .from('subscriptions')
            .select('status')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();

        if (error || !subscription) {
            return res.status(403).json({
                error: 'Subscription required',
                code: 'SUBSCRIPTION_REQUIRED',
                message: 'Você precisa de uma assinatura ativa para acessar este recurso.'
            });
        }

        next();
    } catch (err) {
        next(err);
    }
};

import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.35.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const { user_id } = await req.json();
        if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });

        // Verify user exists
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("id", user_id)
            .single();

        if (userError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

        // 1. Get Subscription Status from DB
        const { data: subscription, error: subError } = await supabase
            .from("subscriptions")
            .select(`
                *,
                plans (*)
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        // 2. Get Payments history
        const { data: payments } = await supabase
            .from("payments")
            .select("*")
            .eq("user_id", user.id)
            .order("due_date", { ascending: false })
            .limit(10);

        if (subError) return new Response(JSON.stringify({ error: "DB error", detail: subError }), { status: 500, headers: corsHeaders });

        return new Response(JSON.stringify({
            subscription: subscription ? { ...subscription, payments } : null
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders,
        });
    }
});

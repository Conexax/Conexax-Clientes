import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.35.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Configuration will be fetched from DB dynamically
async function getAsaasConfig(supabase: any) {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "asaas_config")
    .single();

  if (error || !data) {
    throw new Error("Asaas integration not configured in platform settings.");
  }

  const config = data.value;
  const apiUrl = config.environment === "production"
    ? "https://www.asaas.com/api/v3"
    : "https://sandbox.asaas.com/api/v3";

  return { apiKey: config.api_key, apiUrl };
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { subscription_id, user_id } = await req.json();
    if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });
    if (!subscription_id) return new Response(JSON.stringify({ error: "subscription_id required" }), { status: 400, headers: corsHeaders });

    // Fetch Asaas Config
    const { apiKey, apiUrl } = await getAsaasConfig(supabase);

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", user_id)
      .single();

    if (userError || !user) return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });

    // 1. Get Subscription Details
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("asaas_subscription_id")
      .eq("id", subscription_id)
      .eq("user_id", user.id)
      .single();

    if (subError || !sub) return new Response(JSON.stringify({ error: "Subscription not found" }), { status: 404, headers: corsHeaders });

    // 2. Cancel in Asaas
    const asaasResp = await fetch(`${apiUrl}/subscriptions/${sub.asaas_subscription_id}`, {
      method: "DELETE",
      headers: {
        "access_token": apiKey,
      },
    });

    const asaasData = await asaasResp.json();
    if (!asaasResp.ok && asaasResp.status !== 404) {
      return new Response(JSON.stringify({ error: "Asaas subscription cancellation failed", detail: asaasData }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 3. Update in Supabase
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("id", subscription_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update subscription status in DB", detail: updateError }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ message: "Subscription canceled successfully" }), {
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

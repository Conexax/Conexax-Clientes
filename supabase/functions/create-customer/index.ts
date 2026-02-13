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
    const { user_id } = await req.json();
    if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });

    // Fetch Asaas Config
    const { apiKey, apiUrl } = await getAsaasConfig(supabase);

    // Verify user exists in custom users table
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user_id)
      .single();

    if (userError || !user) return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });

    // 1. Check if user already has an Asaas customer id
    const { data: mapping } = await supabase
      .from("asaas_customers")
      .select("asaas_customer_id")
      .eq("user_id", user.id)
      .single();

    if (mapping) {
      return new Response(JSON.stringify({ asaas_customer_id: mapping.asaas_customer_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Create in Asaas
    const asaasResp = await fetch(`${apiUrl}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": apiKey,
      },
      body: JSON.stringify({
        name: user.name || user.email,
        email: user.email,
        externalReference: user.id,
      }),
    });

    const asaasData = await asaasResp.json();
    if (!asaasResp.ok) {
      return new Response(JSON.stringify({ error: "Asaas customer creation failed", detail: asaasData }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const asaasCustomerId = asaasData.id;

    // 3. Save mapping
    const { error: insertError } = await supabase
      .from("asaas_customers")
      .insert({ user_id: user.id, asaas_customer_id: asaasCustomerId });

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to save customer mapping", detail: insertError }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ asaas_customer_id: asaasCustomerId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

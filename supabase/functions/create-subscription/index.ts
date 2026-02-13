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
    const { plan_id, billing_cycle, user_id } = await req.json();
    if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });
    if (!plan_id) return new Response(JSON.stringify({ error: "plan_id required" }), { status: 400, headers: corsHeaders });

    // Fetch Asaas Config
    const { apiKey, apiUrl } = await getAsaasConfig(supabase);

    // Verify user exists in custom users table
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user_id)
      .single();

    if (userError || !user) return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });

    // Map frontend cycle to Asaas cycle
    const cycleMap: Record<string, string> = {
      'quarterly': 'QUARTERLY',
      'semiannual': 'SEMIANNUAL',
      'yearly': 'YEARLY',
      'monthly': 'MONTHLY'
    };
    const asaasCycle = cycleMap[billing_cycle] || "MONTHLY";

    // 1. Get Plan Details
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404, headers: corsHeaders });

    // 2. Get Asaas Customer
    const { data: mapping } = await supabase
      .from("asaas_customers")
      .select("asaas_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!mapping) return new Response(JSON.stringify({ error: "Customer not registered in Asaas. Call create-customer first." }), { status: 400, headers: corsHeaders });

    const asaasCustomerId = mapping.asaas_customer_id;

    // 3. Determine price based on cycle
    const priceMap: Record<string, number> = {
      'QUARTERLY': plan.price_quarterly,
      'SEMIANNUAL': plan.price_semiannual,
      'YEARLY': plan.price_yearly,
      'MONTHLY': plan.price_monthly || plan.price // Fallback if no monthly specified
    };
    const finalPrice = priceMap[asaasCycle] || 0;

    // 4. Idempotency Check: Already has active subscription for this plan?
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("plan_id", plan_id)
      .eq("status", "active")
      .maybeSingle();

    if (existingSub) {
      return new Response(JSON.stringify({ subscription: existingSub, message: "Subscription already active" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 5. Create Subscription in Asaas
    const asaasResp = await fetch(`${apiUrl}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": apiKey,
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "UNDEFINED",
        value: finalPrice,
        nextDueDate: new Date().toISOString().split("T")[0],
        cycle: asaasCycle,
        description: `Assinatura: ${plan.name} (${asaasCycle})`,
        externalReference: user.id,
      }),
    });

    const asaasData = await asaasResp.json();
    if (!asaasResp.ok) {
      return new Response(JSON.stringify({ error: "Asaas subscription creation failed", detail: asaasData }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 5. Store in Supabase
    const { data: newSub, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        asaas_subscription_id: asaasData.id,
        status: "pending", // Will be updated to active via webhook on payment
        value: finalPrice,
        cycle: asaasCycle,
        next_due_date: asaasData.nextDueDate,
      })
      .select()
      .single();

    if (subError) {
      return new Response(JSON.stringify({ error: "Failed to save subscription in DB", detail: subError }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // 6. Get the first payment of this subscription to provide a checkout link
    let paymentUrl = "";
    try {
      const paymentsResp = await fetch(`${apiUrl}/payments?subscription=${asaasData.id}&limit=1`, {
        headers: { "access_token": apiKey },
      });
      const paymentsData = await paymentsResp.json();
      if (paymentsData.data && paymentsData.data.length > 0) {
        paymentUrl = paymentsData.data[0].invoiceUrl;
      }
    } catch (e) {
      console.error("Error fetching payment URL:", e);
    }

    // 7. Sync with Tenants table (Pending State)
    try {
      const { data: userData } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
      if (userData?.tenant_id) {
        await supabase.from("tenants").update({
          pending_plan_id: plan.id,
          pending_billing_cycle: billing_cycle,
          pending_payment_url: paymentUrl,
        }).eq("id", userData.tenant_id);
      }
    } catch (e) {
      console.error("Error updating tenant pending state:", e);
    }

    return new Response(JSON.stringify({
      subscription: newSub,
      asaas_data: asaasData,
      paymentUrl: paymentUrl
    }), {
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

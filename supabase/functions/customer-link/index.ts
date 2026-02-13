import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.35.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_KEY")!;
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_API_URL = Deno.env.get("ASAAS_API_URL") || "https://sandbox.asaas.com/api/v3";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "Missing token" }), { status: 401 });
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes?.user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    const user = userRes.user;

    // Find mapping
    const { data: mapping } = await supabase.from("asaas_customers").select("*").eq("user_id", user.id).single();
    if (!mapping) return new Response(JSON.stringify({ error: "no_customer" }), { status: 400 });

    // Create a one-off payment link for immediate payment if needed
    const body = await req.json().catch(() => ({}));
    const amount = body.amount;
    if (!amount) return new Response(JSON.stringify({ error: "amount required" }), { status: 400 });

    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const payResp = await fetch(`${ASAAS_API_URL}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": ASAAS_API_KEY },
      body: JSON.stringify({
        customer: mapping.asaas_customer_id,
        billingType: "UNDEFINED",
        value: amount,
        dueDate,
        description: `One-off charge`,
        externalReference: user.id
      })
    });
    if (!payResp.ok) {
      const txt = await payResp.text().catch(() => "");
      return new Response(JSON.stringify({ error: "Asaas payment create failed", detail: txt }), { status: 502 });
    }
    const pay = await payResp.json();

    // Persist payment record (service role)
    await supabase.from("payments").insert({
      user_id: user.id,
      subscription_id: null,
      asaas_payment_id: pay.id,
      status: pay.status || "pending",
      value: amount,
      due_date: dueDate
    });

    return new Response(JSON.stringify({ invoiceUrl: pay.invoiceUrl, paymentId: pay.id }), { status: 200 });
  } catch (err) {
    console.error("customer-link error", err);
    return new Response(JSON.stringify({ error: "internal" }), { status: 500 });
  }
});


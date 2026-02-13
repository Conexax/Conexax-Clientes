import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.35.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const payload = await req.json();
    const eventId = payload.event + "_" + (payload.data?.id || Date.now());

    // 1. Idempotency Check & Logging
    const { data: existingEvent } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existingEvent) {
      return new Response(JSON.stringify({ message: "Event already processed" }), { status: 200 });
    }

    const { data: logEntry, error: logError } = await supabase
      .from("webhook_events")
      .insert({
        provider: "asaas",
        event_id: eventId,
        type: payload.event,
        payload_json: payload,
        status: "received",
      })
      .select()
      .single();

    if (logError) throw new Error(`Log failed: ${logError.message}`);

    // 2. Process Event
    const eventType = payload.event;
    const data = payload.data;

    try {
      if (eventType.startsWith("PAYMENT_")) {
        await handlePaymentEvent(data, eventType);
      } else if (eventType.startsWith("SUBSCRIPTION_")) {
        await handleSubscriptionEvent(data, eventType);
      }

      // Mark processed
      await supabase
        .from("webhook_events")
        .update({ status: "processed", processed_at: new Date().toISOString() })
        .eq("id", logEntry.id);

    } catch (procError) {
      await supabase
        .from("webhook_events")
        .update({ status: "error", error: procError.message })
        .eq("id", logEntry.id);
      throw procError;
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Webhook processing error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

async function handlePaymentEvent(payment: any, type: string) {
  const statusMapping: Record<string, string> = {
    "PAYMENT_CONFIRMED": "paid",
    "PAYMENT_RECEIVED": "paid",
    "PAYMENT_OVERDUE": "overdue",
    "PAYMENT_DELETED": "failed",
    "PAYMENT_REFUNDED": "refunded",
  };

  const status = statusMapping[type] || "pending";

  // Upsert Payment
  await supabase.from("payments").upsert({
    user_id: payment.externalReference, // We passed this during creation
    asaas_payment_id: payment.id,
    subscription_id: null, // Optional: find by asaas_subscription_id if needed
    status: status,
    value: payment.value,
    due_date: payment.dueDate,
    paid_at: (status === "paid") ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "asaas_payment_id" });
}

async function handleSubscriptionEvent(sub: any, type: string) {
  const statusMapping: Record<string, string> = {
    "SUBSCRIPTION_CREATED": "active",
    "SUBSCRIPTION_UPDATED": "active",
    "SUBSCRIPTION_DELETED": "canceled",
  };

  const status = statusMapping[type] || "pending";

  // 1. Update Subscriptions table
  const { data: updatedSub, error: subErr } = await supabase.from("subscriptions").update({
    status: status,
    next_due_date: sub.nextDueDate,
    updated_at: new Date().toISOString(),
  }).eq("asaas_subscription_id", sub.id).select().single();

  if (subErr) throw subErr;

  // 2. Sync with Tenants table
  if (updatedSub) {
    // Find tenant by user_id mapping
    const { data: user } = await supabase.from("users").select("tenant_id").eq("id", updatedSub.user_id).single();

    if (user?.tenant_id) {
      const cycleMap: Record<string, string> = {
        'QUARTERLY': 'quarterly',
        'SEMIANNUAL': 'semiannual',
        'YEARLY': 'yearly',
        'MONTHLY': 'monthly'
      };

      await supabase.from("tenants").update({
        plan_id: updatedSub.plan_id,
        billing_cycle: cycleMap[updatedSub.cycle] || 'quarterly',
        next_billing: updatedSub.next_due_date,
        subscription_status: status === 'active' ? 'active' : status === 'canceled' ? 'canceled' : 'past_due',
        pending_plan_id: null,
        pending_billing_cycle: null,
        pending_payment_url: null
      }).eq("id", user.tenant_id);
    }
  }
}

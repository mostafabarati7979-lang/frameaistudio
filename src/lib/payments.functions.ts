// Manual bank-transfer payment flow: customer submits receipt info, admin approves/rejects.
// Amounts are integer Toman. Deposit/final are the two allowed kinds; only one approved
// per kind per order (enforced by a partial unique index).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("دسترسی مجاز نیست.");
}

const submitSchema = z.object({
  order_id: z.string().uuid(),
  kind: z.enum(["deposit", "final"]),
  amount_toman: z.number().int().min(1_000).max(999_999_999_999),
  reference_no: z.string().trim().min(2).max(80),
  paid_at: z.string().datetime().nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

// ---------- Customer: submit a pending payment receipt ----------
export const submitPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Server-side gate: order must belong to caller, contract must be approved,
    // approved quote must exist, and this kind must not already be approved/pending.
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, customer_id, status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order || order.customer_id !== context.userId) {
      throw new Error("سفارش یافت نشد.");
    }

    const { data: contract } = await context.supabase
      .from("contracts")
      .select("id")
      .eq("order_id", data.order_id)
      .eq("status", "approved")
      .maybeSingle();
    if (!contract) throw new Error("ابتدا باید قرارداد تأیید شود.");

    const { data: quote } = await context.supabase
      .from("quotes")
      .select("id, total_toman, deposit_toman")
      .eq("order_id", data.order_id)
      .eq("status", "approved")
      .maybeSingle();
    if (!quote) throw new Error("پیش‌فاکتور تأییدشده‌ای یافت نشد.");

    // Prevent duplicate submissions per kind.
    const { data: existing } = await context.supabase
      .from("payments")
      .select("id, status")
      .eq("order_id", data.order_id)
      .eq("kind", data.kind)
      .in("status", ["pending", "approved"]);
    if (existing && existing.length > 0) {
      throw new Error(
        data.kind === "deposit"
          ? "پیش‌پرداخت قبلاً ثبت شده است."
          : "پرداخت نهایی قبلاً ثبت شده است.",
      );
    }

    // For final payment, deposit must already be approved.
    if (data.kind === "final") {
      const { data: deposit } = await context.supabase
        .from("payments")
        .select("id")
        .eq("order_id", data.order_id)
        .eq("kind", "deposit")
        .eq("status", "approved")
        .maybeSingle();
      if (!deposit) throw new Error("ابتدا پیش‌پرداخت باید تأیید شود.");
    }

    const { data: row, error } = await context.supabase
      .from("payments")
      .insert({
        order_id: data.order_id,
        customer_id: context.userId,
        kind: data.kind,
        amount_toman: data.amount_toman,
        reference_no: data.reference_no,
        paid_at: data.paid_at ?? null,
        note: data.note ?? null,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !row) throw new Error("ثبت پرداخت ناموفق بود.");

    // Move order to payment_pending when it is still contract_approved.
    if (order.status === "contract_approved") {
      await context.supabase
        .from("orders")
        .update({ status: "payment_pending" })
        .eq("id", order.id);
    }

    return { id: row.id };
  });

// ---------- Customer/Admin: list payments for an order ----------
export const listOrderPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ order_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("payments")
      .select("*")
      .eq("order_id", data.order_id)
      .order("created_at", { ascending: false });
    return rows ?? [];
  });

// ---------- Customer: cancel own pending payment ----------
export const cancelPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ payment_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: p } = await context.supabase
      .from("payments")
      .select("id, customer_id, status")
      .eq("id", data.payment_id)
      .maybeSingle();
    if (!p || p.customer_id !== context.userId) throw new Error("پرداخت یافت نشد.");
    if (p.status !== "pending") throw new Error("فقط پرداخت‌های در انتظار قابل لغو هستند.");
    await context.supabase
      .from("payments")
      .update({ status: "cancelled" })
      .eq("id", data.payment_id);
    return { ok: true };
  });

// ---------- Admin: approve payment ----------
export const adminApprovePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        payment_id: z.string().uuid(),
        admin_notes: z.string().trim().max(1000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: p } = await context.supabase
      .from("payments")
      .select("id, order_id, kind, status")
      .eq("id", data.payment_id)
      .maybeSingle();
    if (!p) throw new Error("پرداخت یافت نشد.");
    if (p.status !== "pending") throw new Error("این پرداخت قابل تأیید نیست.");

    const { error } = await context.supabase
      .from("payments")
      .update({
        status: "approved",
        admin_notes: data.admin_notes ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    if (error) {
      // Unique index violation → duplicate approved payment.
      throw new Error("پرداخت تأییدشده دیگری از همین نوع برای این سفارش وجود دارد.");
    }

    // Advance order status.
    if (p.kind === "deposit") {
      await context.supabase
        .from("orders")
        .update({ status: "in_production" })
        .eq("id", p.order_id);
    } else {
      // Final approval — mark completed if project has already delivered final,
      // otherwise leave order state alone (project workflow handles the rest).
      const { data: o } = await context.supabase
        .from("orders")
        .select("status")
        .eq("id", p.order_id)
        .maybeSingle();
      if (o && o.status === "final_delivered") {
        await context.supabase
          .from("orders")
          .update({ status: "completed" })
          .eq("id", p.order_id);
      }
    }
    return { ok: true };
  });

// ---------- Admin: reject payment ----------
export const adminRejectPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        payment_id: z.string().uuid(),
        admin_notes: z.string().trim().min(1).max(1000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: p } = await context.supabase
      .from("payments")
      .select("id, order_id, status")
      .eq("id", data.payment_id)
      .maybeSingle();
    if (!p) throw new Error("پرداخت یافت نشد.");
    if (p.status !== "pending") throw new Error("این پرداخت قابل رد کردن نیست.");
    await context.supabase
      .from("payments")
      .update({
        status: "rejected",
        admin_notes: data.admin_notes,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    return { ok: true };
  });

// ---------- Payment gating info: what customer can pay right now ----------
export const paymentGate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ order_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, customer_id, status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) return { canPay: false, reason: "not_found" as const };
    const isOwner = order.customer_id === context.userId;

    const [{ data: quote }, { data: contract }, { data: pays }] = await Promise.all([
      context.supabase
        .from("quotes")
        .select("id, total_toman, deposit_toman")
        .eq("order_id", data.order_id)
        .eq("status", "approved")
        .maybeSingle(),
      context.supabase
        .from("contracts")
        .select("id")
        .eq("order_id", data.order_id)
        .eq("status", "approved")
        .maybeSingle(),
      context.supabase
        .from("payments")
        .select("kind, status")
        .eq("order_id", data.order_id),
    ]);

    const quoteApproved = Boolean(quote);
    const contractApproved = Boolean(contract);
    const list = (pays as any[]) ?? [];
    const depositApproved = list.some((p) => p.kind === "deposit" && p.status === "approved");
    const depositPending = list.some((p) => p.kind === "deposit" && p.status === "pending");
    const finalApproved = list.some((p) => p.kind === "final" && p.status === "approved");
    const finalPending = list.some((p) => p.kind === "final" && p.status === "pending");

    return {
      isOwner,
      quoteApproved,
      contractApproved,
      canPayDeposit:
        isOwner && quoteApproved && contractApproved && !depositApproved && !depositPending,
      canPayFinal:
        isOwner &&
        quoteApproved &&
        contractApproved &&
        depositApproved &&
        !finalApproved &&
        !finalPending,
      depositApproved,
      finalApproved,
      totalToman: quote?.total_toman ?? null,
      depositToman: quote?.deposit_toman ?? null,
    };
  });

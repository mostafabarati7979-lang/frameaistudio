// Admin-only quote authoring + customer response actions.
// Amounts are integer Toman (bigint on DB); math happens server-side.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("دسترسی مجاز نیست.");
}

const tomanInt = z
  .number()
  .int("مبلغ باید عدد صحیح باشد.")
  .min(0)
  .max(999_999_999_999);

const itemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).nullable().optional(),
  quantity: z.number().int().min(1).max(999),
  unit_price_toman: tomanInt,
});

const createQuoteSchema = z.object({
  order_id: z.string().uuid(),
  items: z.array(itemSchema).min(1).max(30),
  discount_toman: tomanInt.default(0),
  tax_toman: tomanInt.default(0),
  deposit_toman: tomanInt.default(0),
  admin_notes: z.string().trim().max(2000).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
});

import { computeQuoteTotals } from "./quotes-math";
function computeTotals(input: z.infer<typeof createQuoteSchema>) {
  return computeQuoteTotals(input);
}

// ---------- Admin: list all orders (with latest quote info) ----------
export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, order_code, status, service_type, project_title, event_date, city, customer_id, created_at, submitted_at",
      )
      .neq("status", "draft")
      .order("created_at", { ascending: false });
    if (error) throw new Error("دریافت سفارش‌ها ناموفق بود.");
    return data ?? [];
  });

// ---------- Admin: full order + all quotes ----------
export const adminGetOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const [{ data: order }, { data: quotes }, { data: files }, { data: profile }] =
      await Promise.all([
        context.supabase.from("orders").select("*").eq("id", data.id).maybeSingle(),
        context.supabase
          .from("quotes")
          .select("*, quote_items(*)")
          .eq("order_id", data.id)
          .order("version", { ascending: false }),
        context.supabase
          .from("order_files")
          .select("id, file_name, kind, size_bytes, content_type, storage_path, created_at")
          .eq("order_id", data.id),
        // profile of the customer
        (async () => {
          const { data: o } = await context.supabase
            .from("orders")
            .select("customer_id")
            .eq("id", data.id)
            .maybeSingle();
          if (!o) return { data: null };
          return context.supabase
            .from("profiles")
            .select("id, full_name, mobile")
            .eq("id", o.customer_id)
            .maybeSingle();
        })(),
      ]);
    if (!order) return null;
    return { order, quotes: quotes ?? [], files: files ?? [], customer: profile };
  });

// ---------- Admin: create a new quote (draft) ----------
export const adminCreateQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createQuoteSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { subtotal, total } = computeTotals(data);

    // Determine next version.
    const { data: verRow, error: verErr } = await context.supabase.rpc(
      "next_quote_version",
      { _order_id: data.order_id },
    );
    if (verErr) throw new Error("محاسبه شماره نسخه ناموفق بود.");
    const version = verRow as unknown as number;

    // Supersede any previous non-terminal quotes on this order.
    await context.supabase
      .from("quotes")
      .update({ status: "superseded" })
      .eq("order_id", data.order_id)
      .in("status", ["sent", "revision_requested"]);

    const { data: quote, error: qErr } = await context.supabase
      .from("quotes")
      .insert({
        order_id: data.order_id,
        version,
        status: "draft",
        created_by: context.userId,
        admin_notes: data.admin_notes ?? null,
        subtotal_toman: subtotal,
        discount_toman: data.discount_toman,
        tax_toman: data.tax_toman,
        total_toman: total,
        deposit_toman: data.deposit_toman,
        expires_at: data.expires_at ?? null,
      })
      .select("id")
      .single();
    if (qErr || !quote) throw new Error("ایجاد پیش‌فاکتور ناموفق بود.");

    const items = data.items.map((it, idx) => ({
      quote_id: quote.id,
      title: it.title,
      description: it.description ?? null,
      quantity: it.quantity,
      unit_price_toman: it.unit_price_toman,
      amount_toman: it.unit_price_toman * it.quantity,
      sort_order: idx,
    }));
    const { error: itErr } = await context.supabase.from("quote_items").insert(items);
    if (itErr) {
      await context.supabase.from("quotes").delete().eq("id", quote.id);
      throw new Error("افزودن ردیف‌های پیش‌فاکتور ناموفق بود.");
    }
    return { id: quote.id, version, subtotal_toman: subtotal, total_toman: total };
  });

// ---------- Admin: send an existing draft quote ----------
export const adminSendQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ quote_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: quote } = await context.supabase
      .from("quotes")
      .select("id, order_id, status")
      .eq("id", data.quote_id)
      .maybeSingle();
    if (!quote) throw new Error("پیش‌فاکتور یافت نشد.");
    if (quote.status !== "draft") throw new Error("این پیش‌فاکتور قبلاً ارسال شده است.");
    await context.supabase
      .from("quotes")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", quote.id);
    await context.supabase
      .from("orders")
      .update({ status: "quoted" })
      .eq("id", quote.order_id);
    return { ok: true };
  });

// ---------- Admin: delete a draft quote ----------
export const adminDeleteQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ quote_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: quote } = await context.supabase
      .from("quotes")
      .select("status")
      .eq("id", data.quote_id)
      .maybeSingle();
    if (!quote) throw new Error("پیش‌فاکتور یافت نشد.");
    if (quote.status !== "draft") throw new Error("فقط پیش‌نویس‌ها قابل حذف هستند.");
    await context.supabase.from("quotes").delete().eq("id", data.quote_id);
    return { ok: true };
  });

// ---------- Customer: list quotes for one of my orders (sent only) ----------
export const listOrderQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ order_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    // RLS ensures customers only see non-draft quotes on their own orders.
    const { data: rows } = await context.supabase
      .from("quotes")
      .select("*, quote_items(*)")
      .eq("order_id", data.order_id)
      .order("version", { ascending: false });
    return rows ?? [];
  });

// ---------- Customer: approve current sent quote ----------
export const approveQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ quote_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: quote } = await context.supabase
      .from("quotes")
      .select("id, order_id, status, expires_at, orders!inner(customer_id, status)")
      .eq("id", data.quote_id)
      .maybeSingle();
    if (!quote) throw new Error("پیش‌فاکتور یافت نشد.");
    if ((quote as any).orders.customer_id !== context.userId) {
      throw new Error("دسترسی مجاز نیست.");
    }
    if (quote.status !== "sent") throw new Error("این پیش‌فاکتور قابل تأیید نیست.");
    if (quote.expires_at && new Date(quote.expires_at).getTime() < Date.now()) {
      await context.supabase
        .from("quotes")
        .update({ status: "expired" })
        .eq("id", quote.id);
      throw new Error("مهلت این پیش‌فاکتور به پایان رسیده است.");
    }
    const { data: updQ, error: updQErr } = await context.supabase
      .from("quotes")
      .update({ status: "approved", decided_at: new Date().toISOString() })
      .eq("id", quote.id)
      .select("id");
    if (updQErr || !updQ || updQ.length === 0) {
      throw new Error("ثبت تأیید پیش‌فاکتور ناموفق بود.");
    }
    const { data: updO, error: updOErr } = await context.supabase
      .from("orders")
      .update({ status: "contract_pending" })
      .eq("id", quote.order_id)
      .select("id");
    if (updOErr || !updO || updO.length === 0) {
      throw new Error("به‌روزرسانی وضعیت سفارش ناموفق بود.");
    }
    return { ok: true };
  });

// ---------- Customer: reject current sent quote ----------
export const rejectQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        quote_id: z.string().uuid(),
        note: z.string().trim().max(1000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: quote } = await context.supabase
      .from("quotes")
      .select("id, order_id, status, orders!inner(customer_id)")
      .eq("id", data.quote_id)
      .maybeSingle();
    if (!quote) throw new Error("پیش‌فاکتور یافت نشد.");
    if ((quote as any).orders.customer_id !== context.userId) {
      throw new Error("دسترسی مجاز نیست.");
    }
    if (quote.status !== "sent") throw new Error("این پیش‌فاکتور قابل رد کردن نیست.");
    await context.supabase
      .from("quotes")
      .update({
        status: "rejected",
        decided_at: new Date().toISOString(),
        customer_response_note: data.note ?? null,
      })
      .eq("id", quote.id);
    // Order goes back to submitted so admin can re-quote or close.
    await context.supabase
      .from("orders")
      .update({ status: "submitted" })
      .eq("id", quote.order_id);
    return { ok: true };
  });

// ---------- Customer: request a revision of the current sent quote ----------
export const requestQuoteRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        quote_id: z.string().uuid(),
        note: z.string().trim().min(1, "لطفاً توضیح دهید چه چیزی باید تغییر کند.").max(1000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: quote } = await context.supabase
      .from("quotes")
      .select("id, order_id, status, orders!inner(customer_id)")
      .eq("id", data.quote_id)
      .maybeSingle();
    if (!quote) throw new Error("پیش‌فاکتور یافت نشد.");
    if ((quote as any).orders.customer_id !== context.userId) {
      throw new Error("دسترسی مجاز نیست.");
    }
    if (quote.status !== "sent") {
      throw new Error("امکان درخواست بازنگری برای این پیش‌فاکتور وجود ندارد.");
    }
    await context.supabase
      .from("quotes")
      .update({
        status: "revision_requested",
        decided_at: new Date().toISOString(),
        customer_response_note: data.note,
      })
      .eq("id", quote.id);
    // Order stays 'quoted' — admin will issue a new version.
    return { ok: true };
  });

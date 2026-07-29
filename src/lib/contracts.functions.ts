// Admin authors contracts; customer must approve before payment.
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

async function notifyAdmins(params: {
  title: string;
  message: string;
  orderId: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: admins } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  const rows = (admins ?? []).map((a: any) => ({
    user_id: a.user_id,
    type: "contract",
    title: params.title,
    message: params.message,
    link: `/admin/orders/${params.orderId}`,
  }));
  if (rows.length) await supabaseAdmin.from("notifications").insert(rows);
}

const createContractSchema = z.object({
  order_id: z.string().uuid(),
  quote_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(20).max(20000),
  admin_notes: z.string().trim().max(2000).nullable().optional(),
});

// ---------- Admin: create draft contract ----------
export const adminCreateContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createContractSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    // Order must have an approved quote first.
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) throw new Error("سفارش یافت نشد.");
    if (!["contract_pending", "contract_approved", "quoted"].includes(order.status)) {
      throw new Error("ابتدا باید پیش‌فاکتور تأیید شود.");
    }
    const { data: approved } = await context.supabase
      .from("quotes")
      .select("id")
      .eq("order_id", data.order_id)
      .eq("status", "approved")
      .maybeSingle();
    if (!approved) throw new Error("پیش‌فاکتور تأییدشده‌ای برای این سفارش وجود ندارد.");

    const { data: ver, error: verErr } = await context.supabase.rpc(
      "next_contract_version",
      { _order_id: data.order_id },
    );
    if (verErr) throw new Error("محاسبه شماره نسخه ناموفق بود.");
    const version = ver as unknown as number;

    // Supersede any prior non-terminal contract.
    await context.supabase
      .from("contracts")
      .update({ status: "superseded" })
      .eq("order_id", data.order_id)
      .in("status", ["sent"]);

    const { data: row, error } = await context.supabase
      .from("contracts")
      .insert({
        order_id: data.order_id,
        quote_id: data.quote_id ?? approved.id,
        version,
        status: "draft",
        created_by: context.userId,
        title: data.title,
        body: data.body,
        admin_notes: data.admin_notes ?? null,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error("ایجاد قرارداد ناموفق بود.");
    return { id: row.id, version };
  });

// ---------- Admin: send contract to customer ----------
export const adminSendContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ contract_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: c } = await context.supabase
      .from("contracts")
      .select("id, order_id, status")
      .eq("id", data.contract_id)
      .maybeSingle();
    if (!c) throw new Error("قرارداد یافت نشد.");
    if (c.status !== "draft") throw new Error("این قرارداد قبلاً ارسال شده است.");
    await context.supabase
      .from("contracts")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", c.id);
    await context.supabase
      .from("orders")
      .update({ status: "contract_pending" })
      .eq("id", c.order_id);
    return { ok: true };
  });

// ---------- Admin: delete a draft contract ----------
export const adminDeleteContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ contract_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: c } = await context.supabase
      .from("contracts")
      .select("status")
      .eq("id", data.contract_id)
      .maybeSingle();
    if (!c) throw new Error("قرارداد یافت نشد.");
    if (c.status !== "draft") throw new Error("فقط پیش‌نویس‌ها قابل حذف هستند.");
    await context.supabase.from("contracts").delete().eq("id", data.contract_id);
    return { ok: true };
  });

// ---------- Customer / Admin: list contracts for an order (non-drafts) ----------
export const listOrderContracts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ order_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    // RLS scopes rows: customers see non-draft on their own orders; admins see all.
    const { data: rows } = await context.supabase
      .from("contracts")
      .select("*")
      .eq("order_id", data.order_id)
      .order("version", { ascending: false });
    return rows ?? [];
  });

// ---------- Customer: approve contract ----------
export const approveContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ contract_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("contracts")
      .select("id, order_id, status, orders!inner(customer_id)")
      .eq("id", data.contract_id)
      .maybeSingle();
    if (!row) throw new Error("قرارداد یافت نشد.");
    if ((row as any).orders.customer_id !== context.userId) {
      throw new Error("دسترسی مجاز نیست.");
    }
    if (row.status !== "sent") throw new Error("این قرارداد قابل تأیید نیست.");
    await context.supabase
      .from("contracts")
      .update({ status: "approved", decided_at: new Date().toISOString() })
      .eq("id", row.id);
    await context.supabase
      .from("orders")
      .update({ status: "contract_approved" })
      .eq("id", row.order_id);
    await notifyAdmins({
      title: "قرارداد تأیید شد",
      message: "مشتری قرارداد را تأیید کرد.",
      orderId: row.order_id,
    });
    return { ok: true };
  });

// ---------- Customer: reject contract ----------
export const rejectContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        contract_id: z.string().uuid(),
        note: z.string().trim().min(1).max(1000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("contracts")
      .select("id, order_id, status, orders!inner(customer_id)")
      .eq("id", data.contract_id)
      .maybeSingle();
    if (!row) throw new Error("قرارداد یافت نشد.");
    if ((row as any).orders.customer_id !== context.userId) {
      throw new Error("دسترسی مجاز نیست.");
    }
    if (row.status !== "sent") throw new Error("این قرارداد قابل رد کردن نیست.");
    await context.supabase
      .from("contracts")
      .update({
        status: "rejected",
        decided_at: new Date().toISOString(),
        customer_response_note: data.note,
      })
      .eq("id", row.id);
    // Return to quoted state — admin may revise and reissue.
    await context.supabase
      .from("orders")
      .update({ status: "quoted" })
      .eq("id", row.order_id);
    return { ok: true };
  });

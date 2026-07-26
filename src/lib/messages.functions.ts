// Order messaging + user notifications.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function loadRole(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const roles = (data ?? []).map((r: any) => r.role);
  return { isAdmin: roles.includes("admin") };
}

// ---------- Messaging ----------
export const listOrderMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ order_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, customer_id")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) throw new Error("سفارش یافت نشد.");
    const { isAdmin } = await loadRole(context);
    if (!isAdmin && order.customer_id !== context.userId)
      throw new Error("دسترسی مجاز نیست.");

    const { data: rows } = await context.supabase
      .from("order_messages")
      .select("*")
      .eq("order_id", data.order_id)
      .order("created_at", { ascending: true });

    // Mark visible messages as read for this user's own perspective:
    // customer marks admin messages read; admin marks customer messages read.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const otherRole = isAdmin ? "customer" : "admin";
    await supabaseAdmin
      .from("order_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("order_id", data.order_id)
      .is("read_at", null)
      .eq("sender_role", otherRole);

    return { messages: rows ?? [], isAdmin, customerId: order.customer_id };
  });

export const sendOrderMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        body: z.string().trim().min(1).max(4000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { checkRateLimit } = await import("./auth.server");
    const rl = await checkRateLimit({
      bucket: "messages:send",
      key: context.userId,
      limit: 60,
      windowSeconds: 300,
    });
    if (!rl.ok) throw new Error("تعداد پیام‌های اخیر زیاد است.");

    const { data: order } = await context.supabase
      .from("orders")
      .select("id, customer_id, project_title")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) throw new Error("سفارش یافت نشد.");
    const { isAdmin } = await loadRole(context);
    if (!isAdmin && order.customer_id !== context.userId)
      throw new Error("دسترسی مجاز نیست.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("order_messages").insert({
      order_id: data.order_id,
      sender_id: context.userId,
      sender_role: isAdmin ? "admin" : "customer",
      body: data.body,
    });
    if (error) throw new Error("ارسال پیام ناموفق بود.");

    // Notify the other party.
    if (isAdmin) {
      await supabaseAdmin.from("notifications").insert({
        user_id: order.customer_id,
        type: "message",
        title: "پیام جدید از استودیو",
        message: order.project_title,
        link: `/orders/${order.id}`,
      });
    } else {
      const { data: admins } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const rows = (admins ?? []).map((a: any) => ({
        user_id: a.user_id,
        type: "message",
        title: "پیام جدید از مشتری",
        message: order.project_title,
        link: `/admin/orders/${order.id}`,
      }));
      if (rows.length) await supabaseAdmin.from("notifications").insert(rows);
    }
    return { ok: true };
  });

// ---------- Notifications ----------
export const listMyNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ limit: z.number().int().min(1).max(50).default(20) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("notifications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    const { count } = await context.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .is("read_at", null);
    return { items: rows ?? [], unread: count ?? 0 };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    return { ok: true };
  });

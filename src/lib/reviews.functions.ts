import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const reviewSchema = z.object({
  order_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
});

export const getMyOrderReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ order_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, status, customer_id")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order || order.customer_id !== context.userId)
      throw new Error("سفارش یافت نشد.");
    const eligible =
      order.status === "final_delivered" || order.status === "completed";
    const { data: review } = await context.supabase
      .from("reviews")
      .select("*")
      .eq("order_id", data.order_id)
      .maybeSingle();
    return { eligible, review };
  });

export const upsertMyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reviewSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, status, customer_id")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order || order.customer_id !== context.userId)
      throw new Error("سفارش یافت نشد.");
    if (order.status !== "final_delivered" && order.status !== "completed")
      throw new Error("ثبت نظر پس از تحویل نهایی امکان‌پذیر است.");

    const { data: existing } = await context.supabase
      .from("reviews")
      .select("id, is_published")
      .eq("order_id", data.order_id)
      .maybeSingle();
    if (existing?.is_published)
      throw new Error("نظر منتشرشده قابل ویرایش نیست.");

    if (existing) {
      const { error } = await context.supabase
        .from("reviews")
        .update({ rating: data.rating, comment: data.comment ?? null })
        .eq("id", existing.id);
      if (error) throw new Error("ثبت نظر ناموفق بود.");
    } else {
      const { error } = await context.supabase.from("reviews").insert({
        order_id: data.order_id,
        customer_id: context.userId,
        rating: data.rating,
        comment: data.comment ?? null,
      });
      if (error) throw new Error("ثبت نظر ناموفق بود.");
    }
    return { ok: true };
  });

// Admin: list all reviews with order/customer context
export const adminListReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("دسترسی مجاز نیست.");

    const { data } = await context.supabase
      .from("reviews")
      .select(
        "id, rating, comment, is_published, admin_notes, created_at, order_id, customer_id",
      )
      .order("created_at", { ascending: false });
    return { items: data ?? [] };
  });

export const adminSetReviewPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        is_published: z.boolean(),
        admin_notes: z.string().max(1000).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("دسترسی مجاز نیست.");
    const { error } = await context.supabase
      .from("reviews")
      .update({
        is_published: data.is_published,
        admin_notes: data.admin_notes ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error("به‌روزرسانی ناموفق بود.");
    return { ok: true };
  });

// Public: list published reviews for the marketing site
export const listPublishedReviews = createServerFn({ method: "GET" }).handler(
  async () => {
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient<Database>(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data } = await client
      .from("reviews")
      .select("id, rating, comment, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(24);
    return { items: data ?? [] };
  },
);

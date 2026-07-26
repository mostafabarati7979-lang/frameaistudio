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

export const adminReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [orders, payments, quotes, contracts, reviews] = await Promise.all([
      context.supabase.from("orders").select("id, status, created_at"),
      context.supabase
        .from("payments")
        .select("kind, status, amount_toman, paid_at, created_at"),
      context.supabase.from("quotes").select("id, status, total_toman"),
      context.supabase.from("contracts").select("id, status"),
      context.supabase.from("reviews").select("rating, is_published"),
    ]);
    const ordersByStatus: Record<string, number> = {};
    (orders.data ?? []).forEach((o: any) => {
      ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
    });
    const revenue = (payments.data ?? [])
      .filter((p: any) => p.status === "approved")
      .reduce((s: number, p: any) => s + Number(p.amount_toman ?? 0), 0);
    const pendingPayments = (payments.data ?? []).filter(
      (p: any) => p.status === "pending",
    ).length;
    const quotesByStatus: Record<string, number> = {};
    (quotes.data ?? []).forEach((q: any) => {
      quotesByStatus[q.status] = (quotesByStatus[q.status] ?? 0) + 1;
    });
    const contractsByStatus: Record<string, number> = {};
    (contracts.data ?? []).forEach((c: any) => {
      contractsByStatus[c.status] = (contractsByStatus[c.status] ?? 0) + 1;
    });
    const ratings = (reviews.data ?? []).map((r: any) => r.rating);
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length
        : 0;

    // Revenue by month (last 12) — approved payments
    const now = new Date();
    const buckets: { label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({ label: key, total: 0 });
    }
    (payments.data ?? [])
      .filter((p: any) => p.status === "approved" && p.paid_at)
      .forEach((p: any) => {
        const d = new Date(p.paid_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const b = buckets.find((x) => x.label === key);
        if (b) b.total += Number(p.amount_toman ?? 0);
      });

    return {
      totals: {
        orders: (orders.data ?? []).length,
        revenue_toman: revenue,
        pending_payments: pendingPayments,
        quotes: (quotes.data ?? []).length,
        contracts: (contracts.data ?? []).length,
        reviews: ratings.length,
        avg_rating: Number(avgRating.toFixed(2)),
      },
      ordersByStatus,
      quotesByStatus,
      contractsByStatus,
      revenueByMonth: buckets,
    };
  });

const auditFilter = z.object({
  entity_type: z
    .enum(["quote", "contract", "payment", "user_role", "all"])
    .default("all"),
  limit: z.number().int().min(1).max(500).default(200),
});

export const adminListAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => auditFilter.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.entity_type !== "all") q = q.eq("entity_type", data.entity_type);
    const { data: rows } = await q;
    const actorIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.actor_id).filter(Boolean)),
    );
    let profiles: Record<string, { full_name: string | null; mobile: string }> =
      {};
    if (actorIds.length > 0) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, full_name, mobile")
        .in("id", actorIds as string[]);
      (profs ?? []).forEach((p: any) => {
        profiles[p.id] = { full_name: p.full_name, mobile: p.mobile };
      });
    }
    return {
      items: (rows ?? []).map((r: any) => ({
        ...r,
        actor: r.actor_id ? profiles[r.actor_id] ?? null : null,
      })),
    };
  });

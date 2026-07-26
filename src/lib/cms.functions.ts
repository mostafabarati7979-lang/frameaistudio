import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KINDS = ["service", "package", "portfolio", "blog", "faq", "page"] as const;
export type ContentKind = (typeof KINDS)[number];

const contentSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(KINDS),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z0-9-]*$/, "فقط حروف کوچک، اعداد و خط تیره")
    .optional()
    .nullable(),
  title: z.string().trim().min(1).max(240),
  summary: z.string().trim().max(1000).optional().nullable(),
  body: z.record(z.any()).default({}),
  cover_url: z.string().trim().url().max(500).optional().nullable(),
  sort_order: z.number().int().min(0).max(9999).default(0),
  is_published: z.boolean().default(false),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("دسترسی مجاز نیست.");
}

export const adminListContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ kind: z.enum(KINDS) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows } = await context.supabase
      .from("content_items")
      .select("*")
      .eq("kind", data.kind)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    return { items: rows ?? [] };
  });

export const adminUpsertContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => contentSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      kind: data.kind,
      slug: data.slug || null,
      title: data.title,
      summary: data.summary || null,
      body: data.body ?? {},
      cover_url: data.cover_url || null,
      sort_order: data.sort_order,
      is_published: data.is_published,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("content_items")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("content_items")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted!.id };
  });

export const adminDeleteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("content_items")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Customers management (view + role toggle) --------

export const adminListCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [{ data: profiles }, { data: roles }, { data: orders }] =
      await Promise.all([
        context.supabase
          .from("profiles")
          .select("id, mobile, full_name, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        context.supabase.from("user_roles").select("user_id, role"),
        context.supabase.from("orders").select("customer_id, status"),
      ]);
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const list = roleMap.get(r.user_id) ?? [];
      list.push(r.role);
      roleMap.set(r.user_id, list);
    });
    const orderCount = new Map<string, number>();
    (orders ?? []).forEach((o: any) => {
      orderCount.set(o.customer_id, (orderCount.get(o.customer_id) ?? 0) + 1);
    });
    const items = (profiles ?? []).map((p: any) => ({
      ...p,
      roles: roleMap.get(p.id) ?? ["customer"],
      order_count: orderCount.get(p.id) ?? 0,
    }));
    return { items };
  });

export const adminSetUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ user_id: z.string().uuid(), grant: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId && !data.grant)
      throw new Error("نمی‌توانید نقش ادمین خودتان را حذف کنید.");
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    if (data.grant) {
      await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: data.user_id, role: "admin" },
          { onConflict: "user_id,role" },
        );
    } else {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", "admin");
    }
    return { ok: true };
  });

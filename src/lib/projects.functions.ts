// Post-payment delivery workflow: project milestones + admin deliverables.
// Customers accept a delivered milestone or request revisions; admins upload
// deliverables. Final-output files are gated behind an approved final payment.
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

async function assertOwnerOrAdmin(
  context: { supabase: any; userId: string },
  orderId: string,
) {
  const { data: order } = await context.supabase
    .from("orders")
    .select("id, customer_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) throw new Error("سفارش یافت نشد.");
  if (order.customer_id === context.userId) return { isAdmin: false, order };
  const { data: role } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) throw new Error("دسترسی مجاز نیست.");
  return { isAdmin: true, order };
}

// ---------- Bootstrap default milestones (admin/system) ----------
export const adminBootstrapMilestones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ order_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("bootstrap_project_milestones", {
      _order_id: data.order_id,
    });
    if (error) throw new Error("ایجاد مراحل پروژه ناموفق بود.");
    return { ok: true };
  });

// ---------- List milestones + deliverables for an order ----------
export const listProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ order_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertOwnerOrAdmin(context, data.order_id);

    const [{ data: milestones }, { data: deliverables }, { data: finalPay }] =
      await Promise.all([
        context.supabase
          .from("project_milestones")
          .select("*")
          .eq("order_id", data.order_id)
          .order("sort_order", { ascending: true }),
        context.supabase
          .from("project_deliverables")
          .select("*")
          .eq("order_id", data.order_id)
          .order("created_at", { ascending: false }),
        context.supabase
          .from("payments")
          .select("id")
          .eq("order_id", data.order_id)
          .eq("kind", "final")
          .eq("status", "approved")
          .maybeSingle(),
      ]);

    return {
      milestones: milestones ?? [],
      deliverables: deliverables ?? [],
      finalPaymentApproved: Boolean(finalPay),
    };
  });

// ---------- Customer: accept a delivered milestone ----------
export const customerAcceptMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        milestone_id: z.string().uuid(),
        note: z.string().trim().max(2000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: m } = await context.supabase
      .from("project_milestones")
      .select("id, order_id, key, status")
      .eq("id", data.milestone_id)
      .maybeSingle();
    if (!m) throw new Error("مرحله یافت نشد.");
    await assertOwnerOrAdmin(context, m.order_id);
    if (m.status !== "delivered")
      throw new Error("فقط مراحل تحویل‌شده قابل تأیید هستند.");

    const { error } = await context.supabase
      .from("project_milestones")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        customer_notes: data.note ?? null,
      })
      .eq("id", m.id);
    if (error) throw new Error("تأیید مرحله ناموفق بود.");

    // Sync order status when the initial cut or final output is accepted.
    if (m.key === "initial_cut") {
      await context.supabase
        .from("orders")
        .update({ status: "initial_delivered" })
        .eq("id", m.order_id);
    } else if (m.key === "final_output") {
      await context.supabase
        .from("orders")
        .update({ status: "final_delivered" })
        .eq("id", m.order_id);
    }
    return { ok: true };
  });

// ---------- Customer: request revisions on a delivered milestone ----------
export const customerRequestMilestoneRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        milestone_id: z.string().uuid(),
        note: z.string().trim().min(2).max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: m } = await context.supabase
      .from("project_milestones")
      .select("id, order_id, status")
      .eq("id", data.milestone_id)
      .maybeSingle();
    if (!m) throw new Error("مرحله یافت نشد.");
    await assertOwnerOrAdmin(context, m.order_id);
    if (m.status !== "delivered")
      throw new Error("فقط مراحل تحویل‌شده قابل درخواست اصلاحیه هستند.");

    const { error } = await context.supabase
      .from("project_milestones")
      .update({ status: "revision_requested", customer_notes: data.note })
      .eq("id", m.id);
    if (error) throw new Error("ثبت درخواست اصلاحیه ناموفق بود.");

    await context.supabase
      .from("orders")
      .update({ status: "revisions" })
      .eq("id", m.order_id);
    return { ok: true };
  });

// ---------- Admin: update milestone status/notes ----------
export const adminUpdateMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        milestone_id: z.string().uuid(),
        status: z
          .enum(["pending", "in_progress", "delivered", "accepted", "revision_requested", "skipped"])
          .optional(),
        admin_notes: z.string().trim().max(2000).nullable().optional(),
        description: z.string().trim().max(2000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = {};
    if (data.status) {
      patch.status = data.status;
      if (data.status === "delivered") patch.delivered_at = new Date().toISOString();
    }
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    if (data.description !== undefined) patch.description = data.description;

    const { data: m, error } = await context.supabase
      .from("project_milestones")
      .update(patch)
      .eq("id", data.milestone_id)
      .select("id, order_id, key, status")
      .maybeSingle();
    if (error || !m) throw new Error("به‌روزرسانی مرحله ناموفق بود.");

    // Advance order status when initial cut / final output are delivered.
    if (data.status === "delivered") {
      if (m.key === "initial_cut") {
        await context.supabase
          .from("orders")
          .update({ status: "initial_delivered" })
          .eq("id", m.order_id);
      } else if (m.key === "final_output") {
        await context.supabase
          .from("orders")
          .update({ status: "final_delivered" })
          .eq("id", m.order_id);
      }
    }
    return { ok: true };
  });

// ---------- Admin: request a signed upload URL for a deliverable ----------
export const adminCreateDeliverableUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        milestone_id: z.string().uuid(),
        file_name: z.string().min(1).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: m } = await supabaseAdmin
      .from("project_milestones")
      .select("id, order_id")
      .eq("id", data.milestone_id)
      .maybeSingle();
    if (!m) throw new Error("مرحله یافت نشد.");

    const safe = data.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `deliverables/${m.order_id}/${m.id}/${crypto.randomUUID()}-${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("order-files")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error("ایجاد لینک آپلود ناموفق بود.");
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

// ---------- Admin: register uploaded deliverable ----------
export const adminRegisterDeliverable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        milestone_id: z.string().uuid(),
        storage_path: z.string().min(3).max(500),
        file_name: z.string().min(1).max(200),
        content_type: z.string().min(1).max(100),
        size_bytes: z.number().int().min(1).max(2 * 1024 * 1024 * 1024),
        is_final_output: z.boolean().optional(),
        notes: z.string().trim().max(1000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: m } = await supabaseAdmin
      .from("project_milestones")
      .select("id, order_id, key")
      .eq("id", data.milestone_id)
      .maybeSingle();
    if (!m) throw new Error("مرحله یافت نشد.");

    // Storage path must match this milestone/order (defense against path spoofing).
    const expectedPrefix = `deliverables/${m.order_id}/${m.id}/`;
    if (!data.storage_path.startsWith(expectedPrefix))
      throw new Error("مسیر ذخیره‌سازی نامعتبر است.");

    const isFinalOutput =
      data.is_final_output ?? m.key === "final_output";

    const { error } = await supabaseAdmin.from("project_deliverables").insert({
      milestone_id: m.id,
      order_id: m.order_id,
      uploaded_by: context.userId,
      storage_path: data.storage_path,
      file_name: data.file_name,
      content_type: data.content_type,
      size_bytes: data.size_bytes,
      is_final_output: isFinalOutput,
      notes: data.notes ?? null,
    });
    if (error) throw new Error("ثبت فایل ناموفق بود.");
    return { ok: true };
  });

// ---------- Admin: delete a deliverable ----------
export const adminDeleteDeliverable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ deliverable_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("project_deliverables")
      .select("id, storage_path")
      .eq("id", data.deliverable_id)
      .maybeSingle();
    if (!row) return { ok: true };
    await supabaseAdmin.storage.from("order-files").remove([row.storage_path]);
    await supabaseAdmin
      .from("project_deliverables")
      .delete()
      .eq("id", data.deliverable_id);
    return { ok: true };
  });

// ---------- Signed download URL for a deliverable (with final-payment gate) ----------
export const signDeliverableUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ deliverable_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("project_deliverables")
      .select("id, order_id, storage_path, is_final_output")
      .eq("id", data.deliverable_id)
      .maybeSingle();
    if (!row) throw new Error("فایل یافت نشد.");

    const { isAdmin } = await assertOwnerOrAdmin(context, row.order_id);
    if (!isAdmin && row.is_final_output) {
      const { data: pay } = await context.supabase
        .from("payments")
        .select("id")
        .eq("order_id", row.order_id)
        .eq("kind", "final")
        .eq("status", "approved")
        .maybeSingle();
      if (!pay) throw new Error("دانلود خروجی نهایی پس از تسویه فعال می‌شود.");
    }
    const { data: signed, error } = await supabaseAdmin.storage
      .from("order-files")
      .createSignedUrl(row.storage_path, 60 * 10);
    if (error || !signed) throw new Error("ایجاد لینک دانلود ناموفق بود.");
    return { url: signed.signedUrl };
  });

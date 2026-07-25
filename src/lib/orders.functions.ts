// Server functions for customer order intake.
// Customers create/read only their own orders; RLS enforces this at the DB level.
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  orderDraftSchema,
  submitOrderSchema,
  registerFileSchema,
  ALLOWED_MIME,
  MAX_FILE_BYTES,
  MAX_FILES_PER_ORDER,
} from "./orders-schema";

function getIp(): string {
  return (
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
    getRequestHeader("x-real-ip") ??
    "unknown"
  );
}

// ---- Basic order-rate limiting (per user) ----
async function assertOrderRateLimit(userId: string) {
  const { checkRateLimit } = await import("./auth.server");
  const rl = await checkRateLimit({
    bucket: "orders:create",
    key: userId,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!rl.ok) {
    throw new Error("تعداد سفارش‌های ثبت‌شده در یک ساعت اخیر زیاد است. بعداً تلاش کنید.");
  }
  const rlIp = await checkRateLimit({
    bucket: "orders:ip",
    key: getIp(),
    limit: 30,
    windowSeconds: 3600,
  });
  if (!rlIp.ok) throw new Error("تعداد درخواست‌ها از این آدرس زیاد است.");
}

// ---------- Create a draft order (before file upload / consent) ----------
export const createOrderDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orderDraftSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertOrderRateLimit(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: codeRow, error: codeErr } = await supabaseAdmin.rpc(
      "generate_order_code",
    );
    if (codeErr) throw new Error("ثبت سفارش ناموفق بود.");

    const insertPayload = {
      order_code: codeRow as unknown as string,
      customer_id: context.userId,
      status: "draft" as const,
      service_type: data.service_type,
      package_key: data.package_key ?? null,
      project_title: data.project_title,
      event_date: data.event_date ?? null,
      city: data.city ?? null,
      address: data.address ?? null,
      team_hours: data.team_hours ?? null,
      shooting_days: data.shooting_days ?? null,
      description: data.description ?? null,
      cameras_count: data.cameras_count ?? null,
      quality: data.quality ?? null,
      orientation: data.orientation ?? null,
      duration_min: data.duration_min ?? null,
      clips_count: data.clips_count ?? null,
      reels_count: data.reels_count ?? null,
      needs_lighting: data.needs_lighting ?? false,
      needs_audio: data.needs_audio ?? false,
      aerial: data.aerial ?? false,
      voiceover: data.voiceover ?? false,
      subtitles: data.subtitles ?? false,
      scriptwriting: data.scriptwriting ?? false,
      rush: data.rush ?? false,
      style: data.style ?? null,
      customer_notes: data.customer_notes ?? null,
      expectations: data.expectations ?? null,
      budget_note: data.budget_note ?? null,
      preferred_contact: data.preferred_contact ?? null,
      best_call_time: data.best_call_time ?? null,
    };

    // Insert via authenticated client so RLS enforces customer_id = auth.uid().
    const { data: row, error } = await context.supabase
      .from("orders")
      .insert(insertPayload)
      .select("id, order_code")
      .single();
    if (error || !row) throw new Error("ثبت سفارش ناموفق بود.");
    return { id: row.id, order_code: row.order_code };
  });

// ---------- Finalize order (mark submitted + record consents) ----------
export const submitOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => submitOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: existing, error: readErr } = await context.supabase
      .from("orders")
      .select("id, status, customer_id")
      .eq("id", data.order_id)
      .maybeSingle();
    if (readErr || !existing) throw new Error("سفارش یافت نشد.");
    if (existing.status !== "draft") {
      throw new Error("این سفارش قبلاً ثبت شده است.");
    }
    const { error } = await context.supabase
      .from("orders")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        consent_terms: true,
        consent_file_ownership: true,
        consent_ai_use: data.consent_ai_use,
        consent_publish_portfolio: data.consent_publish_portfolio,
        consent_face_voice_simulation: data.consent_face_voice_simulation,
      })
      .eq("id", data.order_id);
    if (error) throw new Error("ثبت نهایی سفارش ناموفق بود.");
    return { ok: true };
  });

// ---------- Register an uploaded file (after direct upload to storage) ----------
export const registerOrderFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => registerFileSchema.parse(data))
  .handler(async ({ data, context }) => {
    // 1. Ownership + status check via authenticated client (RLS enforces).
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, status, customer_id")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) throw new Error("سفارش یافت نشد.");
    if (!["draft", "submitted", "revisions"].includes(order.status)) {
      throw new Error("امکان افزودن فایل به این سفارش وجود ندارد.");
    }
    // 2. Path must start with user's folder.
    if (!data.storage_path.startsWith(`${context.userId}/${data.order_id}/`)) {
      throw new Error("مسیر فایل نامعتبر است.");
    }
    // 3. Content-type allow-list.
    const kind = ALLOWED_MIME[data.content_type];
    if (!kind) throw new Error("نوع فایل مجاز نیست.");
    if (data.size_bytes > MAX_FILE_BYTES) throw new Error("حجم فایل بیش از حد مجاز است.");

    // 4. Enforce per-order file cap.
    const { count } = await context.supabase
      .from("order_files")
      .select("id", { count: "exact", head: true })
      .eq("order_id", data.order_id);
    if ((count ?? 0) >= MAX_FILES_PER_ORDER) {
      throw new Error("حداکثر تعداد فایل برای هر سفارش تکمیل شده است.");
    }

    const { data: row, error } = await context.supabase
      .from("order_files")
      .insert({
        order_id: data.order_id,
        owner_id: context.userId,
        uploaded_by_role: "customer",
        storage_path: data.storage_path,
        file_name: data.file_name.slice(0, 200),
        content_type: data.content_type,
        size_bytes: data.size_bytes,
        kind,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error("ثبت فایل ناموفق بود.");
    return { id: row.id };
  });

// ---------- Delete own file (only while order is pre-pricing) ----------
export const deleteOrderFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    return { file_id: String((data as { file_id?: unknown }).file_id) };
  })
  .handler(async ({ data, context }) => {
    const { data: file } = await context.supabase
      .from("order_files")
      .select("id, storage_path, owner_id")
      .eq("id", data.file_id)
      .maybeSingle();
    if (!file) throw new Error("فایل یافت نشد.");
    if (file.owner_id !== context.userId) throw new Error("دسترسی مجاز نیست.");
    // Delete storage object first (RLS on storage.objects enforces owner).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from("order-files").remove([file.storage_path]);
    const { error } = await context.supabase
      .from("order_files")
      .delete()
      .eq("id", file.id);
    if (error) throw new Error("حذف فایل ناموفق بود.");
    return { ok: true };
  });

// ---------- List my orders ----------
export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, order_code, status, service_type, project_title, event_date, city, created_at, submitted_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error("دریافت سفارش‌ها ناموفق بود.");
    return data ?? [];
  });

// ---------- Get one of my orders (with files) ----------
export const getMyOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    return { id: String((data as { id?: unknown }).id) };
  })
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error("خطا در دریافت سفارش.");
    if (!order) return null;
    const { data: files } = await context.supabase
      .from("order_files")
      .select("id, file_name, content_type, size_bytes, kind, storage_path, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });
    return { order, files: files ?? [] };
  });

// ---------- Sign a URL for a file the caller can read ----------
export const signOrderFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    return { file_id: String((data as { file_id?: unknown }).file_id) };
  })
  .handler(async ({ data, context }) => {
    const { data: file } = await context.supabase
      .from("order_files")
      .select("id, storage_path")
      .eq("id", data.file_id)
      .maybeSingle();
    if (!file) throw new Error("فایل یافت نشد.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("order-files")
      .createSignedUrl(file.storage_path, 60 * 10);
    if (error || !signed) throw new Error("ایجاد لینک دانلود ناموفق بود.");
    return { url: signed.signedUrl };
  });

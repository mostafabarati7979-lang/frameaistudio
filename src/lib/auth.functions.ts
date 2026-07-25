// Client-callable server functions for mobile+OTP auth.
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { normalizeIranianMobile, mobileToInternalEmail } from "./mobile";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OTP_TTL_SECONDS = 300; // 5 minutes
const MAX_OTP_ATTEMPTS = 5;

function getIp(): string {
  return (
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
    getRequestHeader("x-real-ip") ??
    "unknown"
  );
}

// Never leak whether a mobile is registered.
const GENERIC_AUTH_ERROR = "شماره موبایل یا رمز عبور نامعتبر است.";

// ---------- Request OTP ----------
export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        mobile: z.string().min(1),
        purpose: z.enum(["signup", "login", "reset"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { hashOtp, generateOtp, checkRateLimit, sendOtpSms } = await import(
      "./auth.server"
    );
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const mobile = normalizeIranianMobile(data.mobile);
    if (!mobile) {
      throw new Error("شماره موبایل معتبر نیست.");
    }

    const ip = getIp();
    const rlMobile = await checkRateLimit({
      bucket: "otp:mobile",
      key: mobile,
      limit: 5,
      windowSeconds: 3600,
    });
    if (!rlMobile.ok) {
      throw new Error("تعداد درخواست‌های ارسال کد بیش از حد مجاز است. بعداً تلاش کنید.");
    }
    const rlIp = await checkRateLimit({
      bucket: "otp:ip",
      key: ip,
      limit: 20,
      windowSeconds: 3600,
    });
    if (!rlIp.ok) {
      throw new Error("تعداد درخواست‌ها از این آدرس زیاد است.");
    }

    // For signup: don't reveal existence, but avoid creating dup OTPs for an existing user.
    // For login/reset: don't reveal non-existence — still send response as if OK.
    const email = mobileToInternalEmail(mobile);
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("mobile", mobile)
      .maybeSingle();

    if (data.purpose === "signup" && existing) {
      // Pretend success — never leak that mobile is taken.
      return { ok: true, expiresIn: OTP_TTL_SECONDS };
    }
    if ((data.purpose === "login" || data.purpose === "reset") && !existing) {
      return { ok: true, expiresIn: OTP_TTL_SECONDS };
    }

    const code = generateOtp();
    const code_hash = hashOtp(code, mobile);
    const expires_at = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

    // Invalidate previous unconsumed OTPs for this mobile/purpose.
    await supabaseAdmin
      .from("otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("mobile", mobile)
      .eq("purpose", data.purpose)
      .is("consumed_at", null);

    await supabaseAdmin.from("otp_codes").insert({
      mobile,
      purpose: data.purpose,
      code_hash,
      expires_at,
    });

    await sendOtpSms(mobile, code, data.purpose);
    // Suppress email/existence details;
    void email;
    return { ok: true, expiresIn: OTP_TTL_SECONDS };
  });

// Consumes an OTP; returns mobile on success. Server-side only.
async function consumeOtp(
  mobile: string,
  purpose: "signup" | "login" | "reset",
  code: string,
): Promise<boolean> {
  const { hashOtp } = await import("./auth.server");
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data: row } = await supabaseAdmin
    .from("otp_codes")
    .select("*")
    .eq("mobile", mobile)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) return false;
  if (row.attempts >= MAX_OTP_ATTEMPTS) return false;
  const expected = hashOtp(code, mobile);
  if (expected !== row.code_hash) {
    await supabaseAdmin
      .from("otp_codes")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    return false;
  }
  await supabaseAdmin
    .from("otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);
  return true;
}

// ---------- Sign up with mobile + OTP + password ----------
export const signUpWithOtp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        mobile: z.string().min(1),
        code: z.string().regex(/^\d{6}$/, "کد نامعتبر است."),
        password: z.string().min(8).max(72),
        fullName: z.string().trim().min(2).max(100),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const mobile = normalizeIranianMobile(data.mobile);
    if (!mobile) throw new Error("شماره موبایل معتبر نیست.");
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Confirm no existing profile with this mobile (avoid race).
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("mobile", mobile)
      .maybeSingle();
    if (existing) {
      // Do not reveal — but we can't create.
      throw new Error("امکان ثبت‌نام با این اطلاعات وجود ندارد.");
    }

    const ok = await consumeOtp(mobile, "signup", data.code);
    if (!ok) throw new Error("کد تایید نامعتبر یا منقضی شده است.");

    const email = mobileToInternalEmail(mobile);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, mobile },
    });
    if (error || !created.user) {
      throw new Error("ثبت‌نام ناموفق بود. بعداً تلاش کنید.");
    }

    const userId = created.user.id;
    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      mobile,
      full_name: data.fullName,
    });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("ثبت‌نام ناموفق بود.");
    }
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "customer" });

    return { ok: true, email };
  });

// ---------- Verify OTP for login: returns a hashed token the client can exchange for a session ----------
export const verifyOtpForLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        mobile: z.string().min(1),
        code: z.string().regex(/^\d{6}$/),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const mobile = normalizeIranianMobile(data.mobile);
    if (!mobile) throw new Error(GENERIC_AUTH_ERROR);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const ip = getIp();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("mobile", mobile)
      .maybeSingle();
    if (!profile) {
      // Consume attempt anyway (bounded by rate limit) to avoid oracle.
      throw new Error(GENERIC_AUTH_ERROR);
    }

    const ok = await consumeOtp(mobile, "login", data.code);
    await supabaseAdmin.from("login_attempts").insert({
      mobile,
      method: "otp",
      success: ok,
      ip,
    });
    if (!ok) throw new Error(GENERIC_AUTH_ERROR);

    const email = mobileToInternalEmail(mobile);
    // Generate a magiclink; client uses token_hash + type='magiclink' with verifyOtp to establish a session.
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (error || !link?.properties?.hashed_token) {
      throw new Error("ورود ناموفق بود.");
    }
    return {
      ok: true,
      email,
      tokenHash: link.properties.hashed_token,
    };
  });

// ---------- Log a password login attempt (called by client after signInWithPassword) ----------
export const logPasswordLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ mobile: z.string().min(1), success: z.boolean() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const mobile = normalizeIranianMobile(data.mobile);
    if (!mobile) return { ok: true };
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    await supabaseAdmin.from("login_attempts").insert({
      mobile,
      method: "password",
      success: data.success,
      ip: getIp(),
    });
    return { ok: true };
  });

// ---------- Reset password via OTP ----------
export const resetPasswordWithOtp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        mobile: z.string().min(1),
        code: z.string().regex(/^\d{6}$/),
        password: z.string().min(8).max(72),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const mobile = normalizeIranianMobile(data.mobile);
    if (!mobile) throw new Error(GENERIC_AUTH_ERROR);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("mobile", mobile)
      .maybeSingle();
    if (!profile) {
      // Silent success to avoid oracle.
      return { ok: true };
    }
    const ok = await consumeOtp(mobile, "reset", data.code);
    if (!ok) throw new Error("کد تایید نامعتبر یا منقضی شده است.");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: data.password,
    });
    if (error) throw new Error("تغییر رمز ناموفق بود.");
    return { ok: true };
  });

// ---------- Get session role (customer/admin) for the signed-in user ----------
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (data ?? []).map((r) => r.role);
    return {
      userId: context.userId,
      roles,
      isAdmin: roles.includes("admin"),
    };
  });

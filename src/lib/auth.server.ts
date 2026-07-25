// Server-only auth helpers: OTP hashing, rate limiting, SMS provider abstraction.
import { createHash, randomInt } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function hashOtp(code: string, mobile: string): string {
  // Peppered hash (mobile-scoped) — safe against rainbow tables for 6-digit codes.
  const pepper = process.env.OTP_PEPPER ?? "frameai-dev-pepper";
  return createHash("sha256").update(`${pepper}:${mobile}:${code}`).digest("hex");
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// Sliding-window rate limiter using the rate_limits table.
export async function checkRateLimit(params: {
  bucket: string;
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ ok: boolean; retryAfterSec: number }> {
  const { bucket, key, limit, windowSeconds } = params;
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("bucket", bucket)
    .eq("key", key)
    .gte("created_at", since);
  if ((count ?? 0) >= limit) {
    return { ok: false, retryAfterSec: windowSeconds };
  }
  await supabaseAdmin.from("rate_limits").insert({ bucket, key });
  return { ok: true, retryAfterSec: 0 };
}

// SMS provider: Kavenegar in production, mock (console.log) otherwise.
export async function sendOtpSms(mobile: string, code: string, purpose: string): Promise<void> {
  const message = `کد تایید فریم‌ای‌آی: ${code}\nاعتبار: ۵ دقیقه`;
  const apiKey = process.env.KAVENEGAR_API_KEY;
  const sender = process.env.KAVENEGAR_SENDER;
  if (apiKey && sender) {
    try {
      const url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json?receptor=${encodeURIComponent(mobile)}&sender=${encodeURIComponent(sender)}&message=${encodeURIComponent(message)}`;
      await fetch(url, { method: "POST" });
    } catch (e) {
      console.error("[sms] provider error", (e as Error).message);
    }
    return;
  }
  // Dev / no-provider: log (never in prod logs — this branch requires missing env).
  console.log(`[sms:mock] purpose=${purpose} to=${mobile} code=${code}`);
}

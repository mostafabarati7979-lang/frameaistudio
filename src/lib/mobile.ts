// Iranian mobile number normalization & validation.
// Accepts inputs like: 09121234567, +989121234567, 989121234567, 00989121234567,
// with Persian/Arabic digits allowed. Returns E.164 format +989XXXXXXXXX.

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toEnglishDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (d) => {
    const p = PERSIAN_DIGITS.indexOf(d);
    if (p !== -1) return String(p);
    const a = ARABIC_DIGITS.indexOf(d);
    if (a !== -1) return String(a);
    return d;
  });
}

export function normalizeIranianMobile(raw: string): string | null {
  if (!raw) return null;
  let s = toEnglishDigits(raw).trim().replace(/[\s\-()]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("0098")) s = s.slice(4);
  else if (s.startsWith("98")) s = s.slice(2);
  else if (s.startsWith("0")) s = s.slice(1);
  if (!/^9\d{9}$/.test(s)) return null;
  return "+98" + s;
}

// Deterministic internal email used for Supabase auth (users never see it).
export function mobileToInternalEmail(mobile: string): string {
  return `${mobile.replace("+", "")}@phone.frameai.local`;
}

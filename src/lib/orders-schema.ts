// Shared client/server-safe schemas + option lists for the customer order form.
// NO PRICING anywhere.
import { z } from "zod";

export const SERVICE_TYPES = [
  { value: "wedding-film", label: "فیلم عروسی" },
  { value: "formaliteh", label: "فیلم فرمالیته" },
  { value: "pre-wedding", label: "کلیپ پیش‌عروسی" },
  { value: "cinematic-teaser", label: "تیزر سینمایی" },
  { value: "instagram-reels", label: "ریلز اینستاگرام" },
  { value: "story-ads", label: "استوری تبلیغاتی" },
  { value: "product-video", label: "فیلم محصول" },
  { value: "corporate-film", label: "فیلم شرکتی" },
  { value: "event-coverage", label: "پوشش رویداد" },
  { value: "documentary", label: "مستند کوتاه" },
  { value: "photo-session", label: "عکاسی حرفه‌ای" },
  { value: "other", label: "سایر خدمات" },
] as const;

export const QUALITY_OPTIONS = [
  { value: "fhd", label: "Full HD" },
  { value: "4k", label: "4K" },
] as const;

export const ORIENTATION_OPTIONS = [
  { value: "horizontal", label: "افقی" },
  { value: "vertical", label: "عمودی" },
  { value: "both", label: "هر دو" },
] as const;

export const STYLE_OPTIONS = [
  "سینمایی",
  "روایی احساسی",
  "مستند",
  "ریتمیک/ترند",
  "کلاسیک",
  "مدرن مینیمال",
] as const;

export const CONTACT_METHODS = [
  { value: "phone", label: "تماس تلفنی" },
  { value: "sms", label: "پیامک" },
  { value: "messenger", label: "پیام‌رسان" },
  { value: "email", label: "ایمیل" },
] as const;

export const FILE_KINDS = ["image", "video", "audio", "logo", "pdf", "sample", "other"] as const;

export const ALLOWED_MIME: Record<string, (typeof FILE_KINDS)[number]> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "image/svg+xml": "logo",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/mp4": "audio",
  "audio/ogg": "audio",
  "application/pdf": "pdf",
};

export const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200 MB
export const MAX_FILES_PER_ORDER = 20;

// Empty strings / NaN coming from optional inputs should be treated as "not provided".
const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => {
    if (v === "" || v === undefined || (typeof v === "number" && Number.isNaN(v))) return null;
    return v;
  }, schema.nullable());

export const orderDraftSchema = z.object({
  service_type: z.enum(SERVICE_TYPES.map((s) => s.value) as [string, ...string[]], {
    message: "نوع خدمت را انتخاب کنید.",
  }),
  package_key: emptyToNull(z.string().max(64)).optional(),

  project_title: z.string().trim().min(2, "عنوان پروژه را وارد کنید.").max(120),
  event_date: emptyToNull(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ رویداد معتبر نیست."),
  ).optional(),
  city: emptyToNull(z.string().trim().max(80)).optional(),
  address: emptyToNull(z.string().trim().max(300)).optional(),
  team_hours: emptyToNull(z.number().int().min(1).max(48)).optional(),
  shooting_days: emptyToNull(z.number().int().min(1).max(30)).optional(),
  description: emptyToNull(z.string().trim().max(2000)).optional(),

  cameras_count: emptyToNull(z.number().int().min(1).max(20)).optional(),
  quality: emptyToNull(z.enum(["fhd", "4k"])).optional(),
  orientation: emptyToNull(z.enum(["horizontal", "vertical", "both"])).optional(),
  duration_min: emptyToNull(z.number().int().min(1).max(600)).optional(),
  clips_count: emptyToNull(z.number().int().min(0).max(100)).optional(),
  reels_count: emptyToNull(z.number().int().min(0).max(100)).optional(),
  needs_lighting: z.boolean().optional(),
  needs_audio: z.boolean().optional(),
  aerial: z.boolean().optional(),
  voiceover: z.boolean().optional(),
  subtitles: z.boolean().optional(),
  scriptwriting: z.boolean().optional(),
  rush: z.boolean().optional(),

  style: emptyToNull(z.string().max(80)).optional(),
  customer_notes: emptyToNull(z.string().trim().max(2000)).optional(),
  expectations: emptyToNull(z.string().trim().max(2000)).optional(),
  budget_note: emptyToNull(z.string().trim().max(300)).optional(),
  preferred_contact: emptyToNull(z.enum(["phone", "sms", "messenger", "email"])).optional(),
  best_call_time: emptyToNull(z.string().trim().max(120)).optional(),
});


export const submitOrderSchema = z.object({
  order_id: z.string().uuid(),
  consent_terms: z.literal(true),
  consent_file_ownership: z.literal(true),
  consent_ai_use: z.boolean(),
  consent_publish_portfolio: z.boolean(),
  consent_face_voice_simulation: z.boolean(),
});

export const registerFileSchema = z.object({
  order_id: z.string().uuid(),
  storage_path: z.string().min(3).max(500),
  file_name: z.string().min(1).max(200),
  content_type: z.string().min(1).max(100),
  size_bytes: z.number().int().min(1).max(MAX_FILE_BYTES),
  kind: z.enum(FILE_KINDS),
});

export type OrderDraftInput = z.infer<typeof orderDraftSchema>;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "پیش‌نویس",
  submitted: "ثبت‌شده",
  quoted: "پیش‌فاکتور صادر شد",
  contract_pending: "در انتظار تأیید قرارداد",
  contract_approved: "قرارداد تأیید شد",
  payment_pending: "در انتظار پرداخت",
  in_production: "در حال تولید",
  initial_delivered: "برش اولیه ارسال شد",
  revisions: "در حال اصلاح",
  final_delivered: "خروجی نهایی ارسال شد",
  completed: "تکمیل شده",
  cancelled: "لغو شده",
};

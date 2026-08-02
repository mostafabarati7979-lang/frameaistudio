import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { createOrderDraft, submitOrder } from "@/lib/orders.functions";
import {
  SERVICE_TYPES,
  QUALITY_OPTIONS,
  ORIENTATION_OPTIONS,
  STYLE_OPTIONS,
  CONTACT_METHODS,
  orderDraftSchema,
  type OrderDraftInput,
} from "@/lib/orders-schema";
import { useQuery } from "@tanstack/react-query";
import { packagesQuery } from "@/lib/content-queries";
import { OrderFileUploader } from "@/components/orders/OrderFileUploader";

export const Route = createFileRoute("/_authenticated/orders/new")({
  head: () => ({
    meta: [
      { title: "ثبت سفارش جدید | فریم‌ای‌آی" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewOrderPage,
});

type FormState = Partial<OrderDraftInput> & {
  consent_terms?: boolean;
  consent_file_ownership?: boolean;
  consent_ai_use?: boolean;
  consent_publish_portfolio?: boolean;
  consent_face_voice_simulation?: boolean;
};

const FIELD_LABELS: Record<string, string> = {
  service_type: "نوع خدمت",
  package_key: "پکیج",
  project_title: "عنوان پروژه",
  event_date: "تاریخ رویداد",
  city: "شهر",
  address: "آدرس",
  team_hours: "ساعت حضور تیم",
  shooting_days: "روزهای تصویربرداری",
  description: "توضیحات",
  cameras_count: "تعداد دوربین",
  quality: "کیفیت",
  orientation: "جهت تصویر",
  duration_min: "مدت زمان",
  clips_count: "تعداد کلیپ",
  reels_count: "تعداد ریلز",
  style: "سبک روایت",
  customer_notes: "یادداشت‌های تکمیلی",
  expectations: "انتظارات",
  budget_note: "محدوده بودجه",
  preferred_contact: "روش ارتباط ترجیحی",
  best_call_time: "بهترین زمان تماس",
};

const STEPS = [

  "خدمت و پکیج",
  "اطلاعات پروژه",
  "جزئیات فنی",
  "سبک و توضیحات",
  "فایل‌های مرجع",
  "تأیید و ارسال",
];

function NewOrderPage() {
  const navigate = useNavigate();
  const createDraft = useServerFn(createOrderDraft);
  const finalize = useServerFn(submitOrder);

  const [step, setStep] = useState(0);
  const { data: packages = [] } = useQuery(packagesQuery());
  const [form, setForm] = useState<FormState>({
    needs_lighting: false,
    needs_audio: false,
    aerial: false,
    voiceover: false,
    subtitles: false,
    scriptwriting: false,
    rush: false,
    consent_ai_use: false,
    consent_publish_portfolio: false,
    consent_face_voice_simulation: false,
  });
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftCode, setDraftCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function next() {
    if (step === 0) {
      if (!form.service_type) return toast.error("لطفاً نوع خدمت را انتخاب کنید.");
    }
    if (step === 1) {
      if (!form.project_title || form.project_title.trim().length < 2) {
        return toast.error("عنوان پروژه را وارد کنید.");
      }
    }
    if (step === 3) {
      // Ready to create draft; do it now so files step can attach.
      handleCreateDraft();
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleCreateDraft() {
    // Validate current fields locally.
    const candidate: OrderDraftInput = {
      service_type: form.service_type!,
      package_key: form.package_key ?? null,
      project_title: form.project_title!,
      event_date: form.event_date ?? null,
      city: form.city ?? null,
      address: form.address ?? null,
      team_hours: form.team_hours ?? null,
      shooting_days: form.shooting_days ?? null,
      description: form.description ?? null,
      cameras_count: form.cameras_count ?? null,
      quality: form.quality ?? null,
      orientation: form.orientation ?? null,
      duration_min: form.duration_min ?? null,
      clips_count: form.clips_count ?? null,
      reels_count: form.reels_count ?? null,
      needs_lighting: form.needs_lighting,
      needs_audio: form.needs_audio,
      aerial: form.aerial,
      voiceover: form.voiceover,
      subtitles: form.subtitles,
      scriptwriting: form.scriptwriting,
      rush: form.rush,
      style: form.style ?? null,
      customer_notes: form.customer_notes ?? null,
      expectations: form.expectations ?? null,
      budget_note: form.budget_note ?? null,
      preferred_contact: form.preferred_contact ?? null,
      best_call_time: form.best_call_time ?? null,
    };
    const parsed = orderDraftSchema.safeParse(candidate);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const field = first?.path?.[0] ? String(first.path[0]) : "";
      const msg =
        first?.message && first.message !== "Invalid"
          ? first.message
          : `مقدار وارد شده برای «${FIELD_LABELS[field] ?? field}» معتبر نیست.`;
      return toast.error(msg);
    }

    if (draftId) {
      setStep(4);
      return;
    }
    setBusy(true);
    try {
      const res = await createDraft({ data: parsed.data });
      setDraftId(res.id);
      setDraftCode(res.order_code);
      setStep(4);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!draftId) return;
    if (!form.consent_terms || !form.consent_file_ownership) {
      return toast.error("تأیید قوانین و مالکیت فایل‌ها الزامی است.");
    }
    setBusy(true);
    try {
      await finalize({
        data: {
          order_id: draftId,
          consent_terms: true,
          consent_file_ownership: true,
          consent_ai_use: !!form.consent_ai_use,
          consent_publish_portfolio: !!form.consent_publish_portfolio,
          consent_face_voice_simulation: !!form.consent_face_voice_simulation,
        },
      });
      toast.success("سفارش شما با موفقیت ثبت شد.");
      navigate({ to: "/orders/$orderId", params: { orderId: draftId } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const canGoNext = step < STEPS.length - 1;

  return (
    <div className="container-page py-12" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-gradient-gold">ثبت سفارش جدید</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          هیچ قیمتی در این فرم نمایش داده نمی‌شود. پس از بررسی، پیش‌فاکتور اختصاصی برای شما صادر خواهد شد.
        </p>

        {/* Stepper */}
        <div className="mt-8 flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-shrink-0">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                    ? "bg-primary/30 text-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`text-xs ${i === step ? "text-foreground" : "text-muted-foreground"}`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && <span className="mx-1 text-muted-foreground">—</span>}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-border/70 bg-card/50 p-6">
          {step === 0 && (
            <div className="space-y-5">
              <Field label="نوع خدمت *">
                <select
                  className="input"
                  value={form.service_type ?? ""}
                  onChange={(e) => update("service_type", e.target.value)}
                >
                  <option value="">— انتخاب کنید —</option>
                  {SERVICE_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="پکیج (اختیاری)">
                <select
                  className="input"
                  value={form.package_key ?? ""}
                  onChange={(e) => update("package_key", e.target.value || null)}
                >
                  <option value="">بدون پکیج</option>
                  {packages.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <Field label="عنوان پروژه *">
                <input
                  className="input"
                  value={form.project_title ?? ""}
                  onChange={(e) => update("project_title", e.target.value)}
                  maxLength={120}
                />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="تاریخ رویداد">
                  <input
                    type="date"
                    className="input"
                    value={form.event_date ?? ""}
                    onChange={(e) => update("event_date", e.target.value || null)}
                  />
                </Field>
                <Field label="شهر">
                  <input
                    className="input"
                    value={form.city ?? ""}
                    onChange={(e) => update("city", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="آدرس / لوکیشن">
                <input
                  className="input"
                  value={form.address ?? ""}
                  onChange={(e) => update("address", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="ساعت حضور تیم">
                  <input
                    type="number"
                    min={1}
                    max={48}
                    className="input"
                    value={form.team_hours ?? ""}
                    onChange={(e) =>
                      update("team_hours", e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </Field>
                <Field label="روزهای فیلم‌برداری">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    className="input"
                    value={form.shooting_days ?? ""}
                    onChange={(e) =>
                      update("shooting_days", e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </Field>
              </div>
              <Field label="توضیح مختصر پروژه">
                <textarea
                  rows={4}
                  className="input"
                  value={form.description ?? ""}
                  onChange={(e) => update("description", e.target.value)}
                  maxLength={2000}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="تعداد دوربین">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className="input"
                    value={form.cameras_count ?? ""}
                    onChange={(e) =>
                      update("cameras_count", e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </Field>
                <Field label="کیفیت">
                  <select
                    className="input"
                    value={form.quality ?? ""}
                    onChange={(e) =>
                      update("quality", (e.target.value || null) as "fhd" | "4k" | null)
                    }
                  >
                    <option value="">—</option>
                    {QUALITY_OPTIONS.map((q) => (
                      <option key={q.value} value={q.value}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="جهت خروجی">
                  <select
                    className="input"
                    value={form.orientation ?? ""}
                    onChange={(e) =>
                      update(
                        "orientation",
                        (e.target.value || null) as "horizontal" | "vertical" | "both" | null,
                      )
                    }
                  >
                    <option value="">—</option>
                    {ORIENTATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="مدت (دقیقه)">
                  <input
                    type="number"
                    min={1}
                    className="input"
                    value={form.duration_min ?? ""}
                    onChange={(e) =>
                      update("duration_min", e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </Field>
                <Field label="تعداد کلیپ">
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={form.clips_count ?? ""}
                    onChange={(e) =>
                      update("clips_count", e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </Field>
                <Field label="تعداد ریلز">
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={form.reels_count ?? ""}
                    onChange={(e) =>
                      update("reels_count", e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-border/50">
                <Toggle
                  label="نور پروفشنال"
                  value={!!form.needs_lighting}
                  onChange={(v) => update("needs_lighting", v)}
                />
                <Toggle
                  label="ضبط صدای اختصاصی"
                  value={!!form.needs_audio}
                  onChange={(v) => update("needs_audio", v)}
                />
                <Toggle
                  label="تصویربرداری هوایی"
                  value={!!form.aerial}
                  onChange={(v) => update("aerial", v)}
                />
                <Toggle
                  label="نریشن / صداپیشگی"
                  value={!!form.voiceover}
                  onChange={(v) => update("voiceover", v)}
                />
                <Toggle
                  label="زیرنویس"
                  value={!!form.subtitles}
                  onChange={(v) => update("subtitles", v)}
                />
                <Toggle
                  label="فیلم‌نامه اختصاصی"
                  value={!!form.scriptwriting}
                  onChange={(v) => update("scriptwriting", v)}
                />
                <Toggle
                  label="تحویل فوری"
                  value={!!form.rush}
                  onChange={(v) => update("rush", v)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <Field label="سبک روایت">
                <select
                  className="input"
                  value={form.style ?? ""}
                  onChange={(e) => update("style", e.target.value || null)}
                >
                  <option value="">—</option>
                  {STYLE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="یادداشت‌های تکمیلی">
                <textarea
                  rows={3}
                  className="input"
                  value={form.customer_notes ?? ""}
                  onChange={(e) => update("customer_notes", e.target.value)}
                  maxLength={2000}
                />
              </Field>
              <Field label="انتظارات از خروجی نهایی">
                <textarea
                  rows={3}
                  className="input"
                  value={form.expectations ?? ""}
                  onChange={(e) => update("expectations", e.target.value)}
                  maxLength={2000}
                />
              </Field>
              <Field label="محدوده بودجه تقریبی (اختیاری، نمایش داده نمی‌شود)">
                <input
                  className="input"
                  placeholder="مثلاً بین ۲۰ تا ۳۰ میلیون تومان"
                  value={form.budget_note ?? ""}
                  onChange={(e) => update("budget_note", e.target.value)}
                  maxLength={300}
                />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="روش ارتباط ترجیحی">
                  <select
                    className="input"
                    value={form.preferred_contact ?? ""}
                    onChange={(e) =>
                      update(
                        "preferred_contact",
                        (e.target.value || null) as
                          | "phone"
                          | "sms"
                          | "messenger"
                          | "email"
                          | null,
                      )
                    }
                  >
                    <option value="">—</option>
                    {CONTACT_METHODS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="بهترین زمان تماس">
                  <input
                    className="input"
                    placeholder="مثلاً ۱۸ تا ۲۱"
                    value={form.best_call_time ?? ""}
                    onChange={(e) => update("best_call_time", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 4 && draftId && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm">
                سفارش شما با کد <span className="font-mono font-bold">{draftCode}</span> به
                صورت پیش‌نویس ذخیره شد. می‌توانید فایل‌های مرجع (تصویر، ویدئو، صدا، لوگو،
                PDF یا نمونه) را بارگذاری کنید.
              </div>
              <OrderFileUploader orderId={draftId} />
            </div>
          )}

          {step === 5 && draftId && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                برای ثبت نهایی سفارش، لطفاً موارد زیر را تأیید کنید.
              </p>
              <Consent
                required
                value={!!form.consent_terms}
                onChange={(v) => update("consent_terms", v)}
              >
                قوانین و شرایط استفاده از خدمات را مطالعه کرده و می‌پذیرم.
              </Consent>
              <Consent
                required
                value={!!form.consent_file_ownership}
                onChange={(v) => update("consent_file_ownership", v)}
              >
                تأیید می‌کنم مالک فایل‌های ارسال‌شده هستم و حق نشر آن‌ها نقض نمی‌شود.
              </Consent>
              <Consent
                value={!!form.consent_ai_use}
                onChange={(v) => update("consent_ai_use", v)}
              >
                اجازه استفاده از ابزارهای هوش مصنوعی در فرآیند تولید (رنگ، تدوین) را می‌دهم.
              </Consent>
              <Consent
                value={!!form.consent_publish_portfolio}
                onChange={(v) => update("consent_publish_portfolio", v)}
              >
                اجازه استفاده از پروژه در نمونه‌کارهای استودیو را می‌دهم.
              </Consent>
              <Consent
                value={!!form.consent_face_voice_simulation}
                onChange={(v) => update("consent_face_voice_simulation", v)}
              >
                اجازه شبیه‌سازی چهره / صدا در صورت لزوم را می‌دهم.
              </Consent>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 0 || busy}
            className="rounded-md border border-border px-5 py-2 text-sm hover:bg-secondary transition disabled:opacity-40"
          >
            مرحله قبل
          </button>
          {step < 5 && (
            <button
              onClick={next}
              disabled={busy || !canGoNext}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              {step === 3 ? (busy ? "در حال ذخیره…" : "ذخیره و ادامه") : "مرحله بعد"}
            </button>
          )}
          {step === 5 && (
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              {busy ? "در حال ارسال…" : "ثبت نهایی سفارش"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border/70 bg-background/40 px-3 py-2 cursor-pointer hover:border-primary/50">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function Consent({
  value,
  onChange,
  required,
  children,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-border/60 bg-background/40 p-3 cursor-pointer hover:border-primary/50">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 accent-primary"
      />
      <span className="text-sm leading-6">
        {children}
        {required && <span className="text-primary"> *</span>}
      </span>
    </label>
  );
}

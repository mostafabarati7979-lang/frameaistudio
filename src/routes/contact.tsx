import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تماس با ما | استودیو فریم‌ای‌آی" },
      { name: "description", content: "برای ثبت درخواست پروژه و دریافت پیش‌فاکتور اختصاصی با تیم استودیو فریم‌ای‌آی در تماس باشید." },
      { property: "og:title", content: "تماس با استودیو فریم‌ای‌آی" },
      { property: "og:description", content: "ثبت درخواست و ارتباط با تیم ما." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="container-page py-16">
      <header className="max-w-2xl">
        <p className="text-xs tracking-widest text-[color:var(--gold)] uppercase">ارتباط با ما</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold">بیایید پروژه‌تان را شروع کنیم</h1>
        <p className="mt-4 text-muted-foreground leading-8">
          برای ثبت درخواست و دریافت پیش‌فاکتور اختصاصی، از فرم زیر استفاده کنید یا مستقیماً با ما تماس بگیرید.
        </p>
      </header>

      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          {[
            { icon: Phone, label: "تماس تلفنی", value: "۰۲۱-۰۰۰۰۰۰۰۰" },
            { icon: Mail, label: "ایمیل", value: "hello@frameai.studio" },
            { icon: MapPin, label: "آدرس", value: "تهران، ولیعصر" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
              <div className="rounded-lg bg-[color:var(--gold)]/10 p-3 text-[color:var(--gold)]">
                <c.icon size={20} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="mt-1 font-semibold">{c.value}</p>
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/5 p-5 text-sm text-foreground/80 leading-8">
            برای ثبت رسمی سفارش پس از ثبت‌نام، وارد پنل کاربری خود شوید. قیمت‌گذاری تنها بعد از بررسی جزئیات پروژه و در قالب پیش‌فاکتور اعلام می‌شود.
          </div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="نام و نام خانوادگی" name="name" placeholder="نام کامل شما" required />
            <Field label="شماره موبایل" name="mobile" placeholder="۰۹۱۲xxxxxxx" required inputMode="numeric" />
          </div>
          <Field label="ایمیل (اختیاری)" name="email" placeholder="example@mail.com" type="email" />
          <div>
            <label className="block text-sm font-medium mb-2">نوع خدمت مورد نظر</label>
            <select className="w-full rounded-md bg-secondary border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-[color:var(--gold)]">
              <option>فیلم عروسی</option>
              <option>فیلم فرمالیته</option>
              <option>کلیپ پیش‌عروسی</option>
              <option>تیزر سینمایی</option>
              <option>ریلز اینستاگرام</option>
              <option>تولید محتوای ماهانه</option>
              <option>سایر</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">توضیحات پروژه</label>
            <textarea
              rows={5}
              placeholder="کمی درباره پروژه، تاریخ، لوکیشن و انتظارات‌تان بنویسید…"
              className="w-full rounded-md bg-secondary border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-[color:var(--gold)]"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            پس از دریافت اطلاعات، تیم ما در کمترین زمان با شما تماس می‌گیرد و پیش‌فاکتور اختصاصی ارسال می‌کند.
          </p>
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition"
          >
            <Send size={16} />
            ارسال درخواست
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, placeholder, type = "text", required, inputMode }: {
  label: string; name: string; placeholder?: string; type?: string; required?: boolean; inputMode?: "numeric" | "text";
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-2">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full rounded-md bg-secondary border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-[color:var(--gold)]"
      />
    </div>
  );
}

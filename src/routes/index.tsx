import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Film, Sparkles, Clapperboard, Palette, ShieldCheck } from "lucide-react";
import { services, packages, portfolio, faqs } from "../lib/site-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "استودیو فریم‌ای‌آی | لحظه‌ی واقعی شما، با روایت سینمایی" },
      { name: "description", content: "فیلم عروسی، فرمالیته، تیزر سینمایی، ریلز و محتوای تبلیغاتی. استعلام قیمت و ثبت درخواست آنلاین." },
      { property: "og:title", content: "استودیو فریم‌ای‌آی | لحظه‌ی واقعی شما، با روایت سینمایی" },
      { property: "og:description", content: "فیلم عروسی، فرمالیته، تیزر سینمایی، ریلز و محتوای تبلیغاتی. استعلام قیمت و ثبت درخواست آنلاین." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        <div className="container-page relative py-24 md:py-36">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/5 px-4 py-1.5 text-xs text-[color:var(--gold)]">
              <Sparkles size={14} /> استودیو تخصصی روایت سینمایی
            </p>
            <h1 className="mt-6 text-4xl md:text-6xl font-extrabold leading-tight">
              لحظه‌ی <span className="text-gradient-gold">واقعی</span> شما،
              <br /> با روایت <span className="text-gradient-gold">سینمایی</span> آینده.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-8 max-w-2xl">
              از فیلم عروسی و فرمالیته تا تیزر تبلیغاتی و تولید محتوای ماهانه — تیم فریم‌ای‌آی، لحظه‌های شما را در قابی که سزاوارش هستید ثبت می‌کند.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
              >
                ثبت درخواست و دریافت پیش‌فاکتور
                <ArrowLeft size={16} />
              </Link>
              <Link
                to="/portfolio"
                className="inline-flex items-center gap-2 rounded-md border border-[color:var(--gold)]/40 px-6 py-3 text-sm font-semibold text-foreground hover:bg-[color:var(--gold)]/10 transition"
              >
                مشاهده نمونه‌کارها
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              قیمت‌ها پس از بررسی پروژه در قالب پیش‌فاکتور اختصاصی اعلام می‌شوند.
            </p>
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="container-page py-20">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { icon: Film, title: "روایت سینمایی", desc: "کارگردانی، نور و تدوین در سطح استانداردهای بین‌المللی." },
            { icon: Clapperboard, title: "تیم حرفه‌ای", desc: "کارگردان، فیلم‌بردار، صداگذار و رنگ‌شناس جداگانه." },
            { icon: Palette, title: "کیفیت هنری", desc: "نگاه هنرمندانه به هر فریم، از استوری‌بورد تا خروجی." },
            { icon: ShieldCheck, title: "قرارداد شفاف", desc: "پیش‌فاکتور، قرارداد رسمی و مسیر شفاف پرداخت." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 hover:border-[color:var(--gold)]/40 transition">
              <f.icon className="text-[color:var(--gold)]" size={24} />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-7">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="container-page py-16">
        <SectionHeader
          eyebrow="خدمات ما"
          title="از رویدادهای شخصی تا برندهای حرفه‌ای"
          desc="مجموعه‌ای از خدمات تخصصی، متناسب با نیاز شما."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 6).map((s) => (
            <article key={s.slug} className="group rounded-xl overflow-hidden border border-border bg-card">
              <div className="aspect-[16/10] overflow-hidden">
                <img src={s.cover} alt={s.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
              </div>
              <div className="p-5">
                <p className="text-xs text-[color:var(--gold)]">{s.category}</p>
                <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-7 line-clamp-2">{s.short}</p>
                <p className="mt-3 text-xs text-muted-foreground">قیمت پس از بررسی پروژه</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/services" className="inline-flex items-center gap-2 text-[color:var(--gold)] hover:underline">
            مشاهده همه خدمات <ArrowLeft size={14} />
          </Link>
        </div>
      </section>

      {/* PACKAGES */}
      <section className="bg-[color:var(--charcoal)] py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow="پکیج‌ها"
            title="پکیج‌های حرفه‌ای، بدون سردرگمی"
            desc="پکیج مورد نظرتان را انتخاب کنید و درخواست پیش‌فاکتور اختصاصی بدهید."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {packages.map((p) => (
              <div key={p.slug} className="relative rounded-2xl border border-border bg-card p-6 hover:border-[color:var(--gold)]/50 transition">
                {p.bestseller && (
                  <span className="absolute top-4 left-4 rounded-full bg-[color:var(--gold)] px-3 py-1 text-[10px] font-bold text-[color:var(--charcoal)]">
                    پرفروش
                  </span>
                )}
                <h3 className="text-xl font-bold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-7">{p.description}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.includes.map((i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 rounded-full bg-[color:var(--gold)]" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 pt-4 border-t border-border/70 text-xs text-muted-foreground space-y-1">
                  <p>خروجی: {p.outputs}</p>
                  <p>تحویل: {p.delivery}</p>
                </div>
                <Link to="/contact" className="mt-5 inline-flex w-full items-center justify-center rounded-md border border-[color:var(--gold)]/40 py-2.5 text-sm font-semibold text-[color:var(--gold)] hover:bg-[color:var(--gold)]/10 transition">
                  استعلام قیمت
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PORTFOLIO */}
      <section className="container-page py-20">
        <SectionHeader
          eyebrow="نمونه‌کارها"
          title="از قاب‌های ما"
          desc="گزیده‌ای از کارهای منتخب استودیو."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {portfolio.slice(0, 8).map((item) => (
            <Link
              key={item.slug}
              to="/portfolio/$slug"
              params={{ slug: item.slug }}
              className="group relative overflow-hidden rounded-lg aspect-[4/5]"
            >
              <img src={item.cover} alt={item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              {item.isDemo && (
                <span className="absolute top-3 right-3 rounded-full bg-[color:var(--gold)] px-2.5 py-0.5 text-[10px] font-bold text-[color:var(--charcoal)]">Demo</span>
              )}
              <div className="absolute bottom-0 right-0 left-0 p-4">
                <p className="text-xs text-[color:var(--gold-soft)]">{item.category}</p>
                <h3 className="mt-1 text-base font-semibold text-white">{item.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[color:var(--charcoal)] py-20">
        <div className="container-page max-w-3xl">
          <SectionHeader eyebrow="سوالات متداول" title="پاسخ به پرتکرارترین سوال‌ها" />
          <div className="mt-8 space-y-3">
            {faqs.slice(0, 4).map((f) => (
              <details key={f.q} className="group rounded-xl border border-border bg-card p-5 open:border-[color:var(--gold)]/40">
                <summary className="cursor-pointer list-none flex items-center justify-between font-semibold">
                  <span>{f.q}</span>
                  <span className="text-[color:var(--gold)] group-open:rotate-45 transition">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-7">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-24">
        <div className="relative overflow-hidden rounded-3xl border border-[color:var(--gold)]/30 bg-gradient-to-br from-[color:var(--charcoal)] via-[color:var(--charcoal)] to-[#1c1a12] p-10 md:p-16 text-center">
          <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-[color:var(--gold)]/10 blur-3xl" />
          <h2 className="text-3xl md:text-4xl font-bold">آماده‌اید لحظه‌های خود را ثبت کنید؟</h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto leading-8">
            درخواست خود را ثبت کنید تا تیم ما پروژه شما را بررسی و پیش‌فاکتور اختصاصی برایتان ارسال کند.
          </p>
          <Link to="/contact" className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-8 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition">
            ثبت درخواست
            <ArrowLeft size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="text-center">
      <p className="text-xs tracking-widest text-[color:var(--gold)] uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-3xl md:text-4xl font-bold">{title}</h2>
      {desc && <p className="mt-3 text-muted-foreground max-w-2xl mx-auto leading-8">{desc}</p>}
      <div className="gold-divider mt-6 max-w-[120px] mx-auto" />
    </div>
  );
}

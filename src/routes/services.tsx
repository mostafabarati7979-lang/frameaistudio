import { createFileRoute, Link } from "@tanstack/react-router";
import { services } from "../lib/site-data";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "خدمات استودیو | فریم‌ای‌آی" },
      { name: "description", content: "فهرست کامل خدمات استودیو فریم‌ای‌آی؛ از فیلم عروسی و فرمالیته تا تیزر سینمایی و تولید محتوا." },
      { property: "og:title", content: "خدمات استودیو فریم‌ای‌آی" },
      { property: "og:description", content: "خدمات تخصصی روایت سینمایی رویدادها و برندها." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const categories = Array.from(new Set(services.map((s) => s.category)));
  return (
    <div className="container-page py-16">
      <header className="max-w-2xl">
        <p className="text-xs tracking-widest text-[color:var(--gold)] uppercase">خدمات</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold">خدمات استودیو فریم‌ای‌آی</h1>
        <p className="mt-4 text-muted-foreground leading-8">
          هر پروژه ویژه است. قیمت‌ها پس از بررسی جزئیات پروژه در قالب پیش‌فاکتور اختصاصی ارسال می‌شوند.
        </p>
      </header>

      {categories.map((cat) => (
        <section key={cat} className="mt-14">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{cat}</h2>
            <div className="gold-divider flex-1" />
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.filter((s) => s.category === cat).map((s) => (
              <article key={s.slug} className="group rounded-xl overflow-hidden border border-border bg-card hover:border-[color:var(--gold)]/40 transition">
                <div className="aspect-[16/10] overflow-hidden">
                  <img src={s.cover} alt={s.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-7">{s.full}</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {s.features.slice(0, 3).map((f) => (
                      <li key={f} className="text-[11px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground">
                    <span>تحویل: {s.delivery}</span>
                    <span>{s.revisions}</span>
                  </div>
                  <Link to="/contact" className="mt-4 block text-center rounded-md border border-[color:var(--gold)]/40 py-2 text-sm font-semibold text-[color:var(--gold)] hover:bg-[color:var(--gold)]/10 transition">
                    استعلام قیمت
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { portfolio } from "../lib/site-data";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "نمونه‌کارها | استودیو فریم‌ای‌آی" },
      { name: "description", content: "گزیده‌ای از نمونه‌کارهای استودیو فریم‌ای‌آی؛ عروسی، فرمالیته، تیزر و محتوای تبلیغاتی." },
      { property: "og:title", content: "نمونه‌کارهای استودیو فریم‌ای‌آی" },
      { property: "og:description", content: "روایت‌های سینمایی ما را ببینید." },
    ],
  }),
  component: PortfolioLayout,
});

function PortfolioLayout() {
  const matches = useMatches();
  const isChild = matches.some((m) => m.routeId === "/portfolio/$slug");
  if (isChild) return <Outlet />;
  return <PortfolioIndex />;
}

function PortfolioIndex() {
  const categories = ["همه", ...Array.from(new Set(portfolio.map((p) => p.category)))];
  return (
    <div className="container-page py-16">
      <header className="max-w-2xl">
        <p className="text-xs tracking-widest text-[color:var(--gold)] uppercase">نمونه‌کارها</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold">قاب‌های ما</h1>
        <p className="mt-4 text-muted-foreground leading-8">
          گزیده‌ای از پروژه‌های استودیو. نمونه‌هایی که با برچسب Demo مشخص شده‌اند صرفاً برای نمایش سبک کاری هستند.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-2">
        {categories.map((c) => (
          <span key={c} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            {c}
          </span>
        ))}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {portfolio.map((item) => (
          <Link
            key={item.slug}
            to="/portfolio/$slug"
            params={{ slug: item.slug }}
            className="group relative overflow-hidden rounded-xl aspect-[4/5]"
          >
            <img src={item.cover} alt={item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            {item.isDemo && (
              <span className="absolute top-3 right-3 rounded-full bg-[color:var(--gold)] px-2.5 py-0.5 text-[10px] font-bold text-[color:var(--charcoal)]">Demo</span>
            )}
            <div className="absolute bottom-0 right-0 left-0 p-5">
              <p className="text-xs text-[color:var(--gold-soft)]">{item.category}</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-1 text-xs text-white/70">{item.year}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

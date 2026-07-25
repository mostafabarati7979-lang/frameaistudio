import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { portfolio } from "../lib/site-data";

export const Route = createFileRoute("/portfolio/$slug")({
  loader: ({ params }) => {
    const item = portfolio.find((p) => p.slug === params.slug);
    if (!item) throw notFound();
    return { item };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "نمونه‌کار پیدا نشد" }, { name: "robots", content: "noindex" }] };
    }
    const { item } = loaderData;
    return {
      meta: [
        { title: `${item.title} | نمونه‌کار فریم‌ای‌آی` },
        { name: "description", content: item.description },
        { property: "og:title", content: item.title },
        { property: "og:description", content: item.description },
        { property: "og:image", content: item.cover },
        { name: "twitter:image", content: item.cover },
      ],
    };
  },
  component: PortfolioDetail,
});

function PortfolioDetail() {
  const { item } = Route.useLoaderData();
  const related = portfolio.filter((p) => p.slug !== item.slug && p.category === item.category).slice(0, 3);

  return (
    <article className="pb-16">
      <div className="relative aspect-[21/9] w-full overflow-hidden">
        <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>
      <div className="container-page -mt-24 relative">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[color:var(--gold)]/15 text-[color:var(--gold)] px-3 py-1 text-xs">{item.category}</span>
            {item.isDemo && (
              <span className="rounded-full bg-[color:var(--gold)] px-2.5 py-0.5 text-[10px] font-bold text-[color:var(--charcoal)]">Demo</span>
            )}
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold">{item.title}</h1>
          <p className="mt-3 text-muted-foreground">
            {item.client} — {item.year}
          </p>
          <p className="mt-6 text-lg text-foreground/90 leading-9">{item.description}</p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link to="/contact" className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
              ثبت درخواست مشابه
            </Link>
            <Link to="/portfolio" className="rounded-md border border-border px-6 py-3 text-sm font-semibold hover:bg-secondary transition">
              بازگشت به گالری
            </Link>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="text-2xl font-bold">نمونه‌های مشابه</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {related.map((r) => (
                <Link key={r.slug} to="/portfolio/$slug" params={{ slug: r.slug }} className="group block rounded-lg overflow-hidden aspect-[4/5] relative">
                  <img src={r.cover} alt={r.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 right-0 left-0 p-4">
                    <p className="text-xs text-[color:var(--gold-soft)]">{r.category}</p>
                    <h3 className="text-white font-semibold">{r.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}

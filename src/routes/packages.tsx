import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { packagesQuery } from "../lib/content-queries";
import { ContentErrorState, EmptyState } from "../components/site/ContentStates";

export const Route = createFileRoute("/packages")({
  loader: ({ context }) => context.queryClient.ensureQueryData(packagesQuery()),
  head: () => ({
    meta: [
      { title: "پکیج‌های استودیو | فریم‌ای‌آی" },
      { name: "description", content: "پکیج‌های حرفه‌ای فیلم و محتوای سینمایی: دعوت‌نامه دیجیتال، ریلز فرمالیته، فرمالیته سینمایی، عروسی حرفه‌ای و تولید محتوای ماهانه." },
      { property: "og:title", content: "پکیج‌های استودیو فریم‌ای‌آی" },
      { property: "og:description", content: "پکیج‌های حرفه‌ای، بدون سردرگمی. قیمت پس از بررسی پروژه." },
    ],
  }),
  errorComponent: ContentErrorState,
  component: PackagesPage,
});

function PackagesPage() {
  const { data: packages } = useSuspenseQuery(packagesQuery());

  return (
    <div className="container-page py-16">
      <header className="max-w-2xl">
        <p className="text-xs tracking-widest text-[color:var(--gold)] uppercase">پکیج‌ها</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold">پکیج‌های استودیو</h1>
        <p className="mt-4 text-muted-foreground leading-8">
          بسته‌های آماده برای رایج‌ترین نیازها. تنها با یک درخواست، پیش‌فاکتور اختصاصی خود را دریافت کنید.
        </p>
      </header>

      {packages.length === 0 ? (
        <div className="mt-12">
          <EmptyState message="هنوز پکیجی منتشر نشده است." />
        </div>
      ) : (
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <div key={p.slug} className="relative rounded-2xl border border-border bg-card overflow-hidden hover:border-[color:var(--gold)]/50 transition">
              <div className="aspect-[16/9] overflow-hidden">
                <img src={p.cover} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
              </div>
              {p.bestseller && (
                <span className="absolute top-4 left-4 rounded-full bg-[color:var(--gold)] px-3 py-1 text-[10px] font-bold text-[color:var(--charcoal)]">
                  پرفروش
                </span>
              )}
              <div className="p-6">
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
                <div className="mt-5 pt-4 border-t border-border/70 grid grid-cols-2 text-xs text-muted-foreground gap-2">
                  <p>خروجی: {p.outputs}</p>
                  <p>تحویل: {p.delivery}</p>
                </div>
                <div className="mt-5 rounded-lg bg-[color:var(--gold)]/10 p-3 text-center text-xs text-[color:var(--gold-soft)]">
                  قیمت پس از بررسی پروژه اعلام می‌شود
                </div>
                <Link to="/contact" className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
                  ثبت درخواست و دریافت پیش‌فاکتور
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

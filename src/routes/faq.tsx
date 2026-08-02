import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { faqsQuery } from "../lib/content-queries";
import { toFaq } from "../lib/content-types";
import { ContentErrorState, EmptyState } from "../components/site/ContentStates";

export const Route = createFileRoute("/faq")({
  loader: ({ context }) => context.queryClient.ensureQueryData(faqsQuery()),
  head: ({ loaderData }) => {
    const faqs = (loaderData ?? []).filter((r) => r.kind === "faq").map(toFaq);
    return {
      meta: [
        { title: "سوالات متداول | استودیو فریم‌ای‌آی" },
        { name: "description", content: "پاسخ به سوالات متداول درباره خدمات، فرآیند سفارش، تحویل و اصلاحات استودیو فریم‌ای‌آی." },
        { property: "og:title", content: "سوالات متداول" },
        { property: "og:description", content: "پاسخ سوال‌های پرتکرار شما." },
        { property: "og:url", content: "https://frameaistudio.lovable.app/faq" },
      ],
      links: [{ rel: "canonical", href: "https://frameaistudio.lovable.app/faq" }],
      scripts:
        faqs.length > 0
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: faqs.map((f) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a },
                  })),
                }),
              },
            ]
          : [],
    };
  },
  errorComponent: ContentErrorState,
  component: FAQPage,
});

function FAQPage() {
  const { data: faqs } = useSuspenseQuery(faqsQuery());

  return (
    <div className="container-page py-16 max-w-3xl">
      <header>
        <p className="text-xs tracking-widest text-[color:var(--gold)] uppercase">سوالات متداول</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold">پاسخ به سوال‌های شما</h1>
        <p className="mt-4 text-muted-foreground leading-8">
          اگر سوالی دارید که پاسخش را اینجا پیدا نکردید، از طریق فرم تماس با ما در ارتباط باشید.
        </p>
      </header>

      <div className="mt-10 space-y-3">
        {faqs.length === 0 ? (
          <EmptyState message="هنوز سوالی منتشر نشده است." />
        ) : (
          faqs.map((f, idx) => (
            <details key={f.q} className="group rounded-xl border border-border bg-card p-5 open:border-[color:var(--gold)]/40" open={idx === 0}>
              <summary className="cursor-pointer list-none flex items-center justify-between font-semibold">
                <span>{f.q}</span>
                <span className="text-[color:var(--gold)] group-open:rotate-45 transition text-xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-8">{f.a}</p>
            </details>
          ))
        )}
      </div>

      <div className="mt-12 text-center">
        <Link to="/contact" className="inline-block rounded-md bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">
          سوال دیگری دارم
        </Link>
      </div>
    </div>
  );
}

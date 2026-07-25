import { createFileRoute, Link } from "@tanstack/react-router";
import { posts } from "../lib/site-data";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "وبلاگ | استودیو فریم‌ای‌آی" },
      { name: "description", content: "مقاله‌ها و نکته‌های تخصصی درباره فیلم‌سازی سینمایی، عروسی و تولید محتوا." },
      { property: "og:title", content: "وبلاگ استودیو فریم‌ای‌آی" },
      { property: "og:description", content: "دانش و نگاه سینمایی، در قالب مقاله." },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  return (
    <div className="container-page py-16">
      <header className="max-w-2xl">
        <p className="text-xs tracking-widest text-[color:var(--gold)] uppercase">وبلاگ</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold">مقاله‌ها و دیدگاه‌ها</h1>
        <p className="mt-4 text-muted-foreground leading-8">
          نگاه تخصصی تیم فریم‌ای‌آی درباره فیلم‌سازی، عروسی و برندسازی.
        </p>
      </header>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <Link
            key={p.slug}
            to="/blog/$slug"
            params={{ slug: p.slug }}
            className="group rounded-xl overflow-hidden border border-border bg-card hover:border-[color:var(--gold)]/40 transition"
          >
            <div className="aspect-[16/10] overflow-hidden">
              <img src={p.cover} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{p.date}</span>
                <span>•</span>
                <span>{p.readTime}</span>
              </div>
              <h2 className="mt-2 text-lg font-semibold group-hover:text-[color:var(--gold)] transition">{p.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-7 line-clamp-2">{p.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

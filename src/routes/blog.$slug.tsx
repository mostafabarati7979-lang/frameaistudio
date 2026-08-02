import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { postsQuery } from "../lib/content-queries";
import { ContentErrorState, ContentNotFound } from "../components/site/ContentStates";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ context, params }) => {
    const rows = await context.queryClient.ensureQueryData(postsQuery());
    const post = postsQuery().select(rows).find((p) => p.slug === params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "مقاله پیدا نشد" }, { name: "robots", content: "noindex" }] };
    }
    const { post } = loaderData;
    const url = `https://frameaistudio.lovable.app/blog/${params.slug}`;
    return {
      meta: [
        { title: `${post.title} | وبلاگ فریم‌ای‌آی` },
        { name: "description", content: post.excerpt },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.excerpt },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: post.cover },
        { name: "twitter:image", content: post.cover },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.excerpt,
            image: post.cover,
            datePublished: post.date,
            author: { "@type": "Organization", name: "استودیو فریم‌ای‌آی" },
            publisher: {
              "@type": "Organization",
              name: "استودیو فریم‌ای‌آی",
              logo: {
                "@type": "ImageObject",
                url: "https://frameaistudio.lovable.app/favicon.ico",
              },
            },
            mainEntityOfPage: url,
          }),
        },
      ],
    };
  },
  errorComponent: ContentErrorState,
  notFoundComponent: () => <ContentNotFound message="مقاله پیدا نشد" />,
  component: BlogPost,
});

function BlogPost() {
  const { post } = Route.useLoaderData();
  return (
    <article className="pb-16">
      <div className="relative aspect-[21/9] w-full overflow-hidden">
        <img src={post.cover} alt={post.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>
      <div className="container-page -mt-24 relative max-w-3xl">
        <p className="text-xs text-[color:var(--gold)]">{post.date} • {post.readTime}</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold leading-tight">{post.title}</h1>
        <p className="mt-6 text-lg text-foreground/90 leading-9">{post.excerpt}</p>
        <div className="gold-divider my-8 max-w-[120px]" />
        <div className="prose-invert leading-9 text-foreground/85 whitespace-pre-line">{post.body}</div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link to="/blog" className="rounded-md border border-border px-5 py-2.5 text-sm hover:bg-secondary transition">
            بازگشت به وبلاگ
          </Link>
          <Link to="/contact" className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            ثبت درخواست پروژه
          </Link>
        </div>
      </div>
    </article>
  );
}

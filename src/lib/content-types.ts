// Shared, client-safe types + mappers for database-driven public site content.
export type ContentKind = "service" | "package" | "portfolio" | "blog" | "faq" | "page";

export interface ContentRow {
  id: string;
  kind: ContentKind;
  slug: string | null;
  title: string;
  summary: string | null;
  body: Record<string, unknown> | null;
  cover_url: string | null;
  sort_order: number;
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const bool = (v: unknown): boolean => v === true;

export interface Service {
  slug: string;
  title: string;
  category: string;
  short: string;
  full: string;
  features: string[];
  delivery: string;
  revisions: string;
  cover: string;
}

export interface Package {
  slug: string;
  title: string;
  description: string;
  includes: string[];
  outputs: string;
  delivery: string;
  bestseller: boolean;
  cover: string;
}

export interface PortfolioItem {
  slug: string;
  title: string;
  description: string;
  category: string;
  client: string;
  year: string;
  isDemo: boolean;
  cover: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  date: string;
  readTime: string;
  cover: string;
}

export function toService(r: ContentRow): Service {
  const b = r.body ?? {};
  return {
    slug: r.slug ?? r.id,
    title: r.title,
    category: str(b['category'], "خدمات"),
    short: r.summary ?? "",
    full: str(b['full'], r.summary ?? ""),
    features: strArr(b['features']),
    delivery: str(b['delivery']),
    revisions: str(b['revisions']),
    cover: r.cover_url ?? "",
  };
}

export function toPackage(r: ContentRow): Package {
  const b = r.body ?? {};
  return {
    slug: r.slug ?? r.id,
    title: r.title,
    description: r.summary ?? "",
    includes: strArr(b['includes']),
    outputs: str(b['outputs']),
    delivery: str(b['delivery']),
    bestseller: bool(b['bestseller']),
    cover: r.cover_url ?? "",
  };
}

export function toPortfolio(r: ContentRow): PortfolioItem {
  const b = r.body ?? {};
  return {
    slug: r.slug ?? r.id,
    title: r.title,
    description: r.summary ?? "",
    category: str(b['category'], "پروژه"),
    client: str(b['client']),
    year: str(b['year']),
    isDemo: bool(b['isDemo']),
    cover: r.cover_url ?? "",
  };
}

export function toFaq(r: ContentRow): Faq {
  const b = r.body ?? {};
  return { q: r.title, a: str(b['answer'], r.summary ?? "") };
}

export function toPost(r: ContentRow): BlogPost {
  const b = r.body ?? {};
  return {
    slug: r.slug ?? r.id,
    title: r.title,
    excerpt: r.summary ?? "",
    body: str(b['content'], r.summary ?? ""),
    date: str(b['date']),
    readTime: str(b['readTime']),
    cover: r.cover_url ?? "",
  };
}

import { queryOptions } from "@tanstack/react-query";
import { listPublicContent } from "./content.functions";
import {
  toFaq,
  toPackage,
  toPortfolio,
  toPost,
  toService,
  type ContentKind,
  type ContentRow,
} from "./content-types";

function contentQuery(kinds: ContentKind[]) {
  return queryOptions({
    queryKey: ["public-content", ...kinds],
    queryFn: () => listPublicContent({ data: { kinds } }) as Promise<ContentRow[]>,
    staleTime: 5 * 60 * 1000,
  });
}

const pick = (rows: ContentRow[], kind: ContentKind) => rows.filter((r) => r.kind === kind);

export const servicesQuery = () => ({
  ...contentQuery(["service"]),
  select: (rows: ContentRow[]) => pick(rows, "service").map(toService),
});

export const packagesQuery = () => ({
  ...contentQuery(["package"]),
  select: (rows: ContentRow[]) => pick(rows, "package").map(toPackage),
});

export const portfolioQuery = () => ({
  ...contentQuery(["portfolio"]),
  select: (rows: ContentRow[]) => pick(rows, "portfolio").map(toPortfolio),
});

export const postsQuery = () => ({
  ...contentQuery(["blog"]),
  select: (rows: ContentRow[]) => pick(rows, "blog").map(toPost),
});

export const faqsQuery = () => ({
  ...contentQuery(["faq"]),
  select: (rows: ContentRow[]) => pick(rows, "faq").map(toFaq),
});

export const homeContentQuery = () => ({
  ...contentQuery(["service", "package", "portfolio", "faq"]),
  select: (rows: ContentRow[]) => ({
    services: pick(rows, "service").map(toService),
    packages: pick(rows, "package").map(toPackage),
    portfolio: pick(rows, "portfolio").map(toPortfolio),
    faqs: pick(rows, "faq").map(toFaq),
  }),
});

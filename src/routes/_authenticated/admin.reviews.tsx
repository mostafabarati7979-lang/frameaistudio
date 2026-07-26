import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  adminListReviews,
  adminSetReviewPublished,
} from "@/lib/reviews.functions";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  head: () => ({
    meta: [
      { title: "مدیریت نظرات | FrameAI Studio" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminReviewsPage,
});

function AdminReviewsPage() {
  const list = useServerFn(adminListReviews);
  const setPub = useServerFn(adminSetReviewPublished);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => list({}),
  });
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(id: string, is_published: boolean) {
    setBusy(id);
    try {
      await setPub({ data: { id, is_published } });
      toast.success(is_published ? "منتشر شد." : "از انتشار خارج شد.");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) return <p className="p-6">در حال بارگذاری…</p>;
  const items = (data as any)?.items ?? [];

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold mb-6">مدیریت نظرات مشتریان</h1>
      {items.length === 0 && (
        <p className="text-muted-foreground">هنوز نظری ثبت نشده است.</p>
      )}
      <ul className="space-y-3">
        {items.map((r: any) => (
          <li
            key={r.id}
            className="rounded-xl border border-border/70 bg-card/40 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[color:var(--gold)] text-lg leading-none">
                  {"★".repeat(r.rating)}
                  <span className="text-muted-foreground/40">
                    {"★".repeat(5 - r.rating)}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {new Date(r.created_at).toLocaleString("fa-IR")}
                </p>
              </div>
              <button
                onClick={() => toggle(r.id, !r.is_published)}
                disabled={busy === r.id}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  r.is_published
                    ? "border border-border hover:bg-secondary"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                } disabled:opacity-50`}
              >
                {r.is_published ? "خروج از انتشار" : "انتشار"}
              </button>
            </div>
            {r.comment && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                {r.comment}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

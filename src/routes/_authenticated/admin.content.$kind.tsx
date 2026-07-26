import { useState } from "react";
import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminListContent,
  adminUpsertContent,
  adminDeleteContent,
  type ContentKind,
} from "@/lib/cms.functions";

const KIND_META: Record<
  ContentKind,
  { title: string; hasSlug: boolean; hasCover: boolean; bodyLabel: string }
> = {
  service: {
    title: "خدمات",
    hasSlug: true,
    hasCover: false,
    bodyLabel: "ویژگی‌ها (هر خط یک مورد)",
  },
  package: {
    title: "پکیج‌ها",
    hasSlug: true,
    hasCover: false,
    bodyLabel: "مواردی که شامل می‌شود (هر خط یک مورد)",
  },
  portfolio: {
    title: "نمونه‌کارها",
    hasSlug: true,
    hasCover: true,
    bodyLabel: "توضیح پروژه",
  },
  blog: {
    title: "وبلاگ",
    hasSlug: true,
    hasCover: true,
    bodyLabel: "متن مقاله (Markdown)",
  },
  faq: {
    title: "سوالات متداول",
    hasSlug: false,
    hasCover: false,
    bodyLabel: "پاسخ",
  },
  page: {
    title: "صفحات محتوایی",
    hasSlug: true,
    hasCover: false,
    bodyLabel: "متن صفحه",
  },
};

export const Route = createFileRoute("/_authenticated/admin/content/$kind")({
  head: () => ({
    meta: [
      { title: "مدیریت محتوا | FrameAI Studio" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ContentAdminPage,
});

type Row = {
  id: string;
  kind: ContentKind;
  slug: string | null;
  title: string;
  summary: string | null;
  body: any;
  cover_url: string | null;
  sort_order: number;
  is_published: boolean;
};

function ContentAdminPage() {
  const { kind } = useParams({
    from: "/_authenticated/admin/content/$kind",
  }) as { kind: ContentKind };
  const meta = KIND_META[kind];
  if (!meta) return <p className="p-6">دسته نامعتبر است.</p>;

  const list = useServerFn(adminListContent);
  const upsert = useServerFn(adminUpsertContent);
  const del = useServerFn(adminDeleteContent);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["cms", kind],
    queryFn: () => list({ data: { kind } }),
  });

  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [busy, setBusy] = useState(false);

  function toBody(text: string): any {
    // for services/packages/faq use lines[]; for blog/portfolio/page store raw markdown/text.
    if (kind === "service" || kind === "package") {
      const lines = text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      return { features: lines };
    }
    if (kind === "faq") return { answer: text };
    return { text };
  }
  function fromBody(body: any): string {
    if (!body) return "";
    if (Array.isArray(body.features)) return body.features.join("\n");
    if (typeof body.answer === "string") return body.answer;
    if (typeof body.text === "string") return body.text;
    return "";
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await upsert({
        data: {
          id: editing.id,
          kind,
          title: String(f.get("title") ?? "").trim(),
          slug: meta.hasSlug ? String(f.get("slug") ?? "").trim() || null : null,
          summary: String(f.get("summary") ?? "").trim() || null,
          cover_url: meta.hasCover
            ? String(f.get("cover_url") ?? "").trim() || null
            : null,
          sort_order: Number(f.get("sort_order") ?? 0),
          is_published: f.get("is_published") === "on",
          body: toBody(String(f.get("body") ?? "")),
        },
      });
      toast.success("ذخیره شد.");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["cms", kind] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("این مورد حذف شود؟")) return;
    try {
      await del({ data: { id } });
      qc.invalidateQueries({ queryKey: ["cms", kind] });
      toast.success("حذف شد.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const items: Row[] = (data as any)?.items ?? [];

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{meta.title}</h1>
          <p className="text-sm text-muted-foreground">
            افزودن، ویرایش و انتشار محتوای این بخش.
          </p>
        </div>
        <button
          onClick={() =>
            setEditing({
              kind,
              title: "",
              slug: "",
              summary: "",
              body: {},
              cover_url: "",
              sort_order: items.length,
              is_published: false,
            })
          }
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          مورد جدید
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {(Object.keys(KIND_META) as ContentKind[]).map((k) => (
          <Link
            key={k}
            to="/admin/content/$kind"
            params={{ kind: k }}
            className={`rounded-md border border-border px-3 py-1 hover:bg-secondary ${
              k === kind ? "bg-secondary text-[color:var(--gold)]" : ""
            }`}
          >
            {KIND_META[k].title}
          </Link>
        ))}
      </div>

      {isLoading ? (
        <p>در حال بارگذاری…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">هنوز موردی ثبت نشده است.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li
              key={r.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-card/40 p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{r.title}</p>
                  <span
                    className={`text-[10px] rounded px-2 py-0.5 ${
                      r.is_published
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r.is_published ? "منتشر شده" : "پیش‌نویس"}
                  </span>
                  {r.slug && (
                    <span className="text-[11px] text-muted-foreground">
                      /{r.slug}
                    </span>
                  )}
                </div>
                {r.summary && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {r.summary}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(r)}
                  className="rounded-md border border-border px-3 py-1 text-sm hover:bg-secondary"
                >
                  ویرایش
                </button>
                <button
                  onClick={() => onDelete(r.id)}
                  className="rounded-md border border-destructive/60 text-destructive px-3 py-1 text-sm hover:bg-destructive/10"
                >
                  حذف
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center overflow-auto p-4"
          onClick={() => setEditing(null)}
        >
          <form
            onSubmit={onSave}
            onClick={(e) => e.stopPropagation()}
            className="mt-8 w-full max-w-2xl rounded-xl border border-border/70 bg-card p-5 space-y-3"
          >
            <h2 className="text-lg font-semibold">
              {editing.id ? "ویرایش" : "افزودن"} — {meta.title}
            </h2>
            <label className="block text-sm">
              عنوان
              <input
                name="title"
                required
                defaultValue={editing.title ?? ""}
                className="input mt-1 w-full"
              />
            </label>
            {meta.hasSlug && (
              <label className="block text-sm">
                Slug (اختیاری)
                <input
                  name="slug"
                  defaultValue={editing.slug ?? ""}
                  pattern="[a-z0-9-]*"
                  className="input mt-1 w-full"
                />
              </label>
            )}
            <label className="block text-sm">
              خلاصه
              <textarea
                name="summary"
                rows={2}
                defaultValue={editing.summary ?? ""}
                className="input mt-1 w-full"
              />
            </label>
            <label className="block text-sm">
              {meta.bodyLabel}
              <textarea
                name="body"
                rows={7}
                defaultValue={fromBody(editing.body)}
                className="input mt-1 w-full font-mono text-xs"
              />
            </label>
            {meta.hasCover && (
              <label className="block text-sm">
                آدرس تصویر کاور
                <input
                  name="cover_url"
                  type="url"
                  defaultValue={editing.cover_url ?? ""}
                  className="input mt-1 w-full"
                />
              </label>
            )}
            <div className="flex items-center gap-4">
              <label className="text-sm flex items-center gap-2">
                ترتیب
                <input
                  name="sort_order"
                  type="number"
                  min={0}
                  defaultValue={editing.sort_order ?? 0}
                  className="input w-24"
                />
              </label>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_published"
                  defaultChecked={editing.is_published ?? false}
                />
                منتشر شود
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-border px-4 py-2 text-sm"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                ذخیره
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

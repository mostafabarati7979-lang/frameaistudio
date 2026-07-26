import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listProject,
  adminBootstrapMilestones,
  adminUpdateMilestone,
  adminCreateDeliverableUpload,
  adminRegisterDeliverable,
  adminDeleteDeliverable,
  signDeliverableUrl,
} from "@/lib/projects.functions";

const STATUS_OPTIONS = [
  { value: "pending", label: "در انتظار" },
  { value: "in_progress", label: "در حال انجام" },
  { value: "delivered", label: "تحویل‌شده" },
  { value: "accepted", label: "تأیید‌شده" },
  { value: "revision_requested", label: "درخواست اصلاحیه" },
  { value: "skipped", label: "رد شده" },
] as const;

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function AdminProjectPanel({ orderId }: { orderId: string }) {
  const list = useServerFn(listProject);
  const bootstrap = useServerFn(adminBootstrapMilestones);
  const update = useServerFn(adminUpdateMilestone);
  const createUpload = useServerFn(adminCreateDeliverableUpload);
  const register = useServerFn(adminRegisterDeliverable);
  const del = useServerFn(adminDeleteDeliverable);
  const sign = useServerFn(signDeliverableUrl);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin-project", orderId],
    queryFn: () => list({ data: { order_id: orderId } }),
  });

  const [notes, setNotes] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  if (!data) return null;
  const { milestones, deliverables } = data as any;

  async function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-project", orderId] });
    qc.invalidateQueries({ queryKey: ["admin-order", orderId] });
  }

  async function onBootstrap() {
    try {
      await bootstrap({ data: { order_id: orderId } });
      toast.success("مراحل پروژه ایجاد شد.");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onSetStatus(milestoneId: string, status: string) {
    try {
      await update({
        data: {
          milestone_id: milestoneId,
          status: status as any,
          admin_notes: notes[milestoneId] ?? undefined,
        },
      });
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onUpload(milestoneId: string, file: File, isFinal: boolean) {
    setUploading(milestoneId);
    try {
      const { path, token } = (await createUpload({
        data: { milestone_id: milestoneId, file_name: file.name },
      })) as any;
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.storage
        .from("order-files")
        .uploadToSignedUrl(path, token, file);
      if (error) throw new Error("آپلود ناموفق بود: " + error.message);
      await register({
        data: {
          milestone_id: milestoneId,
          storage_path: path,
          file_name: file.name,
          content_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          is_final_output: isFinal,
        },
      });
      toast.success("فایل بارگذاری شد.");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  }

  async function onDeleteFile(id: string) {
    if (!confirm("این فایل حذف شود؟")) return;
    try {
      await del({ data: { deliverable_id: id } });
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onPreview(id: string) {
    try {
      const { url } = (await sign({ data: { deliverable_id: id } })) as any;
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">مدیریت پروژه</h2>
        {(!milestones || milestones.length === 0) && (
          <button
            onClick={onBootstrap}
            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            ایجاد مراحل پیش‌فرض
          </button>
        )}
      </div>

      <ol className="space-y-3">
        {(milestones ?? []).map((m: any) => {
          const files = (deliverables as any[]).filter((d) => d.milestone_id === m.id);
          const isFinalMs = m.key === "final_output";
          return (
            <li key={m.id} className="rounded-xl border border-border/70 bg-card/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {m.sort_order}. {m.title}
                </p>
                <select
                  className="input h-8 text-xs"
                  value={m.status}
                  onChange={(e) => onSetStatus(m.id, e.target.value)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {m.description && (
                <p className="mt-1 text-xs text-muted-foreground leading-6">{m.description}</p>
              )}

              <textarea
                rows={2}
                className="input mt-3"
                placeholder="یادداشت مدیر (اختیاری)"
                defaultValue={m.admin_notes ?? ""}
                onBlur={(e) => {
                  if ((e.target.value || null) !== (m.admin_notes ?? null)) {
                    update({
                      data: {
                        milestone_id: m.id,
                        admin_notes: e.target.value || null,
                      },
                    }).then(refresh);
                  }
                }}
              />
              {m.customer_notes && (
                <p className="mt-1 text-xs text-muted-foreground">
                  یادداشت مشتری: {m.customer_notes}
                </p>
              )}

              {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {files.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 p-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate">{f.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtBytes(f.size_bytes)}
                          {f.is_final_output ? " • خروجی نهایی" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onPreview(f.id)}
                          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary"
                        >
                          پیش‌نمایش
                        </button>
                        <button
                          onClick={() => onDeleteFile(f.id)}
                          className="rounded-md border border-destructive/50 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                        >
                          حذف
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <label className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>افزودن فایل تحویل:</span>
                <input
                  type="file"
                  disabled={uploading === m.id}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(m.id, f, isFinalMs);
                    e.target.value = "";
                  }}
                  className="text-xs"
                />
                {uploading === m.id && <span>در حال آپلود…</span>}
              </label>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

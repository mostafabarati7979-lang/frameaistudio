import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listProject,
  customerAcceptMilestone,
  customerRequestMilestoneRevision,
  signDeliverableUrl,
} from "@/lib/projects.functions";

const STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار",
  in_progress: "در حال انجام",
  delivered: "تحویل شد — منتظر تأیید شما",
  accepted: "تأیید شده",
  revision_requested: "اصلاحیه درخواست‌شده",
  skipped: "رد شده",
};

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function ProjectTimelinePanel({ orderId }: { orderId: string }) {
  const list = useServerFn(listProject);
  const accept = useServerFn(customerAcceptMilestone);
  const requestRev = useServerFn(customerRequestMilestoneRevision);
  const sign = useServerFn(signDeliverableUrl);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["project", orderId],
    queryFn: () => list({ data: { order_id: orderId } }),
  });

  const [revNote, setRevNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  if (isLoading || !data) return null;
  const { milestones, deliverables, finalPaymentApproved } = data as any;
  if (!milestones?.length) return null;

  async function onAccept(id: string) {
    setBusy(id);
    try {
      await accept({ data: { milestone_id: id, note: revNote[id] || null } });
      toast.success("مرحله تأیید شد.");
      qc.invalidateQueries({ queryKey: ["project", orderId] });
      qc.invalidateQueries({ queryKey: ["order", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onRevision(id: string) {
    const note = (revNote[id] || "").trim();
    if (note.length < 2) return toast.error("لطفاً توضیح اصلاحیه را بنویسید.");
    setBusy(id);
    try {
      await requestRev({ data: { milestone_id: id, note } });
      toast.success("درخواست اصلاحیه ثبت شد.");
      qc.invalidateQueries({ queryKey: ["project", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onDownload(id: string, isFinal: boolean) {
    if (isFinal && !finalPaymentApproved) {
      return toast.error("دانلود خروجی نهایی پس از تسویه فعال می‌شود.");
    }
    try {
      const { url } = (await sign({ data: { deliverable_id: id } })) as any;
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold mb-3">مراحل پروژه</h2>
      <ol className="space-y-3">
        {milestones.map((m: any) => {
          const files = (deliverables as any[]).filter((d) => d.milestone_id === m.id);
          return (
            <li
              key={m.id}
              className="rounded-xl border border-border/70 bg-card/50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {m.sort_order}. {m.title}
                </p>
                <span className="text-xs text-primary">
                  {STATUS_LABELS[m.status] ?? m.status}
                </span>
              </div>
              {m.description && (
                <p className="mt-1 text-xs text-muted-foreground leading-6">
                  {m.description}
                </p>
              )}
              {m.admin_notes && (
                <p className="mt-1 text-xs text-muted-foreground">
                  یادداشت مدیر: {m.admin_notes}
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
                      <button
                        onClick={() => onDownload(f.id, f.is_final_output)}
                        disabled={f.is_final_output && !finalPaymentApproved}
                        className="rounded-md border border-border px-3 py-1 text-xs hover:bg-secondary disabled:opacity-50"
                        title={
                          f.is_final_output && !finalPaymentApproved
                            ? "پس از تسویه فعال می‌شود"
                            : ""
                        }
                      >
                        دانلود
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {m.status === "delivered" && (
                <div className="mt-3 space-y-2">
                  <textarea
                    rows={2}
                    className="input"
                    placeholder="یادداشت شما (اختیاری برای تأیید، الزامی برای درخواست اصلاحیه)"
                    value={revNote[m.id] ?? ""}
                    onChange={(e) =>
                      setRevNote((prev) => ({ ...prev, [m.id]: e.target.value }))
                    }
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={busy === m.id}
                      onClick={() => onAccept(m.id)}
                      className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      تأیید و ادامه
                    </button>
                    <button
                      disabled={busy === m.id}
                      onClick={() => onRevision(m.id)}
                      className="rounded-md border border-border px-3 py-1 text-xs hover:bg-secondary disabled:opacity-50"
                    >
                      درخواست اصلاحیه
                    </button>
                  </div>
                </div>
              )}
              {m.customer_notes && m.status !== "delivered" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  یادداشت شما: {m.customer_notes}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

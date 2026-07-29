import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listOrderContracts,
  approveContract,
  rejectContract,
} from "@/lib/contracts.functions";

const STATUS_LABELS: Record<string, string> = {
  sent: "در انتظار تأیید شما",
  approved: "تأیید شده",
  rejected: "رد شد",
  superseded: "جایگزین شد",
};

export function ContractsPanel({ orderId }: { orderId: string }) {
  const list = useServerFn(listOrderContracts);
  const approve = useServerFn(approveContract);
  const reject = useServerFn(rejectContract);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["contracts", orderId],
    queryFn: () => list({ data: { order_id: orderId } }),
  });

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function onApprove(id: string) {
    if (!confirm("قرارداد را تأیید می‌کنید؟ پس از تأیید مرحله پرداخت فعال می‌شود.")) return;
    setBusy(true);
    try {
      await approve({ data: { contract_id: id } });
      toast.success("قرارداد تأیید شد.");
      qc.invalidateQueries({ queryKey: ["contracts", orderId] });
      qc.invalidateQueries({ queryKey: ["order", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onReject(id: string) {
    if (!note.trim()) return toast.error("لطفاً دلیل رد را بنویسید.");
    setBusy(true);
    try {
      await reject({ data: { contract_id: id, note: note.trim() } });
      toast.success("قرارداد رد شد.");
      setRejectingId(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["contracts", orderId] });
      qc.invalidateQueries({ queryKey: ["order", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return null;
  const rows = (data as any[]) ?? [];
  if (rows.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold mb-3">قرارداد</h2>
      <div className="space-y-3">
        {rows.map((c) => (
          <div key={c.id} className="rounded-xl border border-border/70 bg-card/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">
                نسخه <span className="font-mono">v{c.version}</span> —{" "}
                <span className="text-primary">{STATUS_LABELS[c.status] ?? c.status}</span>
              </p>
              <p className="text-sm font-semibold">{c.title}</p>
            </div>
            <div className="mt-3 rounded-lg bg-background/40 p-3 max-h-80 overflow-auto whitespace-pre-wrap text-sm leading-7">
              {c.body}
            </div>
            {c.customer_response_note && (
              <p className="mt-2 text-xs text-muted-foreground">
                یادداشت شما: {c.customer_response_note}
              </p>
            )}
            <div className="mt-3">
              <p className="text-sm font-medium">
                وضعیت قرارداد:{" "}
                <span className="text-primary">{STATUS_LABELS[c.status] ?? c.status}</span>
              </p>
              {c.status === "sent" && (
                <div className="mt-2 flex flex-wrap gap-2 items-start">
                  <button
                    disabled={busy}
                    onClick={() => onApprove(c.id)}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    تأیید قرارداد
                  </button>
                  {rejectingId === c.id ? (
                    <div className="flex-1 min-w-[220px]">
                      <textarea
                        rows={2}
                        className="input"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="دلیل رد را بنویسید…"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          disabled={busy}
                          onClick={() => onReject(c.id)}
                          className="rounded-md border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10"
                        >
                          ثبت رد
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(null);
                            setNote("");
                          }}
                          className="rounded-md border border-border px-3 py-1 text-xs"
                        >
                          انصراف
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRejectingId(c.id)}
                      className="rounded-md border border-destructive/50 px-3 py-1 text-sm text-destructive hover:bg-destructive/10"
                    >
                      رد قرارداد
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

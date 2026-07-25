import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listOrderQuotes,
  approveQuote,
  rejectQuote,
  requestQuoteRevision,
} from "@/lib/quotes.functions";

const QUOTE_STATUS_LABELS: Record<string, string> = {
  sent: "در انتظار پاسخ شما",
  approved: "تأیید شد",
  rejected: "رد شد",
  revision_requested: "درخواست بازنگری",
  superseded: "جایگزین شد",
  expired: "منقضی شده",
};

export function fmtToman(n: number | string | null | undefined) {
  const v = typeof n === "string" ? Number(n) : (n ?? 0);
  return new Intl.NumberFormat("fa-IR").format(v) + " تومان";
}

export function QuotesPanel({ orderId }: { orderId: string }) {
  const fetchQuotes = useServerFn(listOrderQuotes);
  const doApprove = useServerFn(approveQuote);
  const doReject = useServerFn(rejectQuote);
  const doRevise = useServerFn(requestQuoteRevision);
  const qc = useQueryClient();
  const [reviseFor, setReviseFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["order-quotes", orderId],
    queryFn: () => fetchQuotes({ data: { order_id: orderId } }),
  });

  async function act(fn: () => Promise<any>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      setReviseFor(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["order-quotes", orderId] });
      qc.invalidateQueries({ queryKey: ["order", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (isLoading) return null;
  if (!quotes || quotes.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">پیش‌فاکتور</h2>
        <p className="text-sm text-muted-foreground">
          هنوز پیش‌فاکتوری برای این سفارش صادر نشده است. پس از بررسی مدیر، پیش‌فاکتور اینجا نمایش داده می‌شود.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-3">پیش‌فاکتورها</h2>
      <div className="space-y-4">
        {(quotes as any[]).map((q) => {
          const items = (q.quote_items ?? []).slice().sort(
            (a: any, b: any) => a.sort_order - b.sort_order,
          );
          const isActive = q.status === "sent";
          return (
            <div
              key={q.id}
              className={`rounded-xl border ${
                isActive ? "border-primary/50" : "border-border/70"
              } bg-card/50 p-4`}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm">
                    نسخه <span className="font-mono">v{q.version}</span>
                  </p>
                  {q.expires_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      اعتبار تا: {new Date(q.expires_at).toLocaleString("fa-IR")}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs text-primary">
                  {QUOTE_STATUS_LABELS[q.status] ?? q.status}
                </span>
              </div>

              {q.admin_notes && (
                <div className="rounded-lg bg-secondary/40 p-3 text-sm leading-7 whitespace-pre-wrap mb-3">
                  {q.admin_notes}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="text-right py-1">شرح</th>
                      <th className="text-right py-1">تعداد</th>
                      <th className="text-right py-1">مبلغ واحد</th>
                      <th className="text-right py-1">مبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it: any) => (
                      <tr key={it.id} className="border-t border-border/50">
                        <td className="py-2">
                          <p className="font-medium">{it.title}</p>
                          {it.description && (
                            <p className="text-xs text-muted-foreground">
                              {it.description}
                            </p>
                          )}
                        </td>
                        <td className="py-2">{it.quantity}</td>
                        <td className="py-2 whitespace-nowrap">
                          {fmtToman(it.unit_price_toman)}
                        </td>
                        <td className="py-2 whitespace-nowrap">
                          {fmtToman(it.amount_toman)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <Row label="جمع" value={fmtToman(q.subtotal_toman)} />
                <Row label="تخفیف" value={fmtToman(q.discount_toman)} />
                <Row label="مالیات" value={fmtToman(q.tax_toman)} />
                <Row label="مبلغ کل" value={fmtToman(q.total_toman)} strong />
              </div>
              {Number(q.deposit_toman) > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  پیش‌پرداخت پیشنهادی: {fmtToman(q.deposit_toman)}
                </p>
              )}

              {q.customer_response_note && (
                <p className="mt-3 text-xs text-muted-foreground">
                  یادداشت شما: {q.customer_response_note}
                </p>
              )}

              {isActive && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-3">
                  <button
                    onClick={() =>
                      act(() => doApprove({ data: { quote_id: q.id } }), "پیش‌فاکتور تأیید شد.")
                    }
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    تأیید پیش‌فاکتور
                  </button>
                  <button
                    onClick={() => setReviseFor(reviseFor === q.id ? null : q.id)}
                    className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary"
                  >
                    درخواست بازنگری
                  </button>
                  <button
                    onClick={() =>
                      act(
                        () => doReject({ data: { quote_id: q.id, note: note || undefined } }),
                        "پیش‌فاکتور رد شد.",
                      )
                    }
                    className="rounded-md border border-destructive/50 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    رد پیش‌فاکتور
                  </button>
                </div>
              )}

              {isActive && reviseFor === q.id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="چه چیزی باید تغییر کند؟"
                    className="input"
                  />
                  <button
                    onClick={() => {
                      if (!note.trim()) {
                        toast.error("لطفاً توضیح بدهید.");
                        return;
                      }
                      act(
                        () => doRevise({ data: { quote_id: q.id, note } }),
                        "درخواست بازنگری ثبت شد.",
                      );
                    }}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    ارسال درخواست بازنگری
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 ${strong ? "font-semibold text-primary" : ""}`}>{value}</p>
    </div>
  );
}

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  submitPayment,
  listOrderPayments,
  cancelPayment,
  paymentGate,
} from "@/lib/payments.functions";
import { fmtToman } from "@/components/orders/QuotesPanel";

const STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار تأیید مدیر",
  approved: "تأیید شده",
  rejected: "رد شده",
  cancelled: "لغو شده",
};
const KIND_LABELS: Record<string, string> = {
  deposit: "پیش‌پرداخت",
  final: "پرداخت نهایی",
};

export function PaymentsPanel({ orderId }: { orderId: string }) {
  const gate = useServerFn(paymentGate);
  const list = useServerFn(listOrderPayments);
  const submit = useServerFn(submitPayment);
  const cancel = useServerFn(cancelPayment);
  const qc = useQueryClient();

  const gateQ = useQuery({
    queryKey: ["payment-gate", orderId],
    queryFn: () => gate({ data: { order_id: orderId } }),
  });
  const listQ = useQuery({
    queryKey: ["payments", orderId],
    queryFn: () => list({ data: { order_id: orderId } }),
  });

  const [kind, setKind] = useState<"deposit" | "final">("deposit");
  const [amount, setAmount] = useState<number>(0);
  const [ref, setRef] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const g = gateQ.data as any;
  const rows = (listQ.data as any[]) ?? [];

  if (gateQ.isLoading) return null;
  if (!g?.isOwner) return null;

  const canOpen = g.canPayDeposit || g.canPayFinal;

  async function onSubmit() {
    if (amount < 1000) return toast.error("مبلغ نامعتبر است.");
    if (ref.trim().length < 2) return toast.error("شماره پیگیری را وارد کنید.");
    setBusy(true);
    try {
      await submit({
        data: {
          order_id: orderId,
          kind,
          amount_toman: Math.trunc(amount),
          reference_no: ref.trim(),
          paid_at: paidAt ? new Date(paidAt).toISOString() : null,
          note: note.trim() || null,
        },
      });
      toast.success("رسید پرداخت ثبت شد و در انتظار تأیید مدیر است.");
      setAmount(0);
      setRef("");
      setPaidAt("");
      setNote("");
      qc.invalidateQueries({ queryKey: ["payment-gate", orderId] });
      qc.invalidateQueries({ queryKey: ["payments", orderId] });
      qc.invalidateQueries({ queryKey: ["order", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onCancel(id: string) {
    if (!confirm("این رسید لغو شود؟")) return;
    try {
      await cancel({ data: { payment_id: id } });
      qc.invalidateQueries({ queryKey: ["payment-gate", orderId] });
      qc.invalidateQueries({ queryKey: ["payments", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold mb-3">پرداخت‌ها</h2>

      {!g.quoteApproved && (
        <p className="text-sm text-muted-foreground">
          امکان پرداخت پس از تأیید پیش‌فاکتور فعال می‌شود.
        </p>
      )}
      {g.quoteApproved && !g.contractApproved && (
        <p className="text-sm text-muted-foreground">
          امکان پرداخت پس از تأیید قرارداد فعال می‌شود.
        </p>
      )}

      {g.contractApproved && (
        <div className="rounded-xl border border-border/70 bg-card/50 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            {g.totalToman != null && (
              <Info label="مبلغ کل پیش‌فاکتور" value={fmtToman(g.totalToman)} />
            )}
            {g.depositToman != null && (
              <Info label="پیش‌پرداخت پیشنهادی" value={fmtToman(g.depositToman)} />
            )}
            <Info
              label="وضعیت"
              value={
                g.finalApproved
                  ? "تسویه کامل"
                  : g.depositApproved
                    ? "پیش‌پرداخت تأیید شده"
                    : "در انتظار پیش‌پرداخت"
              }
            />
          </div>

          {(g.paymentAmountToman || g.paymentBankInfo || g.paymentLink || g.paymentInstructionsNote) && (
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-semibold text-primary">اطلاعات پرداخت از سوی مدیر</p>
              {g.paymentAmountToman != null && (
                <p className="text-sm">
                  مبلغ قابل پرداخت: <span className="font-semibold">{fmtToman(g.paymentAmountToman)}</span>
                </p>
              )}
              {g.paymentBankInfo && (
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">اطلاعات حساب / کارت / شبا</p>
                  <p className="whitespace-pre-wrap font-mono text-sm">{g.paymentBankInfo}</p>
                </div>
              )}
              {g.paymentLink && (
                <a
                  href={g.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  پرداخت آنلاین
                </a>
              )}
              {g.paymentInstructionsNote && (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {g.paymentInstructionsNote}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-3 space-y-2">
          {rows.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-border/70 bg-card/40 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {KIND_LABELS[p.kind]} — {fmtToman(p.amount_toman)}
                </span>
                <span className="text-primary">{STATUS_LABELS[p.status] ?? p.status}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                شماره پیگیری: {p.reference_no}
                {p.paid_at ? ` • تاریخ: ${new Date(p.paid_at).toLocaleString("fa-IR")}` : ""}
              </p>
              {p.note && <p className="mt-1 text-xs">یادداشت شما: {p.note}</p>}
              {p.admin_notes && (
                <p className="mt-1 text-xs text-muted-foreground">
                  یادداشت مدیر: {p.admin_notes}
                </p>
              )}
              {p.status === "pending" && (
                <button
                  onClick={() => onCancel(p.id)}
                  className="mt-2 rounded-md border border-destructive/50 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  لغو رسید
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canOpen && (
        <div className="mt-4 rounded-xl border border-border/70 bg-card/50 p-4 space-y-3">
          <p className="text-sm font-semibold">
            ثبت رسید {g.canPayDeposit ? "پیش‌پرداخت" : "پرداخت نهایی"}
          </p>
          <p className="text-xs text-muted-foreground leading-6">
            مبلغ را به شماره کارت/شبا اعلام‌شده استودیو واریز و مشخصات رسید را
            وارد کنید. تأیید توسط مدیر انجام می‌شود.
          </p>
          <input type="hidden" value={kind} onChange={() => {}} />
          {g.canPayDeposit && g.canPayFinal && (
            <div className="flex gap-2">
              <button
                onClick={() => setKind("deposit")}
                className={`rounded-md px-3 py-1 text-xs ${kind === "deposit" ? "bg-primary text-primary-foreground" : "border border-border"}`}
              >
                پیش‌پرداخت
              </button>
              <button
                onClick={() => setKind("final")}
                className={`rounded-md px-3 py-1 text-xs ${kind === "final" ? "bg-primary text-primary-foreground" : "border border-border"}`}
              >
                پرداخت نهایی
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">مبلغ (تومان)</label>
              <input
                type="number"
                min={1000}
                className="input mt-1"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">شماره پیگیری</label>
              <input
                className="input mt-1"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">تاریخ پرداخت</label>
              <input
                type="datetime-local"
                className="input mt-1"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">یادداشت (اختیاری)</label>
              <input
                className="input mt-1"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <button
            disabled={busy}
            onClick={onSubmit}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            ثبت رسید
          </button>
        </div>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

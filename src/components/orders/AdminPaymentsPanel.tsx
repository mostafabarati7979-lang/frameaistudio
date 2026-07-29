import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listOrderPayments,
  adminApprovePayment,
  adminRejectPayment,
  adminSetPaymentInstructions,
  paymentGate,
} from "@/lib/payments.functions";
import { fmtToman } from "@/components/orders/QuotesPanel";

const STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار تأیید",
  approved: "تأیید شده",
  rejected: "رد شده",
  cancelled: "لغو شده",
};
const KIND_LABELS: Record<string, string> = {
  deposit: "پیش‌پرداخت",
  final: "پرداخت نهایی",
};

export function AdminPaymentsPanel({ orderId }: { orderId: string }) {
  const list = useServerFn(listOrderPayments);
  const approve = useServerFn(adminApprovePayment);
  const reject = useServerFn(adminRejectPayment);
  const setInstr = useServerFn(adminSetPaymentInstructions);
  const gate = useServerFn(paymentGate);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin-payments", orderId],
    queryFn: () => list({ data: { order_id: orderId } }),
  });
  const gateQ = useQuery({
    queryKey: ["admin-payment-gate", orderId],
    queryFn: () => gate({ data: { order_id: orderId } }),
  });
  const g = gateQ.data as any;

  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payBank, setPayBank] = useState("");
  const [payLink, setPayLink] = useState("");
  const [payNote, setPayNote] = useState("");
  const [savingInstr, setSavingInstr] = useState(false);

  useEffect(() => {
    if (!g) return;
    setPayAmount(g.paymentAmountToman ?? 0);
    setPayBank(g.paymentBankInfo ?? "");
    setPayLink(g.paymentLink ?? "");
    setPayNote(g.paymentInstructionsNote ?? "");
  }, [g?.paymentAmountToman, g?.paymentBankInfo, g?.paymentLink, g?.paymentInstructionsNote]);

  const rows = (data as any[]) ?? [];

  async function onSaveInstructions() {
    setSavingInstr(true);
    try {
      await setInstr({
        data: {
          order_id: orderId,
          payment_amount_toman: payAmount > 0 ? Math.trunc(payAmount) : null,
          payment_bank_info: payBank.trim() || null,
          payment_link: payLink.trim() || null,
          payment_instructions_note: payNote.trim() || null,
        },
      });
      toast.success("اطلاعات پرداخت ذخیره شد و برای مشتری ارسال گردید.");
      qc.invalidateQueries({ queryKey: ["admin-payment-gate", orderId] });
      qc.invalidateQueries({ queryKey: ["payment-gate", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingInstr(false);
    }
  }

  async function onApprove(id: string) {
    setBusy(id);
    try {
      await approve({ data: { payment_id: id, admin_notes: notesById[id] || null } });
      toast.success("پرداخت تأیید شد.");
      qc.invalidateQueries({ queryKey: ["admin-payments", orderId] });
      qc.invalidateQueries({ queryKey: ["admin-order", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onReject(id: string) {
    const notes = notesById[id]?.trim();
    if (!notes) return toast.error("لطفاً دلیل رد را بنویسید.");
    setBusy(id);
    try {
      await reject({ data: { payment_id: id, admin_notes: notes } });
      toast.success("پرداخت رد شد.");
      qc.invalidateQueries({ queryKey: ["admin-payments", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold">پرداخت‌ها</h2>
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground mt-2">هنوز رسیدی ثبت نشده است.</p>
      )}
      <div className="mt-2 space-y-3">
        {rows.map((p) => (
          <div key={p.id} className="rounded-xl border border-border/70 bg-card/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                {KIND_LABELS[p.kind]} — {fmtToman(p.amount_toman)} —{" "}
                <span className="text-primary">{STATUS_LABELS[p.status] ?? p.status}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                رسید: {p.reference_no}
                {p.paid_at ? ` • ${new Date(p.paid_at).toLocaleString("fa-IR")}` : ""}
              </p>
            </div>
            {p.note && (
              <p className="mt-1 text-xs text-muted-foreground">
                یادداشت مشتری: {p.note}
              </p>
            )}
            {p.admin_notes && (
              <p className="mt-1 text-xs text-muted-foreground">
                یادداشت مدیر: {p.admin_notes}
              </p>
            )}
            {p.status === "pending" && (
              <div className="mt-3 space-y-2">
                <textarea
                  rows={2}
                  className="input"
                  placeholder="یادداشت مدیر (برای رد الزامی است)"
                  value={notesById[p.id] ?? ""}
                  onChange={(e) =>
                    setNotesById((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <button
                    disabled={busy === p.id}
                    onClick={() => onApprove(p.id)}
                    className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    تأیید پرداخت
                  </button>
                  <button
                    disabled={busy === p.id}
                    onClick={() => onReject(p.id)}
                    className="rounded-md border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    رد پرداخت
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listOrderContracts,
  adminCreateContract,
  adminSendContract,
  adminDeleteContract,
} from "@/lib/contracts.functions";

const STATUS_LABELS: Record<string, string> = {
  draft: "پیش‌نویس",
  sent: "ارسال شده",
  approved: "تأیید شده",
  rejected: "رد شده",
  superseded: "جایگزین شده",
};

const DEFAULT_TEMPLATE = `طرفین قرارداد:
- طرف اول (کارفرما): [نام مشتری]
- طرف دوم (مجری): استودیو فریم‌ای‌آی

موضوع قرارداد:
[شرح خدمات مطابق پیش‌فاکتور تأییدشده]

شرایط اجرا:
1. زمان‌بندی اجرا و تحویل پس از پرداخت پیش‌پرداخت آغاز می‌شود.
2. حق مالکیت فایل خام و نهایی مطابق مفاد پیش‌فاکتور است.
3. تعداد و نوع اصلاحات مطابق پکیج توافق‌شده انجام می‌گیرد.
4. تأخیر در پرداخت مراحل، تحویل را به همان اندازه به تأخیر می‌اندازد.
5. لغو قرارداد پس از شروع اجرا مشمول کسر هزینه‌های انجام‌شده است.

تعهدات کارفرما:
- ارائه اطلاعات، دسترسی و همکاری لازم برای اجرا.
- پرداخت به‌موقع در مراحل مقرر.

تعهدات مجری:
- اجرای پروژه با کیفیت و کمیت توافق‌شده در پیش‌فاکتور.
- حفظ محرمانگی فایل‌ها و اطلاعات کارفرما.
`;

export function AdminContractEditor({
  orderId,
  approvedQuoteId,
  canCreate,
}: {
  orderId: string;
  approvedQuoteId: string | null;
  canCreate: boolean;
}) {
  const list = useServerFn(listOrderContracts);
  const create = useServerFn(adminCreateContract);
  const send = useServerFn(adminSendContract);
  const del = useServerFn(adminDeleteContract);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin-contracts", orderId],
    queryFn: () => list({ data: { order_id: orderId } }),
  });

  const [title, setTitle] = useState("قرارداد خدمات تصویربرداری و تدوین");
  const [body, setBody] = useState(DEFAULT_TEMPLATE);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = (data as any[]) ?? [];

  async function submit(sendNow: boolean) {
    if (!approvedQuoteId) {
      return toast.error("ابتدا باید پیش‌فاکتور تأیید شود.");
    }
    if (body.trim().length < 20) return toast.error("متن قرارداد بسیار کوتاه است.");
    setSaving(true);
    try {
      const res = await create({
        data: {
          order_id: orderId,
          quote_id: approvedQuoteId,
          title: title.trim(),
          body: body.trim(),
          admin_notes: notes.trim() || null,
        },
      });
      if (sendNow) await send({ data: { contract_id: res.id } });
      toast.success(sendNow ? "قرارداد ارسال شد." : "پیش‌نویس ذخیره شد.");
      qc.invalidateQueries({ queryKey: ["admin-contracts", orderId] });
      qc.invalidateQueries({ queryKey: ["admin-order", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function sendExisting(id: string) {
    try {
      await send({ data: { contract_id: id } });
      toast.success("قرارداد ارسال شد.");
      qc.invalidateQueries({ queryKey: ["admin-contracts", orderId] });
      qc.invalidateQueries({ queryKey: ["admin-order", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function removeDraft(id: string) {
    if (!confirm("پیش‌نویس قرارداد حذف شود؟")) return;
    try {
      await del({ data: { contract_id: id } });
      qc.invalidateQueries({ queryKey: ["admin-contracts", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold">قراردادها</h2>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground mt-2">هنوز قراردادی صادر نشده است.</p>
      )}
      <div className="mt-2 space-y-3">
        {rows.map((c) => (
          <div key={c.id} className="rounded-xl border border-border/70 bg-card/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">
                نسخه <span className="font-mono">v{c.version}</span> —{" "}
                <span className="text-primary">{STATUS_LABELS[c.status] ?? c.status}</span>
              </p>
              <p className="text-sm font-semibold">{c.title}</p>
            </div>
            {c.customer_response_note && (
              <p className="mt-2 text-xs text-muted-foreground">
                پاسخ مشتری: {c.customer_response_note}
              </p>
            )}
            {c.status === "draft" && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => sendExisting(c.id)}
                  className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  ارسال به مشتری
                </button>
                <button
                  onClick={() => removeDraft(c.id)}
                  className="rounded-md border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  حذف پیش‌نویس
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {canCreate ? (
        <div className="mt-4 rounded-xl border border-border/70 bg-card/50 p-4 space-y-3">
          <p className="text-sm font-semibold">صدور قرارداد جدید</p>
          <div>
            <label className="text-xs text-muted-foreground">عنوان</label>
            <input
              className="input mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">متن قرارداد</label>
            <textarea
              rows={14}
              className="input mt-1 font-mono text-xs leading-6"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">یادداشت داخلی (اختیاری)</label>
            <textarea
              rows={2}
              className="input mt-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              disabled={saving}
              onClick={() => submit(false)}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-50"
            >
              ذخیره پیش‌نویس
            </button>
            <button
              disabled={saving}
              onClick={() => submit(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              ذخیره و ارسال به مشتری
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          صدور قرارداد پس از تأیید پیش‌فاکتور توسط مشتری امکان‌پذیر است.
        </p>
      )}
    </div>
  );
}

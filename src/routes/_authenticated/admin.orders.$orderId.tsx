import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminGetOrder,
  adminCreateQuote,
  adminSendQuote,
  adminDeleteQuote,
} from "@/lib/quotes.functions";
import { signOrderFileUrl } from "@/lib/orders.functions";
import { ORDER_STATUS_LABELS, SERVICE_TYPES } from "@/lib/orders-schema";
import { fmtToman } from "@/components/orders/QuotesPanel";
import { AdminContractEditor } from "@/components/orders/AdminContractEditor";
import { AdminPaymentsPanel } from "@/components/orders/AdminPaymentsPanel";
import { AdminProjectPanel } from "@/components/orders/AdminProjectPanel";

export const Route = createFileRoute("/_authenticated/admin/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "بررسی سفارش — مدیریت | فریم‌ای‌آی" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOrderPage,
});

type Item = { title: string; description: string; quantity: number; unit_price_toman: number };

function AdminOrderPage() {
  const { orderId } = Route.useParams();
  const fetchOrder = useServerFn(adminGetOrder);
  const createQ = useServerFn(adminCreateQuote);
  const sendQ = useServerFn(adminSendQuote);
  const delQ = useServerFn(adminDeleteQuote);
  const signUrl = useServerFn(signOrderFileUrl);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: () => fetchOrder({ data: { id: orderId } }),
  });

  const [items, setItems] = useState<Item[]>([
    { title: "", description: "", quantity: 1, unit_price_toman: 0 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [notes, setNotes] = useState("");
  const [expires, setExpires] = useState("");
  const [saving, setSaving] = useState(false);

  const subtotal = items.reduce(
    (s, it) => s + (Number(it.unit_price_toman) || 0) * (Number(it.quantity) || 0),
    0,
  );
  const total = Math.max(0, subtotal - (Number(discount) || 0) + (Number(tax) || 0));

  function setItem(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((p) => [...p, { title: "", description: "", quantity: 1, unit_price_toman: 0 }]);
  }
  function removeItem(i: number) {
    setItems((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));
  }

  async function handleCreate(send: boolean) {
    for (const it of items) {
      if (!it.title.trim()) return toast.error("عنوان همه ردیف‌ها را وارد کنید.");
      if (it.quantity < 1) return toast.error("تعداد باید حداقل ۱ باشد.");
      if (it.unit_price_toman < 0) return toast.error("مبلغ نامعتبر است.");
    }
    setSaving(true);
    try {
      const res = await createQ({
        data: {
          order_id: orderId,
          items: items.map((it) => ({
            title: it.title.trim(),
            description: it.description.trim() || null,
            quantity: Math.trunc(it.quantity),
            unit_price_toman: Math.trunc(it.unit_price_toman),
          })),
          discount_toman: Math.trunc(discount),
          tax_toman: Math.trunc(tax),
          deposit_toman: Math.trunc(deposit),
          admin_notes: notes.trim() || null,
          expires_at: expires ? new Date(expires).toISOString() : null,
        },
      });
      if (send) await sendQ({ data: { quote_id: res.id } });
      toast.success(send ? "پیش‌فاکتور ارسال شد." : "پیش‌نویس ذخیره شد.");
      setItems([{ title: "", description: "", quantity: 1, unit_price_toman: 0 }]);
      setDiscount(0);
      setTax(0);
      setDeposit(0);
      setNotes("");
      setExpires("");
      qc.invalidateQueries({ queryKey: ["admin-order", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendExisting(id: string) {
    try {
      await sendQ({ data: { quote_id: id } });
      toast.success("پیش‌فاکتور ارسال شد.");
      qc.invalidateQueries({ queryKey: ["admin-order", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("پیش‌نویس حذف شود؟")) return;
    try {
      await delQ({ data: { quote_id: id } });
      qc.invalidateQueries({ queryKey: ["admin-order", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function download(fileId: string) {
    try {
      const { url } = await signUrl({ data: { file_id: fileId } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (isLoading) {
    return <div className="container-page py-12" dir="rtl">در حال بارگذاری…</div>;
  }
  if (error || !data) {
    return (
      <div className="container-page py-12" dir="rtl">
        <p className="text-sm text-destructive">سفارش یافت نشد.</p>
        <Link to="/admin/orders" className="text-sm text-primary">بازگشت</Link>
      </div>
    );
  }

  const { order, quotes, files, customer } = data as any;
  const serviceName =
    SERVICE_TYPES.find((s) => s.value === order.service_type)?.label ?? order.service_type;

  return (
    <div className="container-page py-8" dir="rtl">
      <Link to="/admin/orders" className="text-sm text-muted-foreground hover:text-primary">
        ← فهرست سفارش‌ها
      </Link>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground font-mono">{order.order_code}</p>
          <h1 className="mt-1 text-2xl font-bold text-gradient-gold">{order.project_title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {serviceName} • {customer?.full_name ?? "—"} • {customer?.mobile ?? "—"}
          </p>
        </div>
        <span className="rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-sm text-primary whitespace-nowrap">
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Info label="تاریخ رویداد" value={order.event_date ?? "-"} />
        <Info label="شهر" value={order.city ?? "-"} />
        <Info
          label="ساعت / روز"
          value={`${order.team_hours ?? "-"} ساعت • ${order.shooting_days ?? "-"} روز`}
        />
        <Info
          label="فنی"
          value={`${order.cameras_count ?? "-"} دوربین • ${
            order.quality?.toUpperCase() ?? "-"
          } • ${order.duration_min ?? "-"} دقیقه`}
        />
      </div>

      {order.description && (
        <div className="mt-4 rounded-xl border border-border/70 bg-card/50 p-4">
          <p className="text-xs text-muted-foreground mb-1">توضیحات پروژه</p>
          <p className="text-sm leading-7 whitespace-pre-wrap">{order.description}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">فایل‌های مرجع مشتری</h3>
          <ul className="space-y-1">
            {files.map((f: any) => (
              <li key={f.id} className="text-sm flex items-center gap-2">
                <button
                  onClick={() => download(f.id)}
                  className="text-primary hover:underline"
                >
                  {f.file_name}
                </button>
                <span className="text-xs text-muted-foreground">({f.kind})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Existing quotes */}
      <h2 className="mt-8 text-lg font-semibold">پیش‌فاکتورها</h2>
      {quotes.length === 0 && (
        <p className="text-sm text-muted-foreground mt-2">هنوز پیش‌فاکتوری صادر نشده است.</p>
      )}
      <div className="mt-2 space-y-3">
        {quotes.map((q: any) => (
          <div key={q.id} className="rounded-xl border border-border/70 bg-card/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">
                نسخه <span className="font-mono">v{q.version}</span> —{" "}
                <span className="text-primary">{q.status}</span>
              </p>
              <p className="text-sm font-semibold">{fmtToman(q.total_toman)}</p>
            </div>
            {q.customer_response_note && (
              <p className="mt-2 text-xs text-muted-foreground">
                پاسخ مشتری: {q.customer_response_note}
              </p>
            )}
            {q.status === "draft" && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleSendExisting(q.id)}
                  className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  ارسال به مشتری
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="rounded-md border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  حذف پیش‌نویس
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New quote builder */}
      <h2 className="mt-8 text-lg font-semibold">صدور پیش‌فاکتور جدید</h2>
      <div className="mt-3 rounded-xl border border-border/70 bg-card/50 p-4 space-y-4">
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <input
                className="input col-span-4"
                placeholder="عنوان"
                value={it.title}
                onChange={(e) => setItem(i, { title: e.target.value })}
              />
              <input
                className="input col-span-4"
                placeholder="توضیح (اختیاری)"
                value={it.description}
                onChange={(e) => setItem(i, { description: e.target.value })}
              />
              <input
                type="number"
                min={1}
                className="input col-span-1"
                value={it.quantity}
                onChange={(e) => setItem(i, { quantity: Number(e.target.value) })}
              />
              <input
                type="number"
                min={0}
                className="input col-span-2"
                placeholder="مبلغ واحد (تومان)"
                value={it.unit_price_toman}
                onChange={(e) => setItem(i, { unit_price_toman: Number(e.target.value) })}
              />
              <button
                onClick={() => removeItem(i)}
                className="col-span-1 rounded-md border border-border text-xs hover:bg-secondary"
              >
                حذف
              </button>
            </div>
          ))}
          <button
            onClick={addItem}
            className="rounded-md border border-border px-3 py-1 text-xs hover:bg-secondary"
          >
            + افزودن ردیف
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Field label="تخفیف (تومان)">
            <input
              type="number"
              min={0}
              className="input"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </Field>
          <Field label="مالیات (تومان)">
            <input
              type="number"
              min={0}
              className="input"
              value={tax}
              onChange={(e) => setTax(Number(e.target.value))}
            />
          </Field>
          <Field label="پیش‌پرداخت (تومان)">
            <input
              type="number"
              min={0}
              className="input"
              value={deposit}
              onChange={(e) => setDeposit(Number(e.target.value))}
            />
          </Field>
          <Field label="اعتبار پیش‌فاکتور">
            <input
              type="datetime-local"
              className="input"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </Field>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">یادداشت مدیر (اختیاری)</label>
          <textarea
            rows={3}
            className="input mt-1"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="توضیحات، فرضیات، شرایط..."
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <Info label="جمع" value={fmtToman(subtotal)} />
          <Info label="مبلغ کل" value={fmtToman(total)} />
          <Info label="پیش‌پرداخت" value={fmtToman(deposit || 0)} />
        </div>

        <div className="flex gap-2">
          <button
            disabled={saving}
            onClick={() => handleCreate(false)}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-50"
          >
            ذخیره پیش‌نویس
          </button>
          <button
            disabled={saving}
            onClick={() => handleCreate(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            ذخیره و ارسال به مشتری
          </button>
        </div>
      </div>

      <AdminContractEditor
        orderId={order.id}
        approvedQuoteId={(quotes as any[]).find((q) => q.status === "approved")?.id ?? null}
        canCreate={(quotes as any[]).some((q) => q.status === "approved")}
      />

      <AdminPaymentsPanel orderId={order.id} />
    </div>
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
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

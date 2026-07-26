import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getMyOrder,
  signOrderFileUrl,
  deleteOrderFile,
} from "@/lib/orders.functions";
import {
  ORDER_STATUS_LABELS,
  SERVICE_TYPES,
  CONTACT_METHODS,
} from "@/lib/orders-schema";
import { OrderFileUploader } from "@/components/orders/OrderFileUploader";
import { QuotesPanel } from "@/components/orders/QuotesPanel";
import { ContractsPanel } from "@/components/orders/ContractsPanel";
import { PaymentsPanel } from "@/components/orders/PaymentsPanel";

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "جزئیات سفارش | فریم‌ای‌آی" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrderDetailPage,
});

const TIMELINE_STEPS: { key: string; label: string }[] = [
  { key: "submitted", label: "ثبت سفارش" },
  { key: "quoted", label: "پیش‌فاکتور" },
  { key: "contract_approved", label: "قرارداد" },
  { key: "payment_pending", label: "پرداخت" },
  { key: "in_production", label: "تولید" },
  { key: "initial_delivered", label: "برش اولیه" },
  { key: "final_delivered", label: "خروجی نهایی" },
  { key: "completed", label: "تکمیل" },
];

const STATUS_ORDER = [
  "draft",
  "submitted",
  "quoted",
  "contract_pending",
  "contract_approved",
  "payment_pending",
  "in_production",
  "initial_delivered",
  "revisions",
  "final_delivered",
  "completed",
];

function serviceLabel(v: string) {
  return SERVICE_TYPES.find((s) => s.value === v)?.label ?? v;
}
function contactLabel(v: string | null) {
  if (!v) return "-";
  return CONTACT_METHODS.find((c) => c.value === v)?.label ?? v;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const fetchOrder = useServerFn(getMyOrder);
  const signUrl = useServerFn(signOrderFileUrl);
  const deleteFile = useServerFn(deleteOrderFile);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder({ data: { id: orderId } }),
  });

  async function handleDownload(fileId: string) {
    try {
      const { url } = await signUrl({ data: { file_id: fileId } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete(fileId: string) {
    if (!confirm("این فایل حذف شود؟")) return;
    try {
      await deleteFile({ data: { file_id: fileId } });
      toast.success("فایل حذف شد.");
      qc.invalidateQueries({ queryKey: ["order", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (isLoading) {
    return (
      <div className="container-page py-16" dir="rtl">
        <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="container-page py-16" dir="rtl">
        <p className="text-sm text-destructive">سفارش یافت نشد.</p>
        <Link to="/orders" className="mt-4 inline-block text-sm text-primary">
          بازگشت به فهرست
        </Link>
      </div>
    );
  }

  const { order, files } = data;
  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const canUpload = ["draft", "submitted", "revisions"].includes(order.status);

  return (
    <div className="container-page py-12" dir="rtl">
      <div className="mx-auto max-w-4xl">
        <Link to="/orders" className="text-sm text-muted-foreground hover:text-primary">
          ← سفارش‌های من
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{order.order_code}</span>
              <span>•</span>
              <span>{serviceLabel(order.service_type)}</span>
            </div>
            <h1 className="mt-1 text-3xl font-bold text-gradient-gold">
              {order.project_title}
            </h1>
          </div>
          <span className="rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-sm text-primary whitespace-nowrap">
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>

        {/* Timeline */}
        <div className="mt-8 rounded-xl border border-border/70 bg-card/50 p-5 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {TIMELINE_STEPS.map((s, i) => {
              const stepIdx = STATUS_ORDER.indexOf(s.key);
              const reached = currentIdx >= stepIdx && order.status !== "cancelled";
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      reached ? "bg-primary" : "bg-secondary"
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      reached ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <span className="w-6 h-px bg-border" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Details */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Info label="تاریخ رویداد" value={order.event_date ?? "-"} />
          <Info label="شهر" value={order.city ?? "-"} />
          <Info label="آدرس" value={order.address ?? "-"} />
          <Info
            label="ساعت / روز"
            value={`${order.team_hours ?? "-"} ساعت • ${order.shooting_days ?? "-"} روز`}
          />
          <Info
            label="جزئیات فنی"
            value={`${order.cameras_count ?? "-"} دوربین • ${
              order.quality?.toUpperCase() ?? "-"
            } • ${order.duration_min ?? "-"} دقیقه`}
          />
          <Info label="سبک" value={order.style ?? "-"} />
          <Info label="روش ارتباط" value={contactLabel(order.preferred_contact)} />
          <Info label="بهترین زمان تماس" value={order.best_call_time ?? "-"} />
        </div>

        {order.description && (
          <div className="mt-4 rounded-xl border border-border/70 bg-card/50 p-4">
            <p className="text-xs text-muted-foreground mb-1">توضیحات پروژه</p>
            <p className="text-sm leading-7 whitespace-pre-wrap">{order.description}</p>
          </div>
        )}
        {order.expectations && (
          <div className="mt-4 rounded-xl border border-border/70 bg-card/50 p-4">
            <p className="text-xs text-muted-foreground mb-1">انتظارات</p>
            <p className="text-sm leading-7 whitespace-pre-wrap">{order.expectations}</p>
          </div>
        )}

        <QuotesPanel orderId={order.id} />
        <ContractsPanel orderId={order.id} />
        <PaymentsPanel orderId={order.id} />


        {/* Files */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">فایل‌های مرجع</h2>
          {files.length === 0 && (
            <p className="text-sm text-muted-foreground mb-3">
              هنوز فایلی بارگذاری نشده است.
            </p>
          )}
          {files.length > 0 && (
            <ul className="space-y-2 mb-4">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/40 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.kind} • {formatBytes(f.size_bytes)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(f.id)}
                      className="rounded-md border border-border px-3 py-1 text-xs hover:bg-secondary"
                    >
                      دانلود
                    </button>
                    {canUpload && (
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="rounded-md border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {canUpload && <OrderFileUploader orderId={order.id} />}
          {!canUpload && (
            <p className="text-xs text-muted-foreground">
              در این وضعیت امکان افزودن فایل جدید وجود ندارد.
            </p>
          )}
        </div>
      </div>
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

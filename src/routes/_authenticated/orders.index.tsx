import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyOrders } from "@/lib/orders.functions";
import { ORDER_STATUS_LABELS, SERVICE_TYPES } from "@/lib/orders-schema";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({
    meta: [
      { title: "سفارش‌های من | فریم‌ای‌آی" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrdersList,
});

function formatDate(iso: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("fa-IR");
  } catch {
    return iso;
  }
}

function serviceLabel(v: string) {
  return SERVICE_TYPES.find((s) => s.value === v)?.label ?? v;
}

function OrdersList() {
  const fetchOrders = useServerFn(listMyOrders);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => fetchOrders(),
  });

  return (
    <div className="container-page py-16" dir="rtl">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gradient-gold">سفارش‌های من</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              فهرست تمام سفارش‌های ثبت‌شده و پیش‌نویس‌های شما.
            </p>
          </div>
          <Link
            to="/orders/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            + ثبت سفارش جدید
          </Link>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>}
        {error && (
          <p className="text-sm text-destructive">دریافت سفارش‌ها با خطا مواجه شد.</p>
        )}
        {data && data.length === 0 && (
          <div className="rounded-xl border border-border/70 bg-card/50 p-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">هنوز سفارشی ثبت نکرده‌اید.</p>
            <Link
              to="/orders/new"
              className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              ثبت اولین سفارش
            </Link>
          </div>
        )}

        {data && data.length > 0 && (
          <div className="space-y-3">
            {data.map((o) => (
              <Link
                key={o.id}
                to="/orders/$orderId"
                params={{ orderId: o.id }}
                className="block rounded-xl border border-border/70 bg-card/50 p-4 hover:border-primary/60 transition"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{o.order_code}</span>
                      <span>•</span>
                      <span>{serviceLabel(o.service_type)}</span>
                    </div>
                    <h3 className="mt-1 font-semibold">{o.project_title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      تاریخ ثبت: {formatDate(o.submitted_at ?? o.created_at)}
                      {o.city ? ` • ${o.city}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs text-primary whitespace-nowrap">
                    {ORDER_STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

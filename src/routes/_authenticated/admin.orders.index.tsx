import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminListOrders } from "@/lib/quotes.functions";
import { ORDER_STATUS_LABELS, SERVICE_TYPES } from "@/lib/orders-schema";

export const Route = createFileRoute("/_authenticated/admin/orders/")({
  head: () => ({
    meta: [
      { title: "سفارش‌ها — مدیریت | فریم‌ای‌آی" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOrdersList,
});

function serviceLabel(v: string) {
  return SERVICE_TYPES.find((s) => s.value === v)?.label ?? v;
}

function AdminOrdersList() {
  const fetchOrders = useServerFn(adminListOrders);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders(),
  });

  return (
    <div className="container-page py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-gradient-gold mb-6">سفارش‌های مشتریان</h1>
      {isLoading && <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">هنوز سفارشی ثبت نشده است.</p>
      )}
      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">کد</th>
                <th className="text-right p-3">پروژه</th>
                <th className="text-right p-3">سرویس</th>
                <th className="text-right p-3">تاریخ رویداد</th>
                <th className="text-right p-3">وضعیت</th>
                <th className="text-right p-3">ثبت</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {(data as any[]).map((o) => (
                <tr key={o.id} className="border-t border-border/50 hover:bg-secondary/30">
                  <td className="p-3 font-mono">{o.order_code}</td>
                  <td className="p-3">{o.project_title}</td>
                  <td className="p-3">{serviceLabel(o.service_type)}</td>
                  <td className="p-3">{o.event_date ?? "-"}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-xs text-primary">
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("fa-IR")}
                  </td>
                  <td className="p-3">
                    <Link
                      to="/admin/orders/$orderId"
                      params={{ orderId: o.id }}
                      className="text-primary text-xs hover:underline"
                    >
                      بررسی
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

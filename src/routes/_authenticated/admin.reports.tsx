import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminReports } from "@/lib/reports.functions";

const STATUS_LABEL: Record<string, string> = {
  draft: "پیش‌نویس",
  submitted: "ثبت‌شده",
  quoted: "قیمت‌گذاری‌شده",
  contract_pending: "منتظر قرارداد",
  contract_approved: "قرارداد تأییدشده",
  payment_pending: "منتظر پرداخت",
  in_production: "در حال تولید",
  initial_delivered: "تحویل اولیه",
  revisions: "اصلاحیه",
  final_delivered: "تحویل نهایی",
  completed: "تکمیل‌شده",
  cancelled: "لغو",
  sent: "ارسال‌شده",
  approved: "تأیید",
  rejected: "رد",
  revision_requested: "درخواست بازنگری",
  superseded: "جایگزین",
  expired: "منقضی",
};

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({
    meta: [
      { title: "گزارش‌ها | FrameAI Studio" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ReportsPage,
});

function fmt(n: number) {
  return new Intl.NumberFormat("fa-IR").format(Math.round(n));
}

function ReportsPage() {
  const fn = useServerFn(adminReports);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => fn({}),
  });
  if (isLoading || !data) return <p className="container-page py-8">در حال بارگذاری…</p>;
  const r = data as any;
  const maxRev = Math.max(1, ...r.revenueByMonth.map((b: any) => b.total));

  return (
    <div className="container-page py-8 space-y-6">
      <h1 className="text-2xl font-bold">گزارش‌ها و شاخص‌های کلیدی</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="کل سفارش‌ها" value={fmt(r.totals.orders)} />
        <Kpi label="درآمد تأییدشده (تومان)" value={fmt(r.totals.revenue_toman)} />
        <Kpi label="پرداخت‌های در انتظار" value={fmt(r.totals.pending_payments)} />
        <Kpi label="پیش‌فاکتورها" value={fmt(r.totals.quotes)} />
        <Kpi label="قراردادها" value={fmt(r.totals.contracts)} />
        <Kpi label="نظرات ثبت‌شده" value={fmt(r.totals.reviews)} />
        <Kpi label="میانگین امتیاز" value={`${r.totals.avg_rating} / 5`} />
      </div>

      <section className="rounded-xl border border-border/70 bg-card/40 p-4">
        <h2 className="text-lg font-semibold mb-3">درآمد ۱۲ ماه اخیر</h2>
        <div className="flex items-end gap-2 h-40">
          {r.revenueByMonth.map((b: any) => (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-gradient-to-t from-primary/60 to-primary"
                style={{ height: `${(b.total / maxRev) * 100}%` }}
                title={`${b.label}: ${fmt(b.total)}`}
              />
              <span className="text-[10px] text-muted-foreground">{b.label.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <StatusBlock title="سفارش‌ها بر اساس وضعیت" data={r.ordersByStatus} />
        <StatusBlock title="پیش‌فاکتورها" data={r.quotesByStatus} />
        <StatusBlock title="قراردادها" data={r.contractsByStatus} />
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[color:var(--gold)]">{value}</p>
    </div>
  );
}

function StatusBlock({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">داده‌ای وجود ندارد.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {entries.map(([k, v]) => (
            <li key={k} className="flex justify-between border-b border-border/40 py-1">
              <span>{STATUS_LABEL[k] ?? k}</span>
              <span className="font-mono">{fmt(v)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

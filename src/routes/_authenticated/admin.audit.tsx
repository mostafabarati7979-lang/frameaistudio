import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminListAudit } from "@/lib/reports.functions";

const ACTION_LABEL: Record<string, string> = {
  "quote.created": "ایجاد پیش‌فاکتور",
  "quote.draft": "پیش‌فاکتور پیش‌نویس",
  "quote.sent": "ارسال پیش‌فاکتور",
  "quote.approved": "تأیید پیش‌فاکتور",
  "quote.rejected": "رد پیش‌فاکتور",
  "quote.revision_requested": "درخواست بازنگری پیش‌فاکتور",
  "quote.superseded": "جایگزینی پیش‌فاکتور",
  "quote.expired": "انقضای پیش‌فاکتور",
  "contract.created": "ایجاد قرارداد",
  "contract.sent": "ارسال قرارداد",
  "contract.approved": "تأیید قرارداد",
  "contract.rejected": "رد قرارداد",
  "contract.superseded": "جایگزینی قرارداد",
  "payment.submitted": "ثبت رسید پرداخت",
  "payment.approved": "تأیید پرداخت",
  "payment.rejected": "رد پرداخت",
  "payment.cancelled": "لغو پرداخت",
  "role.granted": "اعطای نقش",
  "role.revoked": "حذف نقش",
};

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [
      { title: "لاگ حسابرسی | FrameAI Studio" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const fn = useServerFn(adminListAudit);
  const [entity, setEntity] = useState<
    "all" | "quote" | "contract" | "payment" | "user_role"
  >("all");
  const { data, isLoading } = useQuery({
    queryKey: ["audit", entity],
    queryFn: () => fn({ data: { entity_type: entity, limit: 300 } }),
  });
  const items = (data as any)?.items ?? [];

  return (
    <div className="container-page py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">لاگ حسابرسی</h1>
          <p className="text-sm text-muted-foreground">
            رکورد تغییرات قیمت، قرارداد، پرداخت و نقش‌ها. این لاگ فقط افزودنی است و توسط کاربران قابل ویرایش یا حذف نیست.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {(["all", "quote", "contract", "payment", "user_role"] as const).map(
          (k) => (
            <button
              key={k}
              onClick={() => setEntity(k)}
              className={`rounded-md border border-border px-3 py-1 hover:bg-secondary ${
                entity === k ? "bg-secondary text-[color:var(--gold)]" : ""
              }`}
            >
              {k === "all"
                ? "همه"
                : k === "quote"
                  ? "پیش‌فاکتور"
                  : k === "contract"
                    ? "قرارداد"
                    : k === "payment"
                      ? "پرداخت"
                      : "نقش کاربر"}
            </button>
          ),
        )}
      </div>

      {isLoading ? (
        <p>در حال بارگذاری…</p>
      ) : (
        <div className="overflow-auto rounded-xl border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-card/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-start p-3">زمان</th>
                <th className="text-start p-3">عملیات</th>
                <th className="text-start p-3">هدف</th>
                <th className="text-start p-3">کاربر انجام‌دهنده</th>
                <th className="text-start p-3">جزئیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {items.map((r: any) => (
                <tr key={r.id}>
                  <td className="p-3 whitespace-nowrap font-mono text-xs" dir="ltr">
                    {new Date(r.created_at).toLocaleString("fa-IR")}
                  </td>
                  <td className="p-3">
                    {ACTION_LABEL[r.action] ?? r.action}
                  </td>
                  <td className="p-3 text-xs">
                    {r.entity_type}
                    {r.entity_id ? (
                      <div className="font-mono text-[10px] text-muted-foreground" dir="ltr">
                        {String(r.entity_id).slice(0, 8)}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3 text-xs">
                    {r.actor
                      ? `${r.actor.full_name ?? "بدون نام"} — ${r.actor.mobile}`
                      : "سیستم"}
                  </td>
                  <td className="p-3">
                    <pre
                      className="text-[11px] font-mono bg-background/60 p-2 rounded max-w-md overflow-auto"
                      dir="ltr"
                    >
                      {JSON.stringify(r.metadata ?? {}, null, 0)}
                    </pre>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    رویدادی ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

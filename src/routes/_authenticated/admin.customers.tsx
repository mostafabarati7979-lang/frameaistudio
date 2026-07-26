import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminListCustomers, adminSetUserAdmin } from "@/lib/cms.functions";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  head: () => ({
    meta: [
      { title: "مدیریت مشتریان | FrameAI Studio" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const list = useServerFn(adminListCustomers);
  const setAdmin = useServerFn(adminSetUserAdmin);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => list({}),
  });

  async function toggleAdmin(uid: string, grant: boolean) {
    setBusy(uid);
    try {
      await setAdmin({ data: { user_id: uid, grant } });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success(grant ? "نقش ادمین اعطا شد." : "نقش ادمین حذف شد.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const items = (data as any)?.items ?? [];
  const filtered = items.filter(
    (u: any) =>
      !q ||
      (u.full_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (u.mobile ?? "").includes(q),
  );

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">مدیریت مشتریان</h1>
        <input
          placeholder="جستجو نام یا شماره…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input w-64"
        />
      </div>
      {isLoading ? (
        <p>در حال بارگذاری…</p>
      ) : (
        <div className="overflow-auto rounded-xl border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-card/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-start p-3">نام</th>
                <th className="text-start p-3">شماره موبایل</th>
                <th className="p-3">سفارش‌ها</th>
                <th className="p-3">نقش‌ها</th>
                <th className="p-3">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((u: any) => {
                const isAdmin = u.roles.includes("admin");
                return (
                  <tr key={u.id}>
                    <td className="p-3">{u.full_name || "—"}</td>
                    <td className="p-3 font-mono ltr:font-mono" dir="ltr">
                      {u.mobile}
                    </td>
                    <td className="p-3 text-center">{u.order_count}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[11px] rounded px-2 py-0.5 ${
                          isAdmin
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isAdmin ? "ادمین" : "مشتری"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        disabled={busy === u.id}
                        onClick={() => toggleAdmin(u.id, !isAdmin)}
                        className="rounded-md border border-border px-3 py-1 text-xs hover:bg-secondary disabled:opacity-50"
                      >
                        {isAdmin ? "حذف نقش ادمین" : "اعطای ادمین"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    موردی یافت نشد.
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

import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { getMyRole } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "پنل مدیریت | فریم‌ای‌آی" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    // Client-side gate (parent layout is ssr:false). Server fns re-check.
    try {
      const role = await getMyRole();
      if (!role?.isAdmin) throw redirect({ to: "/dashboard" });
    } catch (e: any) {
      if (e?.isRedirect) throw e;
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div dir="rtl">
      <div className="container-page pt-8">
        <nav className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-3">
          <span className="text-sm text-muted-foreground">پنل مدیریت</span>
          <Link
            to="/admin/orders"
            activeProps={{ className: "text-primary font-medium" }}
            className="text-sm hover:text-primary"
          >
            سفارش‌ها
          </Link>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary mr-auto">
            بازگشت به پنل شخصی
          </Link>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}

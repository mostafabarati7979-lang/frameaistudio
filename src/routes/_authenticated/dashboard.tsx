import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/auth.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "پنل کاربری | استودیو فریم‌ای‌آی" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const fetchRole = useServerFn(getMyRole);
  const { data } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
  });

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("خروج انجام شد.");
    navigate({ to: "/" });
  }

  return (
    <div className="container-page py-16" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gradient-gold">پنل کاربری</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data?.isAdmin ? "مدیر سیستم" : "مشتری"}
            </p>
          </div>
          <button
            onClick={signOut}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary transition"
          >
            خروج
          </button>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/50 p-6 backdrop-blur-sm">
          <h2 className="mb-3 text-lg font-semibold">به فریم‌ای‌آی خوش آمدید</h2>
          <p className="text-sm text-muted-foreground leading-7">
            حساب شما فعال است. به‌زودی می‌توانید سفارش جدید ثبت کنید، پیش‌فاکتور دریافت کنید و پروژه‌های خود را در همین پنل پیگیری نمایید.
          </p>
          <div className="mt-6 flex gap-2">
            <Link
              to="/contact"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              ثبت درخواست جدید
            </Link>
            <Link to="/services" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary transition">
              مشاهده خدمات
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "بازیابی رمز عبور | استودیو فریم‌ای‌آی" },
      { name: "description", content: "تعیین رمز عبور جدید برای حساب کاربری." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase auto-processes the recovery link on load; wait for session.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("رمز باید حداقل ۸ کاراکتر باشد.");
    if (password !== confirm) return toast.error("رمز و تکرار آن یکسان نیست.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error("تغییر رمز ناموفق بود.");
    toast.success("رمز عبور با موفقیت تغییر کرد.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4" dir="rtl">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-gradient-gold text-center mb-2">تعیین رمز جدید</h1>
        <p className="text-center text-sm text-muted-foreground mb-6">
          رمز عبور جدید خود را وارد کنید.
        </p>
        <div className="rounded-xl border border-border/70 bg-card/50 p-6 backdrop-blur-sm">
          {!ready ? (
            <p className="text-sm text-muted-foreground text-center">
              در حال بررسی لینک بازیابی… اگر از ایمیل وارد شده‌اید کمی صبر کنید.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm text-foreground/85">رمز عبور جدید</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[color:var(--gold)] transition"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-foreground/85">تکرار رمز عبور</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[color:var(--gold)] transition"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? "در حال ثبت…" : "ثبت رمز جدید"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

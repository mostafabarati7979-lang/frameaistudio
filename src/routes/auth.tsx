import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signUpWithEmail, logPasswordLogin } from "@/lib/auth.functions";

type Mode = "signin" | "signup" | "reset";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "reset"]).optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "ورود و ثبت‌نام | استودیو فریم‌ای‌آی" },
      { name: "description", content: "ورود یا ثبت‌نام در استودیو فریم‌ای‌آی با ایمیل و رمز عبور." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const initial: Mode = search.mode ?? "signin";
  const [mode, setMode] = useState<Mode>(initial);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gradient-gold">حساب کاربری</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            برای ثبت سفارش و مشاهده پروژه‌های خود وارد شوید.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1 mb-6 text-xs">
          <TabBtn active={mode === "signin"} onClick={() => setMode("signin")}>
            ورود
          </TabBtn>
          <TabBtn active={mode === "signup"} onClick={() => setMode("signup")}>
            ثبت‌نام
          </TabBtn>
          <TabBtn active={mode === "reset"} onClick={() => setMode("reset")}>
            بازیابی رمز
          </TabBtn>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/50 p-6 backdrop-blur-sm">
          {mode === "signin" && <LoginForm onSwitch={setMode} nextPath={search.next} />}
          {mode === "signup" && <SignupForm nextPath={search.next} />}
          {mode === "reset" && <ResetForm onDone={() => setMode("signin")} />}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          با ورود، <Link to="/faq" className="text-[color:var(--gold)] hover:underline">قوانین و حریم خصوصی</Link> را می‌پذیرید.
        </p>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md py-2 font-medium transition ${
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-foreground/85">{label}</span>
      <input
        {...rest}
        className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[color:var(--gold)] transition"
      />
    </label>
  );
}

function SubmitBtn({ children, loading }: { children: React.ReactNode; loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
    >
      {loading ? "در حال پردازش…" : children}
    </button>
  );
}

// -------------------- Sign in (email + password) --------------------
function LoginForm({ onSwitch, nextPath }: { onSwitch: (m: Mode) => void; nextPath?: string }) {
  const navigate = useNavigate();
  const logLogin = useServerFn(logPasswordLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    try { await logLogin({ data: { mobile: email, success: !error } }); } catch {}
    if (error) return toast.error("ایمیل یا رمز عبور نامعتبر است.");
    toast.success("خوش آمدید!");
    navigate({ to: (nextPath as "/dashboard") ?? "/dashboard" });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="ایمیل" type="email" placeholder="you@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      <Input label="رمز عبور" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      <SubmitBtn loading={loading}>ورود</SubmitBtn>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button type="button" onClick={() => onSwitch("reset")} className="hover:text-[color:var(--gold)]">رمز خود را فراموش کرده‌اید؟</button>
        <button type="button" onClick={() => onSwitch("signup")} className="hover:text-[color:var(--gold)]">حساب ندارید؟ ثبت‌نام</button>
      </div>
    </form>
  );
}

// -------------------- Signup --------------------
function SignupForm({ nextPath }: { nextPath?: string }) {
  const navigate = useNavigate();
  const doSignup = useServerFn(signUpWithEmail);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (username.trim().length < 2) return toast.error("نام کاربری حداقل ۲ کاراکتر باشد.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("ایمیل معتبر نیست.");
    if (password !== confirm) return toast.error("رمز و تکرار آن یکسان نیست.");
    if (password.length < 8) return toast.error("رمز باید حداقل ۸ کاراکتر باشد.");
    setLoading(true);
    try {
      const res = await doSignup({ data: { username: username.trim(), email: email.trim().toLowerCase(), password, mobile } });
      const { error } = await supabase.auth.signInWithPassword({ email: res.email, password });
      if (error) throw error;
      toast.success("ثبت‌نام با موفقیت انجام شد.");
      navigate({ to: (nextPath as "/dashboard") ?? "/dashboard" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="نام کاربری" placeholder="نام و نام خانوادگی" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="name" required />
      <Input label="ایمیل (Gmail)" type="email" placeholder="you@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      <Input label="شماره تماس" placeholder="۰۹۱۲۳۴۵۶۷۸۹" value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" autoComplete="tel" required />
      <Input label="رمز عبور (حداقل ۸ کاراکتر)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
      <Input label="تکرار رمز عبور" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required autoComplete="new-password" />
      <SubmitBtn loading={loading}>ثبت‌نام</SubmitBtn>
    </form>
  );
}

// -------------------- Reset via email --------------------
function ResetForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("ایمیل معتبر نیست.");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error("ارسال ایمیل بازیابی ناموفق بود.");
    setSent(true);
    toast.success("لینک بازیابی به ایمیل شما ارسال شد.");
  }

  if (sent) {
    return (
      <div className="space-y-4 text-sm text-foreground/85">
        <p>لینک بازیابی رمز عبور به ایمیل <span className="text-[color:var(--gold)]">{email}</span> ارسال شد.</p>
        <p className="text-muted-foreground text-xs">اگر ایمیل را نمی‌بینید، پوشه اسپم را بررسی کنید.</p>
        <button type="button" onClick={onDone} className="w-full rounded-md border border-border py-2.5 text-sm hover:bg-secondary transition">
          بازگشت به ورود
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="ایمیل حساب کاربری" type="email" placeholder="you@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      <SubmitBtn loading={loading}>ارسال لینک بازیابی</SubmitBtn>
    </form>
  );
}

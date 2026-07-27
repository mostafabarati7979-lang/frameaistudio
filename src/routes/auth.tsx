import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  requestOtp,
  signUpWithPassword,
  verifyOtpForLogin,
  logPasswordLogin,
  resetPasswordWithOtp,
} from "@/lib/auth.functions";
import { normalizeIranianMobile, mobileToInternalEmail } from "@/lib/mobile";

type Mode = "signin-password" | "signin-otp" | "signup" | "reset";

const searchSchema = z.object({
  mode: z.enum(["signin-password", "signin-otp", "signup", "reset"]).optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "ورود و ثبت‌نام | استودیو فریم‌ای‌آی" },
      { name: "description", content: "ورود یا ثبت‌نام با شماره موبایل و کد تایید در استودیو فریم‌ای‌آی." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const initial: Mode = search.mode ?? "signin-password";
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

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1 mb-6 text-xs">
          <TabBtn active={mode === "signin-password"} onClick={() => setMode("signin-password")}>
            ورود با رمز
          </TabBtn>
          <TabBtn active={mode === "signin-otp"} onClick={() => setMode("signin-otp")}>
            ورود با کد یکبار‌مصرف
          </TabBtn>
          <TabBtn active={mode === "signup"} onClick={() => setMode("signup")}>
            ثبت‌نام
          </TabBtn>
          <TabBtn active={mode === "reset"} onClick={() => setMode("reset")}>
            بازیابی رمز
          </TabBtn>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/50 p-6 backdrop-blur-sm">
          {mode === "signin-password" && <PasswordLoginForm onSwitch={setMode} nextPath={search.next} />}
          {mode === "signin-otp" && <OtpLoginForm nextPath={search.next} />}
          {mode === "signup" && <SignupForm nextPath={search.next} />}
          {mode === "reset" && <ResetForm onDone={() => setMode("signin-password")} />}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          با ورود، <Link to="/faq" className="text-[color:var(--gold)] hover:underline">قوانین و حریم خصوصی</Link> را می‌پذیرید.
        </p>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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

// -------------------- Sign in with password --------------------
function PasswordLoginForm({
  onSwitch,
  nextPath,
}: {
  onSwitch: (m: Mode) => void;
  nextPath?: string;
}) {
  const navigate = useNavigate();
  const logLogin = useServerFn(logPasswordLogin);
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const norm = normalizeIranianMobile(mobile);
    if (!norm) return toast.error("شماره موبایل معتبر نیست.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: mobileToInternalEmail(norm),
      password,
    });
    setLoading(false);
    try { await logLogin({ data: { mobile: norm, success: !error } }); } catch {}
    if (error) return toast.error("شماره موبایل یا رمز عبور نامعتبر است.");
    toast.success("خوش آمدید!");
    navigate({ to: (nextPath as "/dashboard") ?? "/dashboard" });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="شماره موبایل" placeholder="۰۹۱۲۳۴۵۶۷۸۹" value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" autoComplete="tel" required />
      <Input label="رمز عبور" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      <SubmitBtn loading={loading}>ورود</SubmitBtn>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button type="button" onClick={() => onSwitch("reset")} className="hover:text-[color:var(--gold)]">رمز خود را فراموش کرده‌اید؟</button>
        <button type="button" onClick={() => onSwitch("signup")} className="hover:text-[color:var(--gold)]">حساب ندارید؟ ثبت‌نام</button>
      </div>
    </form>
  );
}

// -------------------- OTP request helper --------------------
function useOtpRequest() {
  const req = useServerFn(requestOtp);
  const [cooldown, setCooldown] = useState(0);
  async function send(mobile: string, purpose: "signup" | "login" | "reset") {
    const norm = normalizeIranianMobile(mobile);
    if (!norm) { toast.error("شماره موبایل معتبر نیست."); return null; }
    try {
      await req({ data: { mobile: norm, purpose } });
      toast.success("کد تایید ارسال شد.");
      setCooldown(60);
      const iv = setInterval(() => setCooldown((c) => { if (c <= 1) { clearInterval(iv); return 0; } return c - 1; }), 1000);
      return norm;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    }
  }
  return { send, cooldown };
}

// -------------------- OTP login --------------------
function OtpLoginForm({ nextPath }: { nextPath?: string }) {
  const navigate = useNavigate();
  const { send, cooldown } = useOtpRequest();
  const verify = useServerFn(verifyOtpForLogin);
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode() {
    const m = await send(mobile, "login");
    if (m) setSent(m);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sent) return;
    setLoading(true);
    try {
      const res = await verify({ data: { mobile: sent, code } });
      const { error } = await supabase.auth.verifyOtp({
        token_hash: res.tokenHash,
        type: "magiclink",
      });
      if (error) throw new Error("ورود ناموفق بود.");
      toast.success("خوش آمدید!");
      navigate({ to: (nextPath as "/dashboard") ?? "/dashboard" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="شماره موبایل" placeholder="۰۹۱۲۳۴۵۶۷۸۹" value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" autoComplete="tel" required disabled={!!sent} />
      {!sent ? (
        <button type="button" onClick={requestCode} disabled={cooldown > 0} className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50">
          {cooldown > 0 ? `ارسال مجدد در ${cooldown} ثانیه` : "ارسال کد تایید"}
        </button>
      ) : (
        <>
          <Input label="کد تایید ۶ رقمی" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} required />
          <SubmitBtn loading={loading}>ورود</SubmitBtn>
          <button type="button" onClick={requestCode} disabled={cooldown > 0} className="w-full text-xs text-muted-foreground hover:text-[color:var(--gold)]">
            {cooldown > 0 ? `ارسال مجدد کد در ${cooldown} ثانیه` : "ارسال مجدد کد"}
          </button>
        </>
      )}
    </form>
  );
}

// -------------------- Signup --------------------
function SignupForm({ nextPath }: { nextPath?: string }) {
  const navigate = useNavigate();
  const { send, cooldown } = useOtpRequest();
  const doSignup = useServerFn(signUpWithOtp);
  const [step, setStep] = useState<1 | 2>(1);
  const [mobile, setMobile] = useState("");
  const [normalized, setNormalized] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  async function requestCode() {
    const m = await send(mobile, "signup");
    if (m) { setNormalized(m); setStep(2); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error("رمز عبور و تکرار آن یکسان نیست.");
    if (password.length < 8) return toast.error("رمز باید حداقل ۸ کاراکتر باشد.");
    if (!agree) return toast.error("پذیرش قوانین الزامی است.");
    setLoading(true);
    try {
      const res = await doSignup({ data: { mobile: normalized, code, password, fullName } });
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
      <Input label="نام و نام خانوادگی" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} maxLength={100} />
      <Input label="شماره موبایل" placeholder="۰۹۱۲۳۴۵۶۷۸۹" value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" autoComplete="tel" required disabled={step === 2} />
      {step === 1 ? (
        <button type="button" onClick={requestCode} disabled={cooldown > 0} className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50">
          {cooldown > 0 ? `ارسال مجدد در ${cooldown} ثانیه` : "ارسال کد تایید"}
        </button>
      ) : (
        <>
          <Input label="کد تایید ۶ رقمی" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} required />
          <Input label="رمز عبور (حداقل ۸ کاراکتر)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
          <Input label="تکرار رمز عبور" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required autoComplete="new-password" />
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
            <span>قوانین استودیو و حریم خصوصی را می‌پذیرم.</span>
          </label>
          <SubmitBtn loading={loading}>ثبت‌نام</SubmitBtn>
        </>
      )}
    </form>
  );
}

// -------------------- Reset password --------------------
function ResetForm({ onDone }: { onDone: () => void }) {
  const { send, cooldown } = useOtpRequest();
  const doReset = useServerFn(resetPasswordWithOtp);
  const [mobile, setMobile] = useState("");
  const [normalized, setNormalized] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  async function requestCode() {
    const m = await send(mobile, "reset");
    if (m) { setNormalized(m); setSent(true); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error("رمز عبور و تکرار آن یکسان نیست.");
    setLoading(true);
    try {
      await doReset({ data: { mobile: normalized, code, password } });
      toast.success("رمز عبور با موفقیت تغییر کرد. اکنون وارد شوید.");
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="شماره موبایل" placeholder="۰۹۱۲۳۴۵۶۷۸۹" value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" required disabled={sent} />
      {!sent ? (
        <button type="button" onClick={requestCode} disabled={cooldown > 0} className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50">
          {cooldown > 0 ? `ارسال مجدد در ${cooldown} ثانیه` : "ارسال کد تایید"}
        </button>
      ) : (
        <>
          <Input label="کد تایید ۶ رقمی" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} required />
          <Input label="رمز عبور جدید (حداقل ۸ کاراکتر)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
          <Input label="تکرار رمز عبور" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required autoComplete="new-password" />
          <SubmitBtn loading={loading}>ثبت رمز جدید</SubmitBtn>
        </>
      )}
    </form>
  );
}

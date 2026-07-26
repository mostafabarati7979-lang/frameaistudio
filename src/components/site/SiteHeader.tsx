import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsBell } from "@/components/site/NotificationsBell";

const nav = [
  { to: "/", label: "صفحه اصلی" },
  { to: "/services", label: "خدمات" },
  { to: "/packages", label: "پکیج‌ها" },
  { to: "/portfolio", label: "نمونه‌کارها" },
  { to: "/blog", label: "وبلاگ" },
  { to: "/faq", label: "سوالات متداول" },
  { to: "/about", label: "درباره ما" },
  { to: "/contact", label: "تماس" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSignedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSignedIn(!!session);
      router.invalidate();
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [router]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="container-page flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="inline-block w-7 h-7 rounded-sm bg-gradient-to-br from-[color:var(--gold-soft)] to-[color:var(--gold)]" />
          <span className="font-bold text-lg tracking-tight">
            <span className="text-gradient-gold">FrameAI</span>
            <span className="text-foreground/90"> Studio</span>
          </span>
        </Link>
        <nav className="hidden lg:flex items-center gap-1">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="px-3 py-2 text-sm text-foreground/80 hover:text-[color:var(--gold)] transition"
              activeProps={{ className: "px-3 py-2 text-sm text-[color:var(--gold)]" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-2">
          {signedIn ? (
            <>
              <NotificationsBell />
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition"
              >
                <User size={16} />
                پنل کاربری
              </Link>
            </>
          ) : (
            <Link
              to="/auth"
              search={{ mode: "signin-password" }}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary transition"
            >
              ورود / ثبت‌نام
            </Link>
          )}
          <Link
            to="/contact"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            ثبت درخواست
          </Link>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden p-2 rounded-md hover:bg-secondary"
          aria-label="منو"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden border-t border-border">
          <nav className="container-page py-3 flex flex-col">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm text-foreground/85 hover:text-[color:var(--gold)]"
              >
                {item.label}
              </Link>
            ))}
            {signedIn ? (
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-center"
              >
                پنل کاربری
              </Link>
            ) : (
              <Link
                to="/auth"
                search={{ mode: "signin-password" }}
                onClick={() => setOpen(false)}
                className="mt-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-center"
              >
                ورود / ثبت‌نام
              </Link>
            )}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground text-center"
            >
              ثبت درخواست
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "../components/site/SiteHeader";
import { SiteFooter } from "../components/site/SiteFooter";

function NotFoundComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-gradient-gold">۴۰۴</h1>
        <p className="mt-4 text-lg text-muted-foreground">صفحه‌ای که دنبالش بودید پیدا نشد.</p>
        <a href="/" className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-primary-foreground font-medium hover:opacity-90 transition">
          بازگشت به صفحه اصلی
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">این صفحه بارگذاری نشد</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          خطایی رخ داد. لطفاً دوباره تلاش کنید یا به صفحه اصلی بازگردید.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium"
          >
            تلاش دوباره
          </button>
          <a href="/" className="rounded-md border border-border px-4 py-2 text-foreground">
            صفحه اصلی
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "استودیو فریم‌ای‌آی | فیلم عروسی، فرمالیته و محتوای سینمایی" },
      { name: "description", content: "استودیو تخصصی فیلم عروسی، فرمالیته، تیزر سینمایی و محتوای تبلیغاتی. روایت لحظه‌های واقعی شما با کیفیت سینمایی." },
      { property: "og:title", content: "استودیو فریم‌ای‌آی | فیلم و روایت سینمایی" },
      { property: "og:description", content: "لحظه واقعی شما، با روایت سینمایی آینده." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "fa_IR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#121212" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
        <Toaster richColors position="top-center" dir="rtl" />
      </div>
    </QueryClientProvider>
  );
}

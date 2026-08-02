import { useRouter } from "@tanstack/react-router";

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function ContentErrorState({ error }: { error: Error }) {
  const router = useRouter();
  console.error(error);
  return (
    <div className="container-page py-24 text-center" dir="rtl">
      <h1 className="text-2xl font-bold">محتوا بارگذاری نشد</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        در دریافت اطلاعات از سرور مشکلی پیش آمد. لطفاً دوباره تلاش کنید.
      </p>
      <button
        onClick={() => router.invalidate()}
        className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
      >
        تلاش دوباره
      </button>
    </div>
  );
}

export function ContentNotFound({ message }: { message: string }) {
  return (
    <div className="container-page py-24 text-center" dir="rtl">
      <h1 className="text-2xl font-bold">{message}</h1>
      <p className="mt-3 text-sm text-muted-foreground">این مورد پیدا نشد یا منتشر نشده است.</p>
      <a href="/" className="mt-6 inline-block rounded-md border border-border px-5 py-2.5 text-sm">
        صفحه اصلی
      </a>
    </div>
  );
}

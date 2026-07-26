import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMyOrderReview, upsertMyReview } from "@/lib/reviews.functions";

function Stars({
  value,
  onChange,
  readOnly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-row-reverse justify-end gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={`text-2xl leading-none transition ${
            n <= value ? "text-[color:var(--gold)]" : "text-muted-foreground/40"
          } ${readOnly ? "cursor-default" : "hover:scale-110"}`}
          aria-label={`${n} ستاره`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ReviewPanel({ orderId }: { orderId: string }) {
  const get = useServerFn(getMyOrderReview);
  const save = useServerFn(upsertMyReview);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["review", orderId],
    queryFn: () => get({ data: { order_id: orderId } }),
  });

  const existing = (data as any)?.review;
  const eligible = (data as any)?.eligible;
  const [rating, setRating] = useState<number>(existing?.rating ?? 5);
  const [comment, setComment] = useState<string>(existing?.comment ?? "");
  const [busy, setBusy] = useState(false);

  if (!data) return null;
  if (!eligible) return null;

  const locked = !!existing?.is_published;

  async function onSubmit() {
    setBusy(true);
    try {
      await save({
        data: { order_id: orderId, rating, comment: comment || null },
      });
      toast.success("نظر شما ثبت شد.");
      qc.invalidateQueries({ queryKey: ["review", orderId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-border/70 bg-card/40 p-5">
      <h2 className="text-lg font-semibold mb-1">نظر و امتیاز شما</h2>
      <p className="text-sm text-muted-foreground mb-4">
        {locked
          ? "این نظر منتشر شده و قابل ویرایش نیست. سپاسگزاریم."
          : "پس از تحویل نهایی، امتیاز خود را ثبت کنید."}
      </p>
      <Stars value={rating} onChange={setRating} readOnly={locked} />
      <textarea
        className="input mt-4 w-full"
        rows={4}
        maxLength={2000}
        placeholder="تجربه‌ی شما از همکاری با استودیو…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={locked}
      />
      {!locked && (
        <button
          onClick={onSubmit}
          disabled={busy}
          className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {existing ? "به‌روزرسانی نظر" : "ثبت نظر"}
        </button>
      )}
      {existing && !existing.is_published && (
        <p className="mt-2 text-xs text-muted-foreground">
          نظر شما در انتظار انتشار توسط مدیر است.
        </p>
      )}
    </section>
  );
}

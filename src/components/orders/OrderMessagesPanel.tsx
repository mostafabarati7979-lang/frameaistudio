import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listOrderMessages, sendOrderMessage } from "@/lib/messages.functions";

export function OrderMessagesPanel({ orderId }: { orderId: string }) {
  const list = useServerFn(listOrderMessages);
  const send = useServerFn(sendOrderMessage);
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["messages", orderId],
    queryFn: () => list({ data: { order_id: orderId } }),
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data]);

  if (!data) return null;
  const { messages, isAdmin } = data as any;

  async function onSend() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      await send({ data: { order_id: orderId, body: text } });
      setBody("");
      qc.invalidateQueries({ queryKey: ["messages", orderId] });
      qc.invalidateQueries({ queryKey: ["notifications-badge"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold mb-3">گفتگو با {isAdmin ? "مشتری" : "استودیو"}</h2>
      <div
        ref={scrollRef}
        className="rounded-xl border border-border/70 bg-card/40 p-3 max-h-80 overflow-auto space-y-2"
      >
        {(messages as any[]).length === 0 && (
          <p className="text-sm text-muted-foreground">هنوز پیامی رد و بدل نشده است.</p>
        )}
        {(messages as any[]).map((m) => {
          const mine =
            (isAdmin && m.sender_role === "admin") ||
            (!isAdmin && m.sender_role === "customer");
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                mine
                  ? "ms-auto bg-primary/15 text-foreground"
                  : "me-auto bg-secondary text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap leading-6">{m.body}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(m.created_at).toLocaleString("fa-IR")}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <textarea
          rows={2}
          className="input flex-1"
          placeholder="متن پیام…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
        />
        <button
          onClick={onSend}
          disabled={busy || !body.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          ارسال
        </button>
      </div>
    </section>
  );
}

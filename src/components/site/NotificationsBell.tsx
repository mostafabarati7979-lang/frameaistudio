import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/messages.functions";

export function NotificationsBell() {
  const list = useServerFn(listMyNotifications);
  const markRead = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["notifications-badge"],
    queryFn: () => list({ data: { limit: 20 } }),
    refetchInterval: 30000,
  });
  const items = (data as any)?.items ?? [];
  const unread = (data as any)?.unread ?? 0;

  async function onOpen() {
    setOpen((v) => !v);
    if (!open && unread > 0) {
      await markAll({});
      qc.invalidateQueries({ queryKey: ["notifications-badge"] });
    }
  }
  async function onClick(id: string) {
    await markRead({ data: { id } });
    qc.invalidateQueries({ queryKey: ["notifications-badge"] });
  }

  return (
    <div className="relative">
      <button
        onClick={onOpen}
        aria-label="اعلان‌ها"
        className="relative rounded-md border border-border/70 px-3 py-1 text-sm hover:bg-secondary"
      >
        اعلان‌ها
        {unread > 0 && (
          <span className="absolute -top-1 -end-1 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-80 rounded-xl border border-border/70 bg-card p-2 shadow-lg z-50">
          {items.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">اعلانی وجود ندارد.</p>
          )}
          <ul className="max-h-96 overflow-auto divide-y divide-border/50">
            {items.map((n: any) => {
              const body = (
                <div className="p-3 hover:bg-secondary/50 rounded-md">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.read_at && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  {n.message && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {n.message}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString("fa-IR")}
                  </p>
                </div>
              );
              return (
                <li key={n.id} onClick={() => onClick(n.id)}>
                  {n.link ? (
                    <Link to={n.link as any} onClick={() => setOpen(false)}>
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

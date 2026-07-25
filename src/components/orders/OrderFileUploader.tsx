import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { registerOrderFile } from "@/lib/orders.functions";
import { ALLOWED_MIME, MAX_FILE_BYTES } from "@/lib/orders-schema";

export function OrderFileUploader({ orderId }: { orderId: string }) {
  const register = useServerFn(registerOrderFile);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ابتدا وارد شوید.");

      for (const file of files) {
        if (!ALLOWED_MIME[file.type]) {
          toast.error(`نوع فایل «${file.name}» مجاز نیست.`);
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`حجم فایل «${file.name}» بیش از حد مجاز است.`);
          continue;
        }
        const safeName = file.name.replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 120);
        const path = `${user.id}/${orderId}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("order-files")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          toast.error(`بارگذاری «${file.name}» ناموفق بود.`);
          continue;
        }
        try {
          await register({
            data: {
              order_id: orderId,
              storage_path: path,
              file_name: file.name,
              content_type: file.type,
              size_bytes: file.size,
              kind: ALLOWED_MIME[file.type],
            },
          });
          toast.success(`«${file.name}» بارگذاری شد.`);
        } catch (e) {
          await supabase.storage.from("order-files").remove([path]);
          toast.error((e as Error).message);
        }
      }
      qc.invalidateQueries({ queryKey: ["order", orderId] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <label
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/70 bg-background/40 p-6 cursor-pointer hover:border-primary/60 transition ${
        busy ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      <input
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        accept={Object.keys(ALLOWED_MIME).join(",")}
      />
      <span className="text-sm font-medium">
        {busy ? "در حال بارگذاری…" : "انتخاب فایل یا کشیدن به این ناحیه"}
      </span>
      <span className="text-xs text-muted-foreground">
        تصویر، ویدئو، صدا، لوگو، PDF یا نمونه — حداکثر ۲۰۰ مگابایت
      </span>
    </label>
  );
}

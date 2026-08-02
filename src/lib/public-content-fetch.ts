// Server-side fetch of published content via the publishable key (anon RLS read).
// Only ever called from server function handlers / server route handlers.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ContentKind, ContentRow } from "./content-types";

export async function fetchPublicContent(kinds: ContentKind[]): Promise<ContentRow[]> {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error("Supabase environment variables are not configured");

  const client = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });

  const { data, error } = await client
    .from("content_items")
    .select("id, kind, slug, title, summary, body, cover_url, sort_order")
    .in("kind", kinds)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ContentRow[];
}

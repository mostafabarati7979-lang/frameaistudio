import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Preflight regression suite: listMyOrders (and the rest of the order flow)
// goes through the Data API, which needs explicit table GRANTs on top of RLS.
// A missing GRANT surfaces in the app as "دریافت سفارش‌ها ناموفق بود.".

const HAS_DB = !!process.env.PGHOST;

function q(sql: string): string[] {
  return execFileSync("psql", ["-tAX", "-c", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
    .trim()
    .split("\n")
    .filter(Boolean);
}

// One round-trip: which (role, table, privilege) combos are missing/granted.
function privMatrix(
  roles: string[],
  tables: string[],
  privs: string[],
): Record<string, boolean> {
  const rows = q(
    `select r.role || ':' || t.tbl || '.' || p.priv || '=' ||
            has_table_privilege(r.role, 'public.' || quote_ident(t.tbl), p.priv)::text
       from unnest(array[${roles.map((r) => `'${r}'`).join(",")}]) as r(role),
            unnest(array[${tables.map((t) => `'${t}'`).join(",")}]) as t(tbl),
            unnest(array[${privs.map((p) => `'${p}'`).join(",")}]) as p(priv)`,
  );
  const out: Record<string, boolean> = {};
  for (const row of rows) {
    const [key, val] = row.split("=");
    out[key!] = val === "true";
  }
  return out;
}

// Tables the authenticated customer/admin flows read and write directly.
const CRUD_TABLES = [
  "orders",
  "order_files",
  "order_messages",
  "quotes",
  "quote_items",
  "contracts",
  "payments",
  "project_milestones",
  "project_deliverables",
  "reviews",
  "notifications",
];

// Server-only tables: must never be reachable by anon/authenticated.
const INTERNAL_TABLES = ["otp_codes", "rate_limits", "login_attempts"];

const CRUD = ["SELECT", "INSERT", "UPDATE", "DELETE"];

describe.skipIf(!HAS_DB)("Data API grants preflight (listMyOrders path)", () => {
  it("grants full CRUD on app tables to authenticated", () => {
    const m = privMatrix(["authenticated"], CRUD_TABLES, CRUD);
    const missing = Object.entries(m)
      .filter(([, ok]) => !ok)
      .map(([k]) => k);
    expect(missing).toEqual([]);
  });

  it("grants profiles read/update and user_roles read to authenticated", () => {
    const m = privMatrix(["authenticated"], ["profiles", "user_roles"], [
      "SELECT",
      "UPDATE",
    ]);
    expect(m["authenticated:profiles.SELECT"]).toBe(true);
    expect(m["authenticated:profiles.UPDATE"]).toBe(true);
    expect(m["authenticated:user_roles.SELECT"]).toBe(true);
  });

  it("grants ALL to service_role on every public table", () => {
    const missing = q(
      `select coalesce(string_agg(c.relname, ','), '')
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where c.relkind = 'r' and n.nspname = 'public'
          and not (has_table_privilege('service_role','public.'||quote_ident(c.relname),'SELECT')
               and has_table_privilege('service_role','public.'||quote_ident(c.relname),'INSERT')
               and has_table_privilege('service_role','public.'||quote_ident(c.relname),'UPDATE')
               and has_table_privilege('service_role','public.'||quote_ident(c.relname),'DELETE'))`,
    );
    expect(missing[0] ?? "").toBe("");
  });

  it("keeps internal tables unreachable from the Data API roles", () => {
    const m = privMatrix(["anon", "authenticated"], INTERNAL_TABLES, CRUD);
    const leaked = Object.entries(m)
      .filter(([, ok]) => ok)
      .map(([k]) => k);
    expect(leaked).toEqual([]);
  });

  it("exposes only public content to anon", () => {
    const m = privMatrix(
      ["anon"],
      ["content_items", "reviews", "orders", "payments"],
      ["SELECT"],
    );
    expect(m["anon:content_items.SELECT"]).toBe(true);
    expect(m["anon:reviews.SELECT"]).toBe(true);
    expect(m["anon:orders.SELECT"]).toBe(false);
    expect(m["anon:payments.SELECT"]).toBe(false);
  });

  it("keeps RLS enabled and at least one policy on every granted app table", () => {
    const tables = [...CRUD_TABLES, "profiles", "user_roles"];
    const rows = q(
      `select c.relname || '|' || c.relrowsecurity::text || '|' ||
              (select count(*) from pg_policy p where p.polrelid = c.oid)
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = any(array[${tables.map((t) => `'${t}'`).join(",")}])`,
    );
    expect(rows).toHaveLength(tables.length);
    for (const row of rows) {
      const [name, rls, policies] = row.split("|");
      expect(rls, `${name} RLS`).toBe("true");
      expect(Number(policies), `${name} policies`).toBeGreaterThan(0);
    }
  });
});

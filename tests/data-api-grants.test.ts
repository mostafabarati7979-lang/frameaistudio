import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Preflight regression suite: listMyOrders (and the rest of the order flow)
// goes through the Data API, which needs explicit table GRANTs on top of RLS.
// A missing GRANT surfaces in the app as "دریافت سفارش‌ها ناموفق بود.".

const HAS_DB = !!process.env.PGHOST;

function q(sql: string): string {
  return execFileSync("psql", ["-tAX", "-c", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function priv(role: string, table: string, p: string): boolean {
  return q(`select has_table_privilege('${role}','public.${table}','${p}')`) === "t";
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

describe.skipIf(!HAS_DB)("Data API grants preflight (listMyOrders path)", () => {
  it("grants full CRUD on app tables to authenticated", () => {
    const missing: string[] = [];
    for (const t of CRUD_TABLES) {
      for (const p of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
        if (!priv("authenticated", t, p)) missing.push(`${t}.${p}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("grants profiles read/update to authenticated", () => {
    expect(priv("authenticated", "profiles", "SELECT")).toBe(true);
    expect(priv("authenticated", "profiles", "UPDATE")).toBe(true);
  });

  it("lets authenticated read user_roles for role checks", () => {
    expect(priv("authenticated", "user_roles", "SELECT")).toBe(true);
  });

  it("grants ALL to service_role on every public table", () => {
    const missing = q(
      `select string_agg(c.relname, ',')
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where c.relkind = 'r' and n.nspname = 'public'
          and not (has_table_privilege('service_role','public.'||quote_ident(c.relname),'SELECT')
               and has_table_privilege('service_role','public.'||quote_ident(c.relname),'INSERT')
               and has_table_privilege('service_role','public.'||quote_ident(c.relname),'UPDATE')
               and has_table_privilege('service_role','public.'||quote_ident(c.relname),'DELETE'))`,
    );
    expect(missing).toBe("");
  });

  it("keeps internal tables unreachable from the Data API roles", () => {
    const leaked: string[] = [];
    for (const t of INTERNAL_TABLES) {
      for (const role of ["anon", "authenticated"]) {
        for (const p of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
          if (priv(role, t, p)) leaked.push(`${role}:${t}.${p}`);
        }
      }
    }
    expect(leaked).toEqual([]);
  });

  it("exposes only public content to anon", () => {
    expect(priv("anon", "content_items", "SELECT")).toBe(true);
    expect(priv("anon", "reviews", "SELECT")).toBe(true);
    expect(priv("anon", "orders", "SELECT")).toBe(false);
    expect(priv("anon", "payments", "SELECT")).toBe(false);
  });

  it("keeps RLS enabled on every granted app table", () => {
    for (const t of [...CRUD_TABLES, "profiles", "user_roles"]) {
      expect(q(`select relrowsecurity from pg_class where relname = '${t}'`)).toBe("t");
    }
  });

  it("has at least one policy per app table so grants are not blind", () => {
    const unguarded = q(
      `select string_agg(c.relname, ',')
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
          and c.relname = any(array[${CRUD_TABLES.map((t) => `'${t}'`).join(",")}])
          and not exists (select 1 from pg_policy p where p.polrelid = c.oid)`,
    );
    expect(unguarded).toBe("");
  });
});

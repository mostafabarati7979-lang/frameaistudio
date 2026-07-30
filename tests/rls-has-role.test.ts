import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Regression suite for the migration that revoked direct EXECUTE on
// public.has_role(uuid, app_role). The function must stay unusable through the
// REST API (rpc) while still working inside RLS policy expressions.

const HAS_DB = !!process.env.PGHOST;

function q(sql: string): string {
  return execFileSync("psql", ["-tAX", "-c", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const SIG = "public.has_role(uuid,public.app_role)";

describe.skipIf(!HAS_DB)("has_role RLS regression", () => {
  it("is not directly executable by PUBLIC, anon or authenticated", () => {
    const rows = q(
      `select has_function_privilege('anon','${SIG}','EXECUTE'),
              has_function_privilege('authenticated','${SIG}','EXECUTE'),
              coalesce((select true from aclexplode(proacl) a
                        where a.grantee = 0 and a.privilege_type = 'EXECUTE'), false)
       from pg_proc where oid = '${SIG}'::regprocedure`,
    );
    expect(rows).toBe("f|f|f");
  });

  it("stays SECURITY DEFINER, stable and owned by a superuser role", () => {
    const [secdef, volatility, owner] = q(
      `select p.prosecdef, p.provolatile, r.rolname
       from pg_proc p join pg_roles r on r.oid = p.proowner
       where p.oid = '${SIG}'::regprocedure`,
    ).split("|");
    // SECURITY INVOKER would cause infinite RLS recursion on user_roles.
    expect(secdef).toBe("t");
    expect(volatility).toBe("s");
    expect(owner).toBe("postgres");
  });

  it("still resolves and returns correct results when evaluated", () => {
    const adminId = q(
      `select user_id from public.user_roles where role = 'admin' limit 1`,
    );
    expect(adminId).not.toBe("");
    const res = q(
      `select public.has_role('${adminId}','admin'),
              public.has_role('00000000-0000-0000-0000-000000000000','admin')`,
    );
    expect(res).toBe("t|f");
  });

  it("is still referenced by RLS policies that keep working", () => {
    const policies = q(
      `select count(*) from pg_policy p
       where pg_get_expr(p.polqual, p.polrelid) like '%has_role%'
          or pg_get_expr(p.polwithcheck, p.polrelid) like '%has_role%'`,
    );
    expect(Number(policies)).toBeGreaterThan(0);

    // Policy expressions are re-parsed here; a missing/unresolvable function
    // would make pg_get_expr fail or drop the reference.
    const tables = q(
      `select distinct c.relname from pg_policy p
       join pg_class c on c.oid = p.polrelid
       where pg_get_expr(p.polqual, p.polrelid) like '%has_role%'`,
    ).split("\n");
    expect(tables).toContain("user_roles");

    // RLS must remain enabled on the tables those policies guard.
    for (const t of ["user_roles", "profiles", "orders"]) {
      expect(q(`select relrowsecurity from pg_class where relname = '${t}'`)).toBe("t");
    }
  });

  it("keeps policy-protected tables reachable through the Data API grants", () => {
    const grant = q(
      `select has_table_privilege('authenticated','public.user_roles','SELECT')`,
    );
    expect(grant).toBe("t");
  });
});

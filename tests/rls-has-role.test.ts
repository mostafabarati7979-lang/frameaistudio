import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Regression suite for the migration that moved has_role into the private
// schema. It must stay unreachable through the REST API (private schema is not
// exposed / anon has no rights) while still working inside RLS policies.

const HAS_DB = !!process.env.PGHOST;

function q(sql: string): string {
  return execFileSync("psql", ["-tAX", "-c", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

// Catalog lookup by name: casting to regprocedure needs USAGE on the schema,
// which the test role intentionally does not have.
const PROC = `(select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'private' and p.proname = 'has_role')`;

describe.skipIf(!HAS_DB)("has_role RLS regression", () => {
  it("lives in the private (non Data-API) schema", () => {
    expect(q(`select count(*) from (${PROC}) t`)).toBe("1");
    // Nothing named has_role remains in the API-exposed public schema.
    expect(
      q(`select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'has_role'`),
    ).toBe("0");
  });

  it("is not exposed to anon/PUBLIC but is executable by authenticated", () => {
    const rows = q(
      `select has_function_privilege('anon', oid, 'EXECUTE'),
              has_function_privilege('authenticated', oid, 'EXECUTE'),
              coalesce((select true from aclexplode(proacl) a
                        where a.grantee = 0 and a.privilege_type = 'EXECUTE'), false)
       from pg_proc where oid = ${PROC}`,
    );
    expect(rows).toBe("f|t|f");
    expect(q(`select has_schema_privilege('anon','private','USAGE')`)).toBe("f");
  });

  it("stays SECURITY DEFINER, stable and owned by a superuser role", () => {
    const [secdef, volatility, owner] = q(
      `select p.prosecdef, p.provolatile, r.rolname
       from pg_proc p join pg_roles r on r.oid = p.proowner
       where p.oid = ${PROC}`,
    ).split("|");
    // SECURITY INVOKER would cause infinite RLS recursion on user_roles.
    expect(secdef).toBe("t");
    expect(volatility).toBe("s");
    expect(owner).toBe("postgres");
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

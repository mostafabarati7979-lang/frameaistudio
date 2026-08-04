// Integration regression suite: owner-scoped reads on public.orders.
// Two real customers each own an order; with an `authenticated` session the
// Data API must return ONLY the caller's own rows and must not expose (or let
// them mutate) another customer's order — by list, by id, by filter, or by
// count.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const HAS_ENV = !!(SUPABASE_URL && PUBLISHABLE_KEY && SERVICE_ROLE_KEY);
const REQUIRE_DB = process.env.CI_REQUIRE_DB === "1";

if (REQUIRE_DB && !HAS_ENV) {
  throw new Error(
    "CI_REQUIRE_DB=1 but SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_SERVICE_ROLE_KEY are missing.",
  );
}

const TEST_PASSWORD = "Qz7#vLp2*Rt9mE4w";

async function api(
  path: string,
  init: RequestInit & { token?: string; serviceRole?: boolean } = {},
) {
  const { token, serviceRole, ...rest } = init;
  const key = serviceRole ? SERVICE_ROLE_KEY! : PUBLISHABLE_KEY!;
  const headers = new Headers(rest.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${token ?? key}`);
  if (rest.body) headers.set("Content-Type", "application/json");
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...rest, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  return { status: res.status, ok: res.ok, body };
}

type Customer = { email: string; userId: string; token: string; orderId: string };

async function createCustomer(label: string): Promise<Customer> {
  const email = `itest-owner-${label}-${Date.now()}@example.com`;

  const created = await api("/auth/v1/admin/users", {
    method: "POST",
    serviceRole: true,
    body: JSON.stringify({ email, password: TEST_PASSWORD, email_confirm: true }),
  });
  expect(created.status, JSON.stringify(created.body)).toBe(200);

  const signedIn = await api("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  expect(signedIn.status, JSON.stringify(signedIn.body)).toBe(200);
  expect(signedIn.body.user.role).toBe("authenticated");

  return {
    email,
    userId: created.body.id,
    token: signedIn.body.access_token,
    orderId: "",
  };
}

// Seeded with the service role so the fixture doesn't depend on the insert path.
async function seedOrder(customer: Customer, title: string) {
  const code = await api("/rest/v1/rpc/generate_order_code", {
    method: "POST",
    serviceRole: true,
    body: JSON.stringify({}),
  });
  expect(code.status, JSON.stringify(code.body)).toBe(200);

  const res = await api("/rest/v1/orders?select=id", {
    method: "POST",
    serviceRole: true,
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      order_code: code.body,
      customer_id: customer.userId,
      status: "submitted",
      service_type: "wedding-film",
      project_title: title,
      city: "تهران",
    }),
  });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  customer.orderId = res.body[0].id;
}

describe.skipIf(!HAS_ENV)("orders: owner-only reads as authenticated", () => {
  let alice: Customer;
  let bob: Customer;

  beforeAll(async () => {
    alice = await createCustomer("a");
    bob = await createCustomer("b");
    await seedOrder(alice, "سفارش کاربر الف");
    await seedOrder(bob, "سفارش کاربر ب");
  }, 60_000);

  afterAll(async () => {
    for (const c of [alice, bob]) {
      if (c?.orderId) {
        await api(`/rest/v1/orders?id=eq.${c.orderId}`, {
          method: "DELETE",
          serviceRole: true,
        });
      }
      if (c?.userId) {
        await api(`/auth/v1/admin/users/${c.userId}`, {
          method: "DELETE",
          serviceRole: true,
        });
      }
    }
  }, 60_000);

  it("lists only the caller's own orders", async () => {
    const res = await api("/rest/v1/orders?select=id,customer_id,project_title", {
      token: alice.token,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const rows = res.body as { id: string; customer_id: string }[];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.customer_id).toBe(alice.userId);
    expect(rows.some((r) => r.id === alice.orderId)).toBe(true);
    expect(rows.some((r) => r.id === bob.orderId)).toBe(false);
  });

  it("reads its own order by id", async () => {
    const res = await api(
      `/rest/v1/orders?id=eq.${alice.orderId}&select=id,project_title,customer_id`,
      { token: alice.token },
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].project_title).toBe("سفارش کاربر الف");
    expect(res.body[0].customer_id).toBe(alice.userId);
  });

  it("returns nothing for another customer's order by id", async () => {
    const res = await api(`/rest/v1/orders?id=eq.${bob.orderId}&select=id`, {
      token: alice.token,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("cannot bypass ownership by filtering on customer_id", async () => {
    const res = await api(
      `/rest/v1/orders?customer_id=eq.${bob.userId}&select=id,customer_id`,
      { token: alice.token },
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("counts only the caller's own rows", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=id`, {
      headers: {
        apikey: PUBLISHABLE_KEY!,
        Authorization: `Bearer ${alice.token}`,
        Prefer: "count=exact",
        Range: "0-0",
      },
    });
    expect(res.status).toBeLessThan(300);
    const range = res.headers.get("content-range") ?? "";
    const total = Number(range.split("/")[1]);
    const own = await api("/rest/v1/orders?select=id", { token: alice.token });
    expect(total).toBe((own.body as unknown[]).length);
  });

  it("cannot update or delete another customer's order", async () => {
    const patched = await api(`/rest/v1/orders?id=eq.${bob.orderId}&select=id`, {
      method: "PATCH",
      token: alice.token,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ project_title: "hijacked" }),
    });
    expect([200, 403, 404]).toContain(patched.status);
    if (patched.status === 200) expect(patched.body).toEqual([]);

    const deleted = await api(`/rest/v1/orders?id=eq.${bob.orderId}&select=id`, {
      method: "DELETE",
      token: alice.token,
      headers: { Prefer: "return=representation" },
    });
    if (deleted.status === 200) expect(deleted.body).toEqual([]);

    // Bob's row is untouched, verified with the service role.
    const check = await api(
      `/rest/v1/orders?id=eq.${bob.orderId}&select=id,project_title`,
      { serviceRole: true },
    );
    expect(check.body).toHaveLength(1);
    expect(check.body[0].project_title).toBe("سفارش کاربر ب");
  });

  it("still sees its own order after the failed cross-tenant attempts", async () => {
    const res = await api(`/rest/v1/orders?id=eq.${alice.orderId}&select=id`, {
      token: alice.token,
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

// Integration regression suite: covers order intake end-to-end at the data
// layer — a user-shaped request payload is validated with the same Zod schema
// the order wizard uses, then inserted into public.orders over the Data API
// with a real `authenticated` session (RLS + GRANTs + has_role policies all
// evaluated). This is the path that broke with
// "ثبت سفارش ناموفق بود." / "permission denied for function has_role".
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { orderDraftSchema, submitOrderSchema } from "@/lib/orders-schema";

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

// Same shape the order wizard submits (no pricing fields anywhere).
const rawUserRequest = {
  service_type: "wedding-film",
  project_title: "تست انتگرال ثبت سفارش",
  city: "تهران",
  event_date: "2026-09-01",
  team_hours: 6,
  shooting_days: 1,
  cameras_count: 2,
  quality: "4k",
  orientation: "horizontal",
  // Optional fields left blank by the user must become NULL, not "".
  address: "",
  style: "",
  customer_notes: "",
  budget_note: "",
  needs_lighting: true,
  needs_audio: false,
};

describe.skipIf(!HAS_ENV)("order intake: request → insert as authenticated", () => {
  let userId = "";
  let token = "";
  let orderId = "";

  beforeAll(async () => {
    const email = `itest-order-${Date.now()}@example.com`;

    // Confirmed user via Auth Admin API (signup alone leaves it unconfirmed).
    const created = await api("/auth/v1/admin/users", {
      method: "POST",
      serviceRole: true,
      body: JSON.stringify({
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
      }),
    });
    expect(created.status, JSON.stringify(created.body)).toBe(200);
    userId = created.body.id;

    const signedIn = await api("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password: TEST_PASSWORD }),
    });
    expect(signedIn.status, JSON.stringify(signedIn.body)).toBe(200);
    token = signedIn.body.access_token;
    expect(signedIn.body.user.role).toBe("authenticated");
  }, 30_000);

  afterAll(async () => {
    if (orderId) {
      await api(`/rest/v1/orders?id=eq.${orderId}`, {
        method: "DELETE",
        serviceRole: true,
      });
    }
    if (userId) {
      await api(`/auth/v1/admin/users/${userId}`, {
        method: "DELETE",
        serviceRole: true,
      });
    }
  }, 30_000);

  it("validates the user request with the wizard schema", () => {
    const parsed = orderDraftSchema.parse(rawUserRequest);
    expect(parsed.project_title).toBe(rawUserRequest.project_title);
    expect(parsed.address).toBeNull();
    expect(parsed.style).toBeNull();
  });

  it("keeps generate_order_code off-limits to the authenticated role", async () => {
    // The server function mints the code with the service role; direct API
    // access from a customer session must stay denied.
    const res = await api("/rest/v1/rpc/generate_order_code", {
      method: "POST",
      token,
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(403);
  });

  it("inserts the order into public.orders and returns the row", async () => {
    const draft = orderDraftSchema.parse(rawUserRequest);

    // Mirrors createOrderDraft: code minted server-side, row inserted with the
    // customer's own session so RLS is the thing being exercised.
    const code = await api("/rest/v1/rpc/generate_order_code", {
      method: "POST",
      serviceRole: true,
      body: JSON.stringify({}),
    });
    expect(code.status, JSON.stringify(code.body)).toBe(200);
    expect(String(code.body)).toMatch(/^FA-[A-Z0-9]{6}$/);


    // .select() on insert forces SELECT policies (incl. the admin policy that
    // calls has_role) to be evaluated for the authenticated role.
    const res = await api("/rest/v1/orders?select=id,order_code,status,customer_id", {
      method: "POST",
      token,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        ...draft,
        order_code: code.body,
        customer_id: userId,
        status: "draft",
      }),
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const row = res.body[0];
    orderId = row.id;
    expect(row.customer_id).toBe(userId);
    expect(row.status).toBe("draft");
  });

  it("reads the inserted order back through owner RLS", async () => {
    const res = await api(
      `/rest/v1/orders?id=eq.${orderId}&select=id,project_title,address,style,city`,
      { token },
    );
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].project_title).toBe(rawUserRequest.project_title);
    expect(res.body[0].address).toBeNull();
    expect(res.body[0].city).toBe("تهران");
  });

  it("finalizes the order (draft → submitted) with consents", async () => {
    const payload = submitOrderSchema.parse({
      order_id: orderId,
      consent_terms: true,
      consent_file_ownership: true,
      consent_ai_use: true,
      consent_publish_portfolio: false,
      consent_face_voice_simulation: false,
    });

    const res = await api(`/rest/v1/orders?id=eq.${payload.order_id}&select=id,status`, {
      method: "PATCH",
      token,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        consent_terms: true,
        consent_file_ownership: true,
        consent_ai_use: payload.consent_ai_use,
        consent_publish_portfolio: payload.consent_publish_portfolio,
        consent_face_voice_simulation: payload.consent_face_voice_simulation,
      }),
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body[0].status).toBe("submitted");
  });

  it("does not leak other customers' orders to this user", async () => {
    const mine = await api("/rest/v1/orders?select=customer_id", { token });
    expect(mine.status).toBe(200);
    for (const r of mine.body as { customer_id: string }[]) {
      expect(r.customer_id).toBe(userId);
    }
  });
});

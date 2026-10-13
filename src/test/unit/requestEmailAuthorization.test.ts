import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/lourex-request-email";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  })),
}));

const requestId = "123e4567-e89b-42d3-a456-426614174000";
const savedRequest = {
  id: requestId,
  request_number: "PR-104",
  status: "intake_submitted",
  created_at: new Date().toISOString(),
  full_name: "Verified customer",
  email: "verified@example.com",
  phone: "123",
  country: "Türkiye",
  city: "Istanbul",
  product_name: "Saved goods",
  product_description: "Saved description",
  quantity: 12,
  destination: "Homs",
  preferred_shipping_method: "Sea",
  technical_specs: "Valid specification",
  delivery_notes: "Stored notes",
  image_urls: ["path-1"],
};

const invoke = async (body: unknown, authorization?: string) => {
  let status = 0;
  let response: unknown;
  const res = {
    setHeader: vi.fn(),
    status: (code: number) => ({
      json: (payload: unknown) => { status = code; response = payload; },
      end: () => { status = code; },
    }),
  };
  await handler({
    method: "POST",
    headers: { origin: "https://www.lou-rex.com", authorization },
    body,
  }, res);
  return { status, response };
};

describe("purchase-request notification API authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_SUPABASE_URL = "https://gxmqchznfolerliorpkz.supabase.co";
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
    process.env.RESEND_API_KEY = "test-provider-key";
    process.env.LOUREX_REQUEST_NOTIFY_TO = "operations@example.com";
    process.env.LOUREX_EMAIL_FROM = "LOUREX <notifications@example.com>";
    mocks.getUser.mockResolvedValue({ data: { user: { id: "trusted-user" } }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: { ...savedRequest, created_at: new Date().toISOString() }, error: null });
    mocks.from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refuses anonymous email requests before sending", async () => {
    const result = await invoke({ requestId });
    expect(result.status).toBe(401);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects invalid request IDs before making backend calls", async () => {
    const result = await invoke({ requestId: "not-a-uuid" }, "Bearer jwt-token");
    expect(result.status).toBe(400);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("does not send for requests not visible through authenticated RLS", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await invoke({ requestId }, "Bearer jwt-token");
    expect(result.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not re-notify approved or old requests", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { ...savedRequest, status: "approved" }, error: null });
    expect((await invoke({ requestId }, "Bearer jwt-token")).status).toBe(409);
    mocks.maybeSingle.mockResolvedValueOnce({ data: { ...savedRequest, created_at: "2024-01-01T00:00:00Z" }, error: null });
    expect((await invoke({ requestId }, "Bearer jwt-token")).status).toBe(409);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses only canonical database fields and an idempotency key", async () => {
    const result = await invoke({
      requestId,
      customerName: "FORGED NAME",
      dashboardUrl: "https://example.org/forged",
      productName: "FORGED PRODUCT",
    }, "Bearer jwt-token");
    expect(result.status).toBe(200);
    expect(mocks.getUser).toHaveBeenCalledWith("jwt-token");
    expect(mocks.from).toHaveBeenCalledWith("purchase_requests");
    const [url, opts] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((opts.headers as Record<string, string>)["Idempotency-Key"]).toBe(`lourex-request-created/${requestId}`);
    const emailBody = String(opts.body);
    expect(emailBody).toContain("Verified customer");
    expect(emailBody).toContain("Saved goods");
    expect(emailBody).not.toContain("FORGED");
    expect(emailBody).not.toContain("example.org/forged");
  });

  it("does not report delivery success when the provider refuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    const result = await invoke({ requestId }, "Bearer jwt-token");
    expect(result.status).toBe(502);
  });
});

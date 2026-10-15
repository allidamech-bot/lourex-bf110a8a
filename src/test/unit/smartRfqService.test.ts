import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  SMART_RFQ_KEY,
  clearSmartRfqDraft,
  fetchSmartRfqItems,
  readSmartRfqBrief,
  readSmartRfqDraft,
  resetSmartRfqSubmissionId,
  saveSmartRfqBrief,
  saveSmartRfqDraft,
  submitSmartRfq,
  type SmartRfqDraftItem,
} from "@/features/smart-rfq/smartRfqService";
import { supabase } from "@/integrations/supabase/client";
import { runAutomation } from "@/lib/automationEngine";
import { uploadPurchaseRequestImages, updateRequestWithImages } from "@/domain/operations/service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));
vi.mock("@/domain/operations/service", () => ({
  uploadPurchaseRequestImages: vi.fn(),
  updateRequestWithImages: vi.fn(),
}));
vi.mock("@/lib/automationEngine", () => ({ runAutomation: vi.fn() }));
vi.mock("@/lib/monitoring", () => ({ logOperationalError: vi.fn() }));

const requestId = "a3263f14-f4a1-4a77-bfff-2d54a4c651a9";
const draft: SmartRfqDraftItem[] = [
  { key: "catalog", catalogProductId: "1a2b3c4d-1234-4123-8123-123456789abc", productName: "Published product", quantity: "120", unit: "cartons", specifications: "MOQ applies" },
  { key: "custom", catalogProductId: null, productName: "Custom biscuits", quantity: "250", unit: "boxes", specifications: "Private label" },
];
const customer = { id: "b3263f14-f4a1-4a77-bfff-2d54a4c651a9", name: "A Customer" };

const succeeded = { data: [{ request_id: requestId, request_number: "RFQ-2026-ABCD", tracking_code: "TRX-2026-123" }], error: null };
const submit = () => submitSmartRfq(draft, "Jeddah, Saudi Arabia", "sea", "CIF Jeddah", "Port warehouse", customer);
const rpc = vi.mocked(supabase.rpc);
const notify = vi.mocked(runAutomation);

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  vi.stubGlobal("crypto", { randomUUID: () => requestId });
  rpc.mockResolvedValue(succeeded as never);
  notify.mockResolvedValue({ event: "purchase_request.created", matchedRules: [], actions: [] });
});
afterEach(() => vi.unstubAllGlobals());

describe("Smart RFQ customer adapter: persistence, validation, and safe delivery", () => {
  it("persists a multi-product basket and delivery terms independently of auth", () => {
    saveSmartRfqDraft(draft);
    saveSmartRfqBrief({ destination: "Jeddah", shippingMethod: "sea", deliveryNotes: "CIF", deliveryAddress: "" });
    expect(readSmartRfqDraft()).toEqual(draft);
    expect(readSmartRfqBrief().destination).toBe("Jeddah");
    expect(window.localStorage.getItem(SMART_RFQ_KEY)).toContain("Custom biscuits");
    clearSmartRfqDraft(customer.id);
    expect(readSmartRfqDraft()).toEqual([]);
    expect(readSmartRfqBrief().destination).toBe("");
  });

  it("rejects invalid quantities before any network request", async () => {
    for (const bad of ["0", "-1", "1.5", "not-a-number", "100000001"]) {
      await expect(submitSmartRfq([{ ...draft[1], quantity: bad }], "Jeddah", "", "", "", customer)).rejects.toThrow();
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends normalized catalog/custom lines with a stable per-user submission UUID", async () => {
    const result = await submit();
    expect(result).toMatchObject({ requestId, requestNumber: "RFQ-2026-ABCD" });
    const args = rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(args.p_client_submission_id).toBe(requestId);
    expect(args.p_items).toEqual([
      { catalog_product_id: draft[0].catalogProductId, product_name: null, quantity: 120, unit: "cartons", specifications: "MOQ applies" },
      { catalog_product_id: null, product_name: "Custom biscuits", quantity: 250, unit: "boxes", specifications: "Private label" },
    ]);
    expect(notify).toHaveBeenCalledWith("purchase_request.created", expect.objectContaining({ requestId, userId: customer.id }));
    await submit();
    expect((rpc.mock.calls[1][1] as Record<string, unknown>).p_client_submission_id).toBe(requestId);
  });

  it("uses the same receipt after an uncertain network failure, without premature notification", async () => {
    rpc.mockRejectedValueOnce(new Error("Network failed after possible commit"));
    await expect(submit()).rejects.toThrow("Network failed");
    expect(notify).not.toHaveBeenCalled();
    await submit();
    const first = rpc.mock.calls[0][1] as Record<string, unknown>;
    const second = rpc.mock.calls[1][1] as Record<string, unknown>;
    expect(first.p_client_submission_id).toBe(second.p_client_submission_id);
    resetSmartRfqSubmissionId(customer.id);
    expect(window.localStorage.getItem("lourex:smart-rfq:submission-id:v1:" + customer.id)).toBeNull();
  });

  it("never reports the commercial request as failed when an optional attachment fails", async () => {
    vi.mocked(uploadPurchaseRequestImages).mockResolvedValueOnce({ data: null, error: { message: "Upload rejected" } } as never);
    const file = new File(["mock"], "invoice.png", { type: "image/png" });
    const response = await submitSmartRfq(draft, "Jeddah", "sea", "", "", customer, [file]);
    expect(response.requestId).toBe(requestId);
    expect(response.attachmentWarning).toMatch(/saved/);
    expect(notify).toHaveBeenCalled();
    expect(updatePurchaseRequestWithAttachmentsSent()).toBe(false);
  });

  it("confirms email independently of a committed RFQ and surfaces transport failures", async () => {
    notify.mockResolvedValueOnce({
      event: "purchase_request.created", matchedRules: ["notification"], actions: [
        { action: "send_purchase_request_email", status: "sent" },
      ],
    });
    const sent = await submit();
    expect(sent.notificationWarning).toBeUndefined();
    notify.mockResolvedValueOnce({
      event: "purchase_request.created", matchedRules: ["notification"], actions: [
        { action: "send_purchase_request_email", status: "skipped", reason: "Provider unavailable" },
      ],
    });
    const savedWithoutEmail = await submit();
    expect(savedWithoutEmail.requestId).toBe(requestId);
    expect(savedWithoutEmail.notificationWarning).toMatch(/email notification could not be confirmed/);
  });

  it("updates saved request images through the existing protected operations path", async () => {
    vi.mocked(uploadPurchaseRequestImages).mockResolvedValueOnce({ data: ["https://example.test/product.png"], error: null } as never);
    vi.mocked(updateRequestWithImages).mockResolvedValueOnce({ data: { id: requestId }, error: null } as never);
    const picture = new File(["sample"], "product.png", { type: "image/png" });
    const saved = await submitSmartRfq(draft, "Jeddah", "sea", "", "", customer, [picture]);
    expect(uploadPurchaseRequestImages).toHaveBeenCalledWith(requestId, [expect.objectContaining({ file: picture })]);
    expect(updateRequestWithImages).toHaveBeenCalledWith(requestId, ["https://example.test/product.png"]);
    expect(saved.attachmentWarning).toBeUndefined();
  });

  it("only reads line items through the authorised request-id query", async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: requestId, product_name: "Oil", quantity: 100, unit: "cartons", specifications: "Premium", moq_snapshot: "50 cartons" }], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    vi.mocked(supabase.from).mockReturnValue({ select } as never);
    const lines = await fetchSmartRfqItems(requestId);
    expect(eq).toHaveBeenCalledWith("request_id", requestId);
    expect(lines[0]).toMatchObject({ productName: "Oil", quantity: 100, moqSnapshot: "50 cartons" });
    expect(await fetchSmartRfqItems("not-a-uuid")).toEqual([]);
  });
});

function updatePurchaseRequestWithAttachmentsSent() {
  return vi.mocked(updateRequestWithImages).mock.calls.length > 0;
}

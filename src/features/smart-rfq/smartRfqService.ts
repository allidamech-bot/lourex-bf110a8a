import { supabase } from "@/integrations/supabase/client";
import { runAutomation } from "@/lib/automationEngine";
import { uploadPurchaseRequestImages, updateRequestWithImages } from "@/domain/operations/service";
import { logOperationalError } from "@/lib/monitoring";

export const SMART_RFQ_KEY = "lourex:smart-rfq:catalog-ids:v1";
export const MAX_SMART_RFQ_ITEMS = 20;
export const RFQ_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SmartRfqDraftItem = {
  key: string;
  catalogProductId: string | null;
  productName: string;
  quantity: string;
  unit: string;
  specifications: string;
};

export type SmartRfqStoredItem = {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  specifications: string;
  moqSnapshot: string;
  packagingSnapshot: string;
  originSnapshot: string;
  imageUrlSnapshot: string;
  productSlug: string;
};

export type SmartRfqSubmission = {
  requestId: string;
  requestNumber: string;
  trackingCode: string;
  attachmentWarning?: string;
};

const rpcClient = supabase as unknown as {
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{
    data: Array<{ request_id: string; request_number: string; tracking_code: string }> | null;
    error: { message: string } | null;
  }>;
};
const tableClient = supabase as unknown as {
  from: (name: string) => {
    select: (fields: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => PromiseLike<{
          data: Record<string, unknown>[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export const readSmartRfqDraft = (): SmartRfqDraftItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(SMART_RFQ_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is SmartRfqDraftItem =>
      Boolean(item && typeof item === "object" &&
        typeof item.key === "string" &&
        (item.catalogProductId === null || (typeof item.catalogProductId === "string" && RFQ_UUID.test(item.catalogProductId))) &&
        typeof item.productName === "string" &&
        typeof item.quantity === "string" &&
        typeof item.unit === "string" &&
        typeof item.specifications === "string"),
    ).slice(0, MAX_SMART_RFQ_ITEMS);
  } catch {
    return [];
  }
};

export const saveSmartRfqDraft = (items: SmartRfqDraftItem[]): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SMART_RFQ_KEY, JSON.stringify(items.slice(0, MAX_SMART_RFQ_ITEMS)));
  } catch {
    // Private browsing and full-storage cases should never block an RFQ.
  }
};

export const clearSmartRfqDraft = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SMART_RFQ_KEY);
  } catch {
    // The server-side request has already committed successfully.
  }
};

export const submitSmartRfq = async (
  items: SmartRfqDraftItem[],
  destination: string,
  shippingMethod: string,
  deliveryNotes: string,
  deliveryAddress: string,
  customer: { id: string; name: string },
  attachments: File[] = [],
): Promise<SmartRfqSubmission> => {
  if (items.length < 1 || items.length > MAX_SMART_RFQ_ITEMS) {
    throw new Error("Choose between 1 and 20 products.");
  }
  const normalized = items.map((item) => {
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000000) {
      throw new Error("Each product requires a valid positive whole-number quantity.");
    }
    if (item.catalogProductId && !RFQ_UUID.test(item.catalogProductId)) {
      throw new Error("Invalid catalog product.");
    }
    if (!item.catalogProductId && (item.productName.trim().length < 2 || item.productName.trim().length > 240)) {
      throw new Error("Enter a name for each custom product.");
    }
    if (item.specifications.length > 2000 || item.unit.length > 80) {
      throw new Error("Product details are too long.");
    }
    return {
      catalog_product_id: item.catalogProductId,
      product_name: item.catalogProductId ? null : item.productName.trim(),
      quantity,
      unit: item.unit.trim(),
      specifications: item.specifications.trim(),
    };
  });
  if (!destination.trim()) throw new Error("Delivery destination is required.");
  const { data, error } = await rpcClient.rpc("submit_smart_rfq", {
    p_items: normalized,
    p_destination: destination.trim(),
    p_shipping_method: shippingMethod.trim(),
    p_delivery_notes: deliveryNotes.trim(),
    p_delivery_address: deliveryAddress.trim(),
  });
  if (error) throw new Error(error.message);
  const result = data?.[0];
  if (!result?.request_id || !result.request_number) {
    throw new Error("RFQ confirmation was not returned by the server.");
  }

  // Files are optional and stored through the existing guarded request-image path.
  // Since the commercial request has committed, failures must NOT prompt a duplicate RFQ.
  let attachmentWarning: string | undefined;
  if (attachments.length > 0) {
    try {
      const upload = await uploadPurchaseRequestImages(result.request_id, attachments.map((file, index) => ({
        id: String(index), file, name: file.name, previewUrl: "", sizeLabel: String(file.size),
      })));
      if (upload.error || !upload.data) throw new Error(upload.error?.message || "Image upload failed");
      const update = await updateRequestWithImages(result.request_id, upload.data);
      if (update.error || !update.data) throw new Error(update.error?.message || "Image attachment update failed");
    } catch (attachmentError) {
      attachmentWarning = "Your RFQ was saved, but some reference images could not be attached. Contact LOUREX with your request number.";
      logOperationalError("smart_rfq_attachment", attachmentError, { requestId: result.request_id });
    }
  }

  // Fire only AFTER the atomic database transaction succeeds.
  // Notification failures must never cause a duplicate commercial request.
  try {
    await runAutomation("purchase_request.created", {
      requestId: result.request_id,
      requestNumber: result.request_number,
      userId: customer.id,
      customerName: customer.name,
      productName: items.length > 1 ? "Multi-product RFQ (" + items.length + " items)" : items[0].productName,
      summary: "A sourcing request with " + items.length + " product lines was submitted.",
    });
  } catch (notificationError) {
    logOperationalError("smart_rfq_notification", notificationError, { requestId: result.request_id });
  }
  return {
    requestId: result.request_id,
    requestNumber: result.request_number,
    trackingCode: result.tracking_code,
    attachmentWarning,
  };
};

export const fetchSmartRfqItems = async (requestId: string): Promise<SmartRfqStoredItem[]> => {
  if (!RFQ_UUID.test(requestId)) return [];
  const { data, error } = await tableClient
    .from("purchase_request_items")
    .select("id, product_name, quantity, unit, specifications, moq_snapshot, packaging_snapshot, origin_snapshot, image_url_snapshot, product_slug")
    .eq("request_id", requestId)
    .order("line_number", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: String(row.id),
    productName: String(row.product_name || ""),
    quantity: Number(row.quantity),
    unit: String(row.unit || ""),
    specifications: String(row.specifications || ""),
    moqSnapshot: String(row.moq_snapshot || ""),
    packagingSnapshot: String(row.packaging_snapshot || ""),
    originSnapshot: String(row.origin_snapshot || ""),
    imageUrlSnapshot: String(row.image_url_snapshot || ""),
    productSlug: String(row.product_slug || ""),
  }));
};

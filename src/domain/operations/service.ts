import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { loadFinancialEntries, loadFinancialEditRequests } from "@/domain/accounting/service";
import {
  createPurchaseRequestRecord,
  loadCustomerDashboards,
  loadDeals,
  loadOperationalUsers,
  loadPurchaseRequests,
  loadShipments,
  updateDealOperation,
  updatePurchaseRequestImages,
  uploadTransferProof as dbUploadTransferProof,
  acceptTransferProof as dbAcceptTransferProof,
  rejectTransferProof as dbRejectTransferProof,
} from "@/lib/operationsDomain";
import type {
  AuditPreviewRow,
  CreateRequestInput,
  DomainJsonObject,
  DomainResult,
  OperationsCustomer,
  OperationsDeal,
  OperationsFinancialEditRequest,
  OperationsFinancialEntry,
  OperationsRequest,
  OperationsShipment,
  OperationsUser,
  PurchaseRequestImageUpload,
  UpdateDealStatusInput,
} from "@/domain/operations/types";
import {
  createDomainError,
  failure,
  isValidEmail,
  normalizeNumber,
  normalizeOptionalText,
  normalizeText,
  success,
} from "@/domain/shared/utils";
import { logOperationalError } from "@/lib/monitoring";
import {
  STORAGE_PATHS,
  uploadFile,
} from "@/lib/storage";

const MAX_PURCHASE_REQUEST_IMAGES = 5;

type UpdatePurchaseRequestInput = Omit<CreateRequestInput, "requestNumber" | "trackingCode" | "imageUrls">;

const REQUEST_STATUSES_ALLOWED_TO_CANCEL = new Set([
  "intake_submitted",
  "awaiting_clarification",
]);

const asDomainJsonObject = (value: Json | null | undefined): DomainJsonObject | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as DomainJsonObject;
};

const normalizeRequest = (request: OperationsRequest): OperationsRequest => ({
  ...request,
  customer: {
    ...request.customer,
    fullName: normalizeText(request.customer.fullName),
    phone: normalizeText(request.customer.phone),
    email: normalizeText(request.customer.email),
    country: normalizeText(request.customer.country),
    city: normalizeText(request.customer.city),
  },
  productName: normalizeText(request.productName),
  productDescription: normalizeText(request.productDescription),
  quantity: normalizeNumber(request.quantity),
  sizeDimensions: normalizeText(request.sizeDimensions),
  color: normalizeText(request.color),
  material: normalizeText(request.material),
  technicalSpecs: normalizeText(request.technicalSpecs),
  referenceLink: normalizeText(request.referenceLink),
  preferredShippingMethod: normalizeText(request.preferredShippingMethod),
  deliveryNotes: normalizeText(request.deliveryNotes),
  statusLabel: normalizeText(request.statusLabel),
  internalNotes: normalizeText(request.internalNotes),
  weight: normalizeText(request.weight),
  manufacturingCountry: normalizeText(request.manufacturingCountry),
  brand: normalizeText(request.brand),
  qualityLevel: normalizeText(request.qualityLevel),
  expectedSupplyDate: normalizeText(request.expectedSupplyDate),
  destination: normalizeText(request.destination),
  deliveryAddress: normalizeText(request.deliveryAddress),
  trackingCode: normalizeText(request.trackingCode),
  transferProofUrl: normalizeOptionalText(request.transferProofUrl),
  transferProofName: normalizeOptionalText(request.transferProofName),
  transferProofUploadedAt: normalizeOptionalText(request.transferProofUploadedAt),
  transferProofStatus: request.transferProofStatus,
  transferAcceptedAt: normalizeOptionalText(request.transferAcceptedAt),
  transferAcceptedBy: normalizeOptionalText(request.transferAcceptedBy),
  transferRejectionReason: normalizeOptionalText(request.transferRejectionReason),
});

const normalizeDeal = (deal: OperationsDeal): OperationsDeal => ({
  ...deal,
  dealNumber: normalizeText(deal.dealNumber),
  operationTitle: normalizeText(deal.operationTitle),
  customerName: normalizeText(deal.customerName),
  customerEmail: normalizeOptionalText(deal.customerEmail) ?? undefined,
  customerPhone: normalizeOptionalText(deal.customerPhone) ?? undefined,
  requestNumber: normalizeOptionalText(deal.requestNumber) ?? undefined,
  trackingId: normalizeOptionalText(deal.trackingId) ?? undefined,
  accountingReference: normalizeOptionalText(deal.accountingReference) ?? undefined,
  originCountry: normalizeOptionalText(deal.originCountry),
  destinationCountry: normalizeOptionalText(deal.destinationCountry),
  totalValue: normalizeNumber(deal.totalValue),
  currency: normalizeText(deal.currency) || "SAR",
  notes: normalizeText(deal.notes),
});

const normalizeCustomer = (customer: OperationsCustomer): OperationsCustomer => ({
  ...customer,
  fullName: normalizeText(customer.fullName),
  phone: normalizeText(customer.phone),
  email: normalizeText(customer.email),
  country: normalizeText(customer.country),
  city: normalizeText(customer.city),
  financialBalance: normalizeNumber(customer.financialBalance),
});

const normalizeEntry = (entry: OperationsFinancialEntry): OperationsFinancialEntry => ({
  ...entry,
  amount: normalizeNumber(entry.amount),
  currency: normalizeText(entry.currency) || "SAR",
  note: normalizeText(entry.note),
  method: normalizeText(entry.method),
  counterparty: normalizeText(entry.counterparty),
  category: normalizeText(entry.category),
  referenceLabel: normalizeText(entry.referenceLabel),
});

const normalizeImageFiles = (files: File[]) =>
    files.filter((file) => file.type.startsWith("image/")).slice(0, MAX_PURCHASE_REQUEST_IMAGES);

const getPurchaseRequestById = async (id: string): Promise<OperationsRequest | null> => {
  const requests = await fetchRequests();
  return requests.find((r) => r.id === id) || null;
};

/**
 * Internal helper to handle rollback of purchase requests that failed during
 * the submission process (e.g. image upload failure).
 */
const rollbackIncompleteRequest = async (requestId: string): Promise<void> => {
  const normalizedId = normalizeText(requestId);
  if (!normalizedId) return;

  try {
    const rpcClient = supabase as unknown as {
      rpc: (
        fn: "cancel_purchase_request",
        args: { p_request_id: string; p_reason?: string | null },
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { error } = await rpcClient.rpc("cancel_purchase_request", {
      p_request_id: normalizedId,
      p_reason: "System Rollback: Creation failed during image upload.",
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    logOperationalError("purchase_request_rollback", error, { requestId: normalizedId });
  }
};

// Removed updatePurchaseRequestAsCancelled and related private helpers
// in favor of the cancel_purchase_request RPC.

export const fetchCustomers = async (): Promise<OperationsCustomer[]> => {
  const customers = await loadCustomerDashboards();
  return customers.map(normalizeCustomer);
};

export const fetchCustomerDashboard = async (): Promise<OperationsCustomer | null> => {
  const customers = await loadCustomerDashboards();
  const customer = customers[0] ?? null;
  return customer ? normalizeCustomer(customer) : null;
};

export const fetchRequests = async (): Promise<OperationsRequest[]> => {
  const requests = await loadPurchaseRequests();
  return requests.map(normalizeRequest);
};

export const fetchDeals = async (): Promise<OperationsDeal[]> => {
  const deals = await loadDeals();
  return deals.map(normalizeDeal);
};

export const fetchFinancialEntries = async (): Promise<OperationsFinancialEntry[]> => {
  const entries = await loadFinancialEntries();
  return entries.map(normalizeEntry);
};

export const fetchFinancialEditRequests = async (): Promise<OperationsFinancialEditRequest[]> => {
  return loadFinancialEditRequests();
};

export const fetchShipments = async (): Promise<OperationsShipment[]> => loadShipments();

export const fetchOperationalUsers = async (): Promise<OperationsUser[]> => loadOperationalUsers();

export const fetchAuditCount = async (): Promise<number> => {
  const { count, error } = await supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
};

export const fetchAuditPreviewRows = async (limit = 120): Promise<AuditPreviewRow[]> => {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 250) : 120;

  const { data, error } = await supabase
      .from("audit_logs")
      .select("id, action, created_at, new_values")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    action: normalizeText(row.action),
    createdAt: row.created_at,
    newValues: asDomainJsonObject(row.new_values),
  }));
};

export const uploadPurchaseRequestImages = async (
    requestId: string,
    uploads: PurchaseRequestImageUpload[],
): Promise<DomainResult<string[]>> => {
  const normalizedId = normalizeText(requestId);

  if (!normalizedId) {
    return failure("A valid ID is required before uploading images.");
  }

  const files = normalizeImageFiles(uploads.map((upload) => upload.file));

  if (files.length === 0) {
    return failure("At least one valid product image is required.");
  }

  try {
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const filePath = `${STORAGE_PATHS.PURCHASE_REQUESTS(normalizedId)}/${Date.now()}-${file.name}`;
      const publicUrl = await uploadFile("PRODUCT_IMAGES", filePath, file);
      uploadedUrls.push(publicUrl);
    }

    return success(uploadedUrls);
  } catch (error) {
    logOperationalError("purchase_request_image_upload", error, {
      requestId: normalizedId,
    });

    return {
      data: null,
      error: createDomainError(error, "Unable to upload the purchase request images."),
    };
  }
};

export const createRequest = async (
    input: CreateRequestInput,
): Promise<DomainResult<OperationsRequest>> => {
  const normalizedInput: CreateRequestInput = {
    ...input,
    requestNumber: normalizeText(input.requestNumber),
    fullName: normalizeText(input.fullName),
    phone: normalizeText(input.phone),
    email: normalizeText(input.email).toLowerCase(),
    country: normalizeText(input.country),
    city: normalizeText(input.city),
    productName: normalizeText(input.productName),
    productDescription: normalizeText(input.productDescription),
    quantity: normalizeNumber(input.quantity),
    sizeDimensions: normalizeText(input.sizeDimensions),
    color: normalizeText(input.color),
    material: normalizeText(input.material),
    technicalSpecs: normalizeText(input.technicalSpecs),
    referenceLink: normalizeText(input.referenceLink),
    preferredShippingMethod: normalizeText(input.preferredShippingMethod),
    deliveryNotes: normalizeText(input.deliveryNotes),
    imageUrls: input.imageUrls.filter((url) => normalizeText(url).length > 0),
    weight: normalizeText(input.weight),
    manufacturingCountry: normalizeText(input.manufacturingCountry),
    brand: normalizeText(input.brand),
    qualityLevel: normalizeText(input.qualityLevel),
    isReadyMade: Boolean(input.isReadyMade),
    hasPreviousSample: Boolean(input.hasPreviousSample),
    expectedSupplyDate: normalizeText(input.expectedSupplyDate),
    destination: normalizeText(input.destination),
    deliveryAddress: normalizeText(input.deliveryAddress),
    isFullSourcing: Boolean(input.isFullSourcing),
    trackingCode: normalizeText(input.trackingCode),
  } satisfies CreateRequestInput;

  if (!normalizedInput.requestNumber) {
    return failure("A purchase request reference is required.");
  }

  if (!normalizedInput.fullName || !normalizedInput.productName || !normalizedInput.productDescription) {
    return failure("The purchase request is missing required contact or product information.");
  }

  if (!isValidEmail(normalizedInput.email)) {
    return failure("A valid email address is required.");
  }

  if (!Number.isFinite(normalizedInput.quantity) || normalizedInput.quantity <= 0) {
    return failure("The purchase request quantity must be greater than zero.");
  }

  try {
    const { data, error } = await createPurchaseRequestRecord(normalizedInput);

    if (error || !data) {
      return {
        data: null,
        error: createDomainError(error, "Unable to create the purchase request."),
      };
    }

    const createdRequest = await getPurchaseRequestById(data.id);

    if (createdRequest) {
      return success(normalizeRequest(createdRequest));
    }

    return success({
      id: data.id,
      requestNumber: normalizedInput.requestNumber,
      status: "intake_submitted",
      statusLabel: "تم الاستلام",
      customer: {
        id: data.id,
        fullName: normalizedInput.fullName,
        phone: normalizedInput.phone,
        email: normalizedInput.email,
        country: normalizedInput.country,
        city: normalizedInput.city,
      },
      productName: normalizedInput.productName,
      productDescription: normalizedInput.productDescription,
      quantity: normalizedInput.quantity,
      sizeDimensions: normalizedInput.sizeDimensions,
      color: normalizedInput.color,
      material: normalizedInput.material,
      technicalSpecs: normalizedInput.technicalSpecs,
      referenceLink: normalizedInput.referenceLink,
      preferredShippingMethod: normalizedInput.preferredShippingMethod,
      deliveryNotes: normalizedInput.deliveryNotes,
      imageUrls: [],
      createdAt: new Date().toISOString(),
      weight: normalizedInput.weight,
      manufacturingCountry: normalizedInput.manufacturingCountry,
      brand: normalizedInput.brand,
      qualityLevel: normalizedInput.qualityLevel,
      isReadyMade: normalizedInput.isReadyMade,
      hasPreviousSample: normalizedInput.hasPreviousSample,
      expectedSupplyDate: normalizedInput.expectedSupplyDate,
      destination: normalizedInput.destination,
      deliveryAddress: normalizedInput.deliveryAddress,
      isFullSourcing: normalizedInput.isFullSourcing,
      trackingCode: normalizedInput.trackingCode,
      sourceInquiryId: null,
      convertedDealId: null,
      convertedDealNumber: null,
      isLegacyFallback: false,
      internalNotes: "",
      reviewedAt: null,
      attachments: [],
    });
  } catch (error) {
    logOperationalError("purchase_request_create", error, {
      requestNumber: normalizedInput.requestNumber,
    });

    return {
      data: null,
      error: createDomainError(error, "Unable to create the purchase request."),
    };
  }
};

export const createPurchaseRequestWithAttachments = async (
    input: CreateRequestInput,
    uploads: PurchaseRequestImageUpload[],
): Promise<DomainResult<OperationsRequest>> => {
  const creationResult = await createRequest({
    ...input,
    imageUrls: [],
  });

  if (creationResult.error || !creationResult.data) {
    return creationResult;
  }

  const requestId = creationResult.data.id;

  try {
    const uploadResult = await uploadPurchaseRequestImages(requestId, uploads);

    if (uploadResult.error || !uploadResult.data) {
      throw new Error(uploadResult.error?.message || "Unable to upload images.");
    }

    const updateResult = await updateRequestWithImages(requestId, uploadResult.data);

    if (updateResult.error || !updateResult.data) {
      throw new Error(updateResult.error?.message || "Unable to update request with images.");
    }

    return success(updateResult.data);
  } catch (error: unknown) {
    logOperationalError("purchase_request_submit_with_attachments", error, {
      requestId,
    });

    await rollbackIncompleteRequest(requestId);

    // We don't report the cleanup result to the user, just the original failure

    return {
      data: null,
      error: createDomainError(error, "Failed to complete purchase request submission."),
    };
  }
};

export const updatePurchaseRequestWithAttachments = async (
    requestId: string,
    input: UpdatePurchaseRequestInput,
    uploads: PurchaseRequestImageUpload[],
): Promise<DomainResult<OperationsRequest>> => {
  const normalizedRequestId = normalizeText(requestId);

  if (!normalizedRequestId) {
    return failure("A valid request id is required.");
  }

  try {
    const current = await getPurchaseRequestById(normalizedRequestId);

    if (!current) {
      return failure("The request could not be found.");
    }

    if (!REQUEST_STATUSES_ALLOWED_TO_CANCEL.has(current.status)) {
      return failure("This request can no longer be edited.");
    }

    const existingImageUrls = Array.from(
        new Set([
          ...(current.imageUrls || []),
          ...(current.attachments || []).map((attachment) => attachment.fileUrl),
        ].filter(Boolean)),
    );

    const uploadResult = uploads.length > 0
        ? await uploadPurchaseRequestImages(normalizedRequestId, uploads)
        : success([] as string[]);

    if (uploadResult.error || !uploadResult.data) {
      throw new Error(uploadResult.error?.message || "Unable to upload images.");
    }

    const newImageUrls = uploadResult.data;
    const nextImageUrls = Array.from(new Set([...existingImageUrls, ...newImageUrls]));

    const payload = {
      full_name: normalizeText(input.fullName),
      phone: normalizeText(input.phone),
      email: normalizeText(input.email).toLowerCase(),
      country: normalizeText(input.country),
      city: normalizeText(input.city),
      product_name: normalizeText(input.productName),
      product_description: normalizeText(input.productDescription),
      quantity: normalizeNumber(input.quantity),
      size_dimensions: normalizeText(input.sizeDimensions),
      color: normalizeText(input.color),
      material: normalizeText(input.material),
      technical_specs: normalizeText(input.technicalSpecs),
      reference_link: normalizeText(input.referenceLink),
      preferred_shipping_method: normalizeText(input.preferredShippingMethod),
      delivery_notes: normalizeText(input.deliveryNotes),
      image_urls: nextImageUrls,
      weight: normalizeText(input.weight),
      manufacturing_country: normalizeText(input.manufacturingCountry),
      brand: normalizeText(input.brand),
      quality_level: normalizeText(input.qualityLevel),
      is_ready_made: Boolean(input.isReadyMade),
      has_previous_sample: Boolean(input.hasPreviousSample),
      expected_supply_date: normalizeText(input.expectedSupplyDate),
      destination: normalizeText(input.destination),
      delivery_address: normalizeText(input.deliveryAddress),
      is_full_sourcing: Boolean(input.isFullSourcing),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
        .from("purchase_requests")
        .update(payload)
        .eq("id", normalizedRequestId);

    if (updateError) {
      throw updateError;
    }

    if (newImageUrls.length > 0) {
      const attachments = newImageUrls.map((url, index) => ({
        entity_type: "purchase_request",
        entity_id: normalizedRequestId,
        category: "product_image",
        file_name: uploads[index]?.name || `image-${existingImageUrls.length + index + 1}`,
        file_url: url,
        visibility: "internal",
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: attachmentError } = await (supabase as any)
          .from("attachments")
          .insert(attachments);

      if (attachmentError) {
        throw attachmentError;
      }
    }

    const updated = await getPurchaseRequestById(normalizedRequestId);

    if (!updated) {
      return failure("The request was updated but could not be loaded.");
    }

    return success(normalizeRequest(updated));
  } catch (error) {
    logOperationalError("purchase_request_update", error, {
      requestId: normalizedRequestId,
      images: uploads.length,
    });

    return {
      data: null,
      error: createDomainError(error, "Failed to update the request."),
    };
  }
};

export const cancelPurchaseRequest = async (
    requestId: string,
    reason?: string,
): Promise<DomainResult<void>> => {
  const normalizedRequestId = normalizeText(requestId);

  if (!normalizedRequestId) {
    return failure("A valid request id is required.");
  }

  try {
    const rpcClient = supabase as unknown as {
      rpc: (
        fn: "cancel_purchase_request",
        args: { p_request_id: string; p_reason?: string | null },
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { error } = await rpcClient.rpc("cancel_purchase_request", {
      p_request_id: normalizedRequestId,
      p_reason: reason || "",
    });

    if (error) {
      if (error.message.includes("not found or cannot be cancelled")) {
        return failure("This request can no longer be cancelled.");
      }
      throw error;
    }

    return success(undefined);
  } catch (error) {
    logOperationalError("purchase_request_cancel", error, {
      requestId: normalizedRequestId,
    });

    return {
      data: null,
      error: createDomainError(error, "Failed to cancel the request."),
    };
  }
};

export const updateRequestWithImages = async (
    requestId: string,
    imageUrls: string[],
): Promise<DomainResult<OperationsRequest>> => {
  const normalizedRequestId = normalizeText(requestId);

  if (!normalizedRequestId) {
    return failure("A valid request id is required.");
  }

  try {
    const updated = await updatePurchaseRequestImages(normalizedRequestId, imageUrls);

    if (!updated) {
      throw new Error("Update returned no data.");
    }

    const result = await getPurchaseRequestById(normalizedRequestId);

    if (result) {
      return success(normalizeRequest(result));
    }

    const updatedRecord = updated as unknown as Record<string, unknown>;
    const createdAt = new Date().toISOString();

    return success({
      id: normalizedRequestId,
      requestNumber: String(updatedRecord.request_number || updatedRecord.requestNumber || ""),
      status: String(updatedRecord.status || "intake_submitted") as OperationsRequest["status"],
      statusLabel: "تم الاستلام",
      customer: {
        id: String(updatedRecord.customer_id || normalizedRequestId),
        fullName: String(updatedRecord.full_name || ""),
        phone: String(updatedRecord.phone || ""),
        email: String(updatedRecord.email || ""),
        country: String(updatedRecord.country || ""),
        city: String(updatedRecord.city || ""),
      },
      productName: String(updatedRecord.product_name || ""),
      productDescription: String(updatedRecord.product_description || ""),
      quantity: Number(updatedRecord.quantity || 0),
      sizeDimensions: String(updatedRecord.size_dimensions || ""),
      color: String(updatedRecord.color || ""),
      material: String(updatedRecord.material || ""),
      technicalSpecs: String(updatedRecord.technical_specs || ""),
      referenceLink: String(updatedRecord.reference_link || ""),
      preferredShippingMethod: String(updatedRecord.preferred_shipping_method || ""),
      deliveryNotes: String(updatedRecord.delivery_notes || ""),
      imageUrls,
      createdAt: String(updatedRecord.created_at || createdAt),
      weight: String(updatedRecord.weight || ""),
      manufacturingCountry: String(updatedRecord.manufacturing_country || ""),
      brand: String(updatedRecord.brand || ""),
      qualityLevel: String(updatedRecord.quality_level || ""),
      isReadyMade: Boolean(updatedRecord.is_ready_made),
      hasPreviousSample: Boolean(updatedRecord.has_previous_sample),
      expectedSupplyDate: String(updatedRecord.expected_supply_date || ""),
      destination: String(updatedRecord.destination || ""),
      deliveryAddress: String(updatedRecord.delivery_address || ""),
      isFullSourcing: Boolean(updatedRecord.is_full_sourcing ?? true),
      trackingCode: String(updatedRecord.tracking_code || ""),
      sourceInquiryId: null,
      convertedDealId: null,
      convertedDealNumber: null,
      isLegacyFallback: false,
      internalNotes: String(updatedRecord.internal_notes || ""),
      reviewedAt: null,
      attachments: imageUrls.map((url, index) => ({
        id: `${normalizedRequestId}-${index}`,
        entityType: "purchase_request",
        entityId: normalizedRequestId,
        category: "product_image",
        fileName: `image-${index + 1}`,
        fileUrl: url,
        visibility: "internal",
        createdAt,
      })),
    });
  } catch (error) {
    logOperationalError("purchase_request_image_update", error, {
      requestId: normalizedRequestId,
    });

    return {
      data: null,
      error: createDomainError(error, "Failed to update request with images."),
    };
  }
};

export const updateDealStatus = async (
    dealId: string,
    input: UpdateDealStatusInput,
): Promise<DomainResult<OperationsDeal>> => {
  const normalizedDealId = normalizeText(dealId);

  if (!normalizedDealId) {
    return failure("A valid deal id is required.");
  }

  try {
    const { error } = await updateDealOperation(normalizedDealId, {
      operationalStatus: input.operationalStatus,
      notes: normalizeOptionalText(input.notes),
      turkishPartnerId: input.turkishPartnerId ?? null,
      saudiPartnerId: input.saudiPartnerId ?? null,
    });

    if (error) {
      return {
        data: null,
        error: createDomainError(error, "Unable to update the deal status."),
      };
    }

    const deals = await loadDeals();
    const updatedDeal = deals.find((deal) => deal.id === normalizedDealId) ?? null;

    if (!updatedDeal) {
      return failure("The deal was updated but could not be loaded back into the domain model.");
    }

    return success(normalizeDeal(updatedDeal));
  } catch (error) {
    logOperationalError("deal_status_update", error, {
      dealId: normalizedDealId,
    });

    return {
      data: null,
      error: createDomainError(error, "Unable to update the deal status."),
    };
  }
};

export const resubmitPurchaseRequest = async (
    requestId: string,
): Promise<DomainResult<OperationsRequest>> => {
  const normalizedId = normalizeText(requestId);
  if (!normalizedId) return failure("Valid request ID required.");

  try {
    const original = await getPurchaseRequestById(normalizedId);
    if (!original) return failure("Original request not found.");

    const requestNumber = `PR-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;
    const trackingCode = `TRX-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;

    const input: CreateRequestInput = {
      requestNumber,
      trackingCode,
      fullName: original.customer.fullName,
      phone: original.customer.phone,
      email: original.customer.email,
      country: original.customer.country,
      city: original.customer.city,
      productName: original.productName,
      productDescription: original.productDescription,
      quantity: original.quantity,
      sizeDimensions: original.sizeDimensions,
      color: original.color,
      material: original.material,
      technicalSpecs: original.technicalSpecs,
      referenceLink: original.referenceLink,
      preferredShippingMethod: original.preferredShippingMethod,
      deliveryNotes: original.deliveryNotes,
      imageUrls: original.attachments.map(a => a.fileUrl),
      weight: original.weight,
      manufacturingCountry: original.manufacturingCountry,
      brand: original.brand,
      qualityLevel: original.qualityLevel,
      isReadyMade: original.isReadyMade,
      hasPreviousSample: original.hasPreviousSample,
      expectedSupplyDate: original.expectedSupplyDate,
      destination: original.destination,
      deliveryAddress: original.deliveryAddress,
      isFullSourcing: original.isFullSourcing,
    };

    return await createRequest(input);
  } catch (error) {
    logOperationalError("purchase_request_resubmit", error, { requestId: normalizedId });
    return {
      data: null,
      error: createDomainError(error, "Failed to resubmit request."),
    };
  }
};

export const archivePurchaseRequestFromPortal = async (
    requestId: string,
): Promise<DomainResult<void>> => {
  const normalizedId = normalizeText(requestId);
  if (!normalizedId) return failure("Valid request ID required.");

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from("purchase_requests")
        .update({ customer_hidden_at: new Date().toISOString() })
        .eq("id", normalizedId);

    if (error) throw error;
    return success(undefined);
  } catch (error) {
    logOperationalError("purchase_request_archive", error, { requestId: normalizedId });
    return {
      data: null,
      error: createDomainError(error, "Failed to remove request from list."),
    };
  }
};

export const uploadTransferProof = async (
    requestId: string,
    file: File,
): Promise<DomainResult<void>> => {
  try {
    await dbUploadTransferProof(requestId, file);
    return success(undefined);
  } catch (error) {
    logOperationalError("purchase_request_transfer_proof_upload", error, { requestId });
    return {
      data: null,
      error: createDomainError(error, "Failed to upload transfer proof."),
    };
  }
};

export const acceptTransferProof = async (
    requestId: string,
): Promise<DomainResult<void>> => {
  try {
    await dbAcceptTransferProof(requestId);
    return success(undefined);
  } catch (error) {
    logOperationalError("purchase_request_transfer_proof_accept", error, { requestId });
    return {
      data: null,
      error: createDomainError(error, "Failed to accept transfer proof."),
    };
  }
};

export const rejectTransferProof = async (
    requestId: string,
    reason: string,
): Promise<DomainResult<void>> => {
  try {
    await dbRejectTransferProof(requestId, reason);
    return success(undefined);
  } catch (error) {
    logOperationalError("purchase_request_transfer_proof_reject", error, { requestId });
    return {
      data: null,
      error: createDomainError(error, "Failed to reject transfer proof."),
    };
  }
};

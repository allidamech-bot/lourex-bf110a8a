import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  createPurchaseRequestRecord,
  loadCustomerDashboards,
  loadDeals,
  loadFinancialEditRequests,
  loadFinancialEntries,
  loadOperationalUsers,
  loadPurchaseRequests,
  loadShipments,
  updateDealOperation,
  updatePurchaseRequestImages,
  deletePurchaseRequestRecord,
  deleteStorageFolder,
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

const MAX_PURCHASE_REQUEST_IMAGES = 5;

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
  sizeDimensions: normalizeText(request.sizeDimensions),
  color: normalizeText(request.color),
  material: normalizeText(request.material),
  technicalSpecs: normalizeText(request.technicalSpecs),
  referenceLink: normalizeText(request.referenceLink),
  preferredShippingMethod: normalizeText(request.preferredShippingMethod),
  deliveryNotes: normalizeText(request.deliveryNotes),
  statusLabel: normalizeText(request.statusLabel),
  internalNotes: normalizeText(request.internalNotes),
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
  const { count, error } = await supabase.from("audit_logs").select("id", { count: "exact", head: true });

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
  requestNumber: string,
  uploads: PurchaseRequestImageUpload[],
): Promise<DomainResult<string[]>> => {
  const normalizedRequestNumber = normalizeText(requestNumber);
  if (!normalizedRequestNumber) {
    return failure("A valid purchase request number is required before uploading images.");
  }

  const files = normalizeImageFiles(uploads.map((upload) => upload.file));
  if (files.length === 0) {
    return failure("At least one valid product image is required.");
  }

  try {
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const filePath = `purchase-requests/${normalizedRequestNumber}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file);
      if (uploadError) {
        return { data: null, error: createDomainError(uploadError, "Unable to upload the purchase request images.") };
      }

      const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
      uploadedUrls.push(data.publicUrl);
    }

    return success(uploadedUrls);
  } catch (error) {
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
    // Phase 4 expansion
    weight: normalizeText(input.weight),
    manufacturingCountry: normalizeText(input.manufacturingCountry),
    brand: normalizeText(input.brand),
    qualityLevel: normalizeText(input.qualityLevel),
    isReadyMade: !!input.isReadyMade,
    hasPreviousSample: !!input.hasPreviousSample,
    expectedSupplyDate: normalizeText(input.expectedSupplyDate),
    destination: normalizeText(input.destination),
    deliveryAddress: normalizeText(input.deliveryAddress),
    isFullSourcing: !!input.isFullSourcing,
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

    const requests = await loadPurchaseRequests();
    const createdRequest = requests.find((request) => request.id === data.id) ?? null;

    if (!createdRequest) {
      return failure("The purchase request was created but could not be loaded back into the domain model.");
    }

    return success(normalizeRequest(createdRequest));
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to create the purchase request."),
    };
  }
};

export const deleteRequest = async (requestId: string): Promise<DomainResult<void>> => {
  try {
    await deletePurchaseRequestRecord(requestId);
    try {
      await deleteStorageFolder("product-images", `purchase-requests/${requestId}`);
    } catch (e) {
      console.error("[Cleanup] Failed to delete storage folder", e);
    }
    return success(undefined);
  } catch (error) {
    return { data: null, error: createDomainError(error, "Failed to cleanup request data.") };
  }
};

export const updateRequestWithImages = async (
  requestId: string,
  imageUrls: string[],
): Promise<DomainResult<OperationsRequest>> => {
  try {
    const updated = await updatePurchaseRequestImages(requestId, imageUrls);
    const requests = await loadPurchaseRequests();
    const result = requests.find((r) => r.id === (updated as any).id);
    if (!result) throw new Error("Could not reload updated request.");
    return success(normalizeRequest(result));
  } catch (error) {
    return { data: null, error: createDomainError(error, "Failed to update request with images.") };
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
    return {
      data: null,
      error: createDomainError(error, "Unable to update the deal status."),
    };
  }
};

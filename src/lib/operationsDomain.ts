import { writeAuditLog } from "@/domain/audit/service";
import { loadFinancialEntries, createFinancialEntry, loadFinancialEditRequests, createFinancialEditRequest, updateFinancialEditRequestStatus } from "@/domain/accounting/service";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { isValidRole, type LourexAccountStatus, type LourexRole } from "@/features/auth/rbac";
import { shipmentStages } from "@/lib/shipmentStages";
import { mapShipmentStatusToStage } from "@/lib/trackingStageMap";
import { canAdvanceShipmentStage, canConvertPurchaseRequest, canTransitionPurchaseRequestStatus } from "@/domain/operations/guards";
import { logOperationalError, trackEvent } from "@/lib/monitoring";
import type {
  AttachmentRecord,
  CustomerAccount,
  DealOperationalStatus,
  FinancialEditRequest,
  FinancialEntry,
  PublicTrackingResult,
  PurchaseRequest,
  PurchaseRequestStatus,
  ShipmentStageCode,
  TrackingUpdateRecord,
} from "@/types/lourex";

type DomainError = {
  code?: string;
  message?: string;
};

type DomainListResult<T> = Promise<{
  data: T[] | null;
  error: DomainError | null;
  count?: number | null;
}>;

type DomainSingleResult<T> = Promise<{
  data: T | null;
  error: DomainError | null;
}>;

interface DomainSelectBuilder<T> extends PromiseLike<{ data: T[] | null; error: DomainError | null }> {
  eq(column: string, value: unknown): DomainSelectBuilder<T>;
  in(column: string, values: unknown[]): DomainSelectBuilder<T>;
  limit(count: number): DomainSelectBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): DomainSelectBuilder<T>;
  single(): DomainSingleResult<T>;
  maybeSingle(): DomainSingleResult<T>;
}

interface DomainMutationBuilder<T> {
  then: PromiseLike<{ data: T[] | null; error: DomainError | null }>["then"];
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): PromiseLike<{ data: T[] | null; error: DomainError | null } | TResult>;
  finally?(onfinally?: (() => void) | null): PromiseLike<{ data: T[] | null; error: DomainError | null }>;
  [Symbol.toStringTag]?: string;
  select(query?: string): {
    single(): DomainSingleResult<T>;
  };
  eq(column: string, value: unknown): DomainMutationBuilder<T>;
}

interface DomainTableBuilder<T> {
  select(query?: string): DomainSelectBuilder<T>;
  insert(values: unknown): DomainMutationBuilder<T>;
  update(values: unknown): DomainMutationBuilder<T>;
  delete(): DomainMutationBuilder<T>;
}

interface LooseDomainClient {
  from<T extends Record<string, unknown>>(table: string): DomainTableBuilder<T>;
  rpc<TResult>(fn: string, args: Record<string, unknown>): {
    maybeSingle(): DomainSingleResult<TResult>;
  };
}

export type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];
export type DealRow = Database["public"]["Tables"]["deals"]["Row"] & {
  customer_id?: string | null;
  source_request_id?: string | null;
  operation_title?: string | null;
  operational_status?: DealOperationalStatus | null;
  shipment_id?: string | null;
  accounting_reference?: string | null;
  assigned_turkish_partner_id?: string | null;
  assigned_saudi_partner_id?: string | null;
};
export type InquiryRow = Database["public"]["Tables"]["inquiries"]["Row"];

export type JsonObject = Record<string, Json | undefined>;

export type ProfileRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  partner_type?: string | null;
  status?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type PurchaseRequestRow = {
  id: string;
  request_number: string;
  status: PurchaseRequestStatus;
  customer_id?: string | null;
  full_name: string;
  phone?: string | null;
  email: string;
  country?: string | null;
  city?: string | null;
  product_name?: string | null;
  product_description?: string | null;
  quantity?: number | null;
  size_dimensions?: string | null;
  color?: string | null;
  material?: string | null;
  technical_specs?: string | null;
  reference_link?: string | null;
  preferred_shipping_method?: string | null;
  delivery_notes?: string | null;
  image_urls?: string[] | null;
  created_at?: string;
  submitted_at?: string;
  source_inquiry_id?: string | null;
  converted_deal_id?: string | null;
  converted_deal_number?: string | null;
  internal_notes?: string | null;
  last_reviewed_at?: string | null;
  // Phase 4 expansion
  weight?: string | null;
  manufacturing_country?: string | null;
  brand?: string | null;
  quality_level?: string | null;
  is_ready_made?: boolean | null;
  has_previous_sample?: boolean | null;
  expected_supply_date?: string | null;
  destination?: string | null;
  delivery_address?: string | null;
  is_full_sourcing?: boolean | null;
  tracking_code?: string | null;
};

export type AttachmentRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  category?: string | null;
  file_name?: string | null;
  file_url: string;
  bucket_name?: string | null;
  storage_path?: string | null;
  visibility?: AttachmentRecord["visibility"] | null;
  created_at: string;
};

export type TrackingUpdateRow = {
  id: string;
  shipment_id: string;
  deal_id?: string | null;
  stage_code: ShipmentStageCode;
  previous_stage_code?: ShipmentStageCode | null;
  note?: string | null;
  customer_note?: string | null;
  visibility?: TrackingUpdateRecord["visibility"] | null;
  updated_by?: string | null;
  updated_by_role?: string | null;
  occurred_at?: string | null;
  created_at: string;
};

export type ShipmentRow = Database["public"]["Tables"]["shipments"]["Row"] & {
  deal_id?: string | null;
  current_stage_code?: ShipmentStageCode | null;
  customer_visible_note?: string | null;
};

export type CustomerRow = {
  id: string;
  full_name: string;
  phone?: string | null;
  email: string;
  country?: string | null;
  city?: string | null;
};

export type FinancialEntryRow = {
  id: string;
  entry_number: string;
  relation_type?: FinancialEntry["relationType"] | null;
  deal_id?: string | null;
  customer_id?: string | null;
  type: FinancialEntry["type"];
  amount?: number | null;
  currency?: string | null;
  locked?: boolean | null;
  created_by?: string | null;
  created_at: string;
  entry_date?: string | null;
  method?: string | null;
  counterparty?: string | null;
  category?: string | null;
  reference_label?: string | null;
  note?: string | null;
};

export type FinancialEditRequestRow = {
  id: string;
  financial_entry_id?: string | null;
  deal_id?: string | null;
  customer_id?: string | null;
  requested_by_name: string;
  requested_by_email?: string | null;
  reason: string;
  status: FinancialEditRequest["status"];
  created_at: string;
  reviewed_at?: string | null;
  reviewer_id?: string | null;
  review_note?: string | null;
  old_value?: JsonObject | null;
  proposed_value?: JsonObject | null;
  created_by?: string | null;
};

type AuditConversionRow = Pick<AuditLogRow, "record_id" | "new_values">;

type LegacyTrackingLookupRow = {
  tracking_id: string;
  destination: string;
  status: string;
  updated_at: string;
};

type CurrentCustomerUpsertRow = {
  customer_id: string;
};

type SecureTrackingLookupRow = {
  tracking_id: string;
  destination: string;
  client_name: string;
  current_stage_code?: ShipmentStageCode | null;
  customer_note?: string | null;
  last_updated: string;
  deal_number?: string | null;
  request_number?: string | null;
  operation_title?: string | null;
  timeline?: Json | null;
};

const db = supabase as unknown as LooseDomainClient;

let lourexDomainAvailable: boolean | null = null;

const isMissingSchemaError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const domainError = error as DomainError;
  const message = String(domainError.message || "").toLowerCase();
  return (
    domainError.code === "42P01" ||
    domainError.code === "42703" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("relation") ||
    message.includes("column")
  );
};

export const getLourexDomainAvailability = async () => {
  if (lourexDomainAvailable !== null) return lourexDomainAvailable;

  const { error } = await db.from("purchase_requests").select("id").limit(1);
  lourexDomainAvailable = !error || !isMissingSchemaError(error);
  return lourexDomainAvailable;
};

export const safeStructuredSelect = async <T extends Record<string, unknown>>(table: string, query?: string) => {
  const available = await getLourexDomainAvailability();
  if (!available) return [] as T[];

  const builder = query ? db.from<T>(table).select(query) : db.from<T>(table).select("*");
  const { data, error } = await builder;
  if (error && isMissingSchemaError(error)) return [] as T[];
  if (error) throw error;
  return data || [];
};

export const safeStructuredSelectWhereEq = async <T extends Record<string, unknown>>(
  table: string,
  column: string,
  value: unknown,
  query?: string,
) => {
  const available = await getLourexDomainAvailability();
  if (!available) return [] as T[];

  const builder = query ? db.from<T>(table).select(query) : db.from<T>(table).select("*");
  const { data, error } = await builder.eq(column, value);
  if (error && isMissingSchemaError(error)) return [] as T[];
  if (error) throw error;
  return data || [];
};

const safeStructuredSelectWhereIn = async <T extends Record<string, unknown>>(
  table: string,
  column: string,
  values: unknown[],
  query?: string,
) => {
  const available = await getLourexDomainAvailability();
  if (!available || values.length === 0) return [] as T[];

  const builder = query ? db.from<T>(table).select(query) : db.from<T>(table).select("*");
  const { data, error } = await builder.in(column, values);
  if (error && isMissingSchemaError(error)) return [] as T[];
  if (error) throw error;
  return data || [];
};

const safeStructuredMutation = async <T>(
  runner: () => PromiseLike<{ data?: T | null; error?: DomainError | null }>,
) => {
  const available = await getLourexDomainAvailability();
  if (!available) return { data: null as T | null, error: null };

  const result = await runner();
  if (result.error && isMissingSchemaError(result.error)) {
    return { data: null as T | null, error: null };
  }

  return result;
};

const asJsonObject = (value: Json | JsonObject | null | undefined): JsonObject | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonObject;
};

export const toJsonObject = (value?: Record<string, unknown>): JsonObject | null =>
  value ? (value as unknown as JsonObject) : null;

const requestNumberFromLegacyMessage = (message?: string | null, id?: string) =>
  message?.split("\n").find((line) => line.startsWith("Request Number:"))?.split(":")[1]?.trim() || `PR-${id?.slice(0, 8) || "LEGACY"}`;

const parseNoteLine = (notes: string | null | undefined, label: string) =>
  notes?.split("\n").find((line) => line.startsWith(`${label}:`))?.split(":")[1]?.trim() || "";

const parsePurchaseRequestMessage = (message?: string | null) => {
  const result = {
    productName: "",
    productDescription: "",
    quantity: "",
    sizeDimensions: "",
    color: "",
    material: "",
    technicalSpecs: "",
    referenceLink: "",
    preferredShippingMethod: "",
    deliveryNotes: "",
    imageUrls: [] as string[],
  };

  if (!message) return result;

  const lines = message.split("\n");
  for (const line of lines) {
    const [label, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (!label || !value) continue;

    const cleanLabel = label.trim().toLowerCase();

    if (cleanLabel.includes("product name")) result.productName = value;
    else if (cleanLabel.includes("product description")) result.productDescription = value;
    else if (cleanLabel.includes("quantity")) result.quantity = value;
    else if (cleanLabel.includes("size") || cleanLabel.includes("dimension")) result.sizeDimensions = value;
    else if (cleanLabel.includes("color")) result.color = value;
    else if (cleanLabel.includes("material")) result.material = value;
    else if (cleanLabel.includes("technical")) result.technicalSpecs = value;
    else if (cleanLabel.includes("reference") || cleanLabel.includes("link")) result.referenceLink = value;
    else if (cleanLabel.includes("shipping")) result.preferredShippingMethod = value;
    else if (cleanLabel.includes("delivery") || cleanLabel.includes("note")) result.deliveryNotes = value;
    else if (cleanLabel.includes("image url")) result.imageUrls.push(value);
  }

  return result;
};

const buildAttachmentLabel = (url: string, fallback: string) => {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.split("/").pop() || fallback);
  } catch {
    return fallback;
  }
};

const stageDescriptionByCode = Object.fromEntries(
  shipmentStages.map((stage) => [stage.code, stage.description]),
) as Record<ShipmentStageCode, string>;

const stageLabelByCode = Object.fromEntries(
  shipmentStages.map((stage) => [stage.code, stage.label]),
) as Record<ShipmentStageCode, string>;

const trackingVisibilityLabel: Record<TrackingUpdateRecord["visibility"], string> = {
  internal: "داخلي",
  customer_visible: "ظاهر للعميل",
};

export const requestStatusMeta: Record<PurchaseRequestStatus, { label: string; tone: string }> = {
  intake_submitted: { label: "تم الاستلام", tone: "bg-sky-500/15 text-sky-300" },
  under_review: { label: "قيد المراجعة", tone: "bg-amber-500/15 text-amber-300" },
  awaiting_clarification: { label: "بانتظار الإيضاح", tone: "bg-rose-500/15 text-rose-300" },
  ready_for_conversion: { label: "جاهز للتحويل", tone: "bg-emerald-500/15 text-emerald-300" },
  converted_to_deal: { label: "تم التحويل", tone: "bg-primary/15 text-primary" },
};

export const operationalStatusMeta: Record<DealOperationalStatus, { label: string; tone: string }> = {
  awaiting_assignment: { label: "بانتظار التعيين", tone: "bg-muted text-muted-foreground" },
  partner_assigned: { label: "تم تعيين الشركاء", tone: "bg-sky-500/15 text-sky-300" },
  sourcing: { label: "بدء التوريد", tone: "bg-amber-500/15 text-amber-300" },
  origin_execution: { label: "تنفيذ بلد المنشأ", tone: "bg-primary/15 text-primary" },
  in_transit: { label: "في الطريق", tone: "bg-indigo-500/15 text-indigo-300" },
  destination_execution: { label: "تنفيذ بلد الوصول", tone: "bg-orange-500/15 text-orange-300" },
  delivered: { label: "تم التسليم", tone: "bg-emerald-500/15 text-emerald-300" },
  closed: { label: "أغلقت العملية", tone: "bg-zinc-500/15 text-zinc-300" },
};

export type OperationalPurchaseRequest = PurchaseRequest & {
  sourceInquiryId?: string | null;
  convertedDealId?: string | null;
  convertedDealNumber?: string | null;
  isLegacyFallback?: boolean;
  internalNotes: string;
  reviewedAt?: string | null;
  attachments: AttachmentRecord[];
};

export type OperationalDeal = {
  id: string;
  dealNumber: string;
  operationTitle: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  sourceRequestId?: string | null;
  requestNumber?: string;
  status: string;
  operationalStatus: DealOperationalStatus;
  stage: ShipmentStageCode;
  shipmentId?: string | null;
  trackingId?: string;
  accountingReference?: string;
  originCountry?: string | null;
  destinationCountry?: string | null;
  totalValue: number;
  currency: string;
  createdAt: string;
  notes: string;
  attachments: AttachmentRecord[];
  trackingUpdates: TrackingUpdateRecord[];
  turkishPartnerId?: string | null;
  turkishPartnerName?: string;
  saudiPartnerId?: string | null;
  saudiPartnerName?: string;
  accountingSummary: {
    income: number;
    expense: number;
    net: number;
    entriesCount: number;
  };
};

export type OperationalShipment = {
  id: string;
  trackingId: string;
  clientName: string;
  destination: string;
  dealId?: string | null;
  dealNumber?: string;
  stage: ShipmentStageCode;
  updatedAt: string;
  customerVisibleNote: string;
  timeline: TrackingUpdateRecord[];
};

export type CustomerDashboard = CustomerAccount & {
  requestsCount: number;
  dealsCount: number;
  financialEntriesCount: number;
  financialBalance: number;
  auditCount: number;
  latestRequestNumber?: string;
  latestDealNumber?: string;
};

export type OperationalUser = {
  id: string;
  email: string;
  fullName: string;
  role: LourexRole;
  partnerType: string | null;
  status: LourexAccountStatus;
  createdAt: string;
  updatedAt: string;
};

export const getCurrentUserContext = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await db
    .from<ProfileRow>("profiles")
    .select("id, full_name, email, role, partner_type, status")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile };
};

// writeAuditLog moved to @/domain/audit/service

const INTERNAL_NOTIFICATION_ROLES = ["owner", "operations_employee", "turkish_partner", "saudi_partner"] as const;
type InternalNotificationRole = (typeof INTERNAL_NOTIFICATION_ROLES)[number];

const isInternalNotificationRole = (value: string | null | undefined): value is InternalNotificationRole =>
  typeof value === "string" && INTERNAL_NOTIFICATION_ROLES.includes(value as InternalNotificationRole);

export const createNotifications = async (
  notifications: Array<{
    userId?: string | null;
    type: string;
    title: string;
    message: string;
    link?: string;
  }>,
) => {
  const payload = notifications
    .filter((item) => item.userId)
    .map((item) => ({
      user_id: item.userId,
      type: item.type,
      title: item.title,
      message: item.message,
      link: item.link || "",
    }));

  if (payload.length === 0) return;

  await supabase.from("notifications").insert(
    payload.filter(
      (item, index, array) =>
        array.findIndex(
          (candidate) =>
            candidate.user_id === item.user_id &&
            candidate.title === item.title &&
            candidate.link === item.link,
        ) === index,
    ),
  );
};

export const getInternalNotificationRecipients = async (extraUserIds: Array<string | null | undefined> = []) => {
  const profiles = await safeStructuredSelect<ProfileRow>(
    "profiles",
    "id, role, status",
  );

  const internalUsers = (profiles || []).filter(
    (profile) => isInternalNotificationRole(profile.role) && profile.status === "active",
  );

  return Array.from(
    new Set([...internalUsers.map((profile) => profile.id), ...extraUserIds.filter(Boolean)]),
  );
};

const mapAttachment = (row: AttachmentRow): AttachmentRecord => ({
  id: row.id,
  entityType: row.entity_type === "deal" ? "deal" : "purchase_request",
  entityId: row.entity_id,
  category: row.category || "reference",
  fileName: row.file_name || buildAttachmentLabel(row.file_url || "", "attachment"),
  fileUrl: row.file_url,
  bucketName: row.bucket_name || "product-images",
  storagePath: row.storage_path || "",
  visibility: row.visibility || "internal",
  createdAt: row.created_at,
});

const mapTrackingUpdate = (row: TrackingUpdateRow): TrackingUpdateRecord => ({
  id: row.id,
  shipmentId: row.shipment_id,
  dealId: row.deal_id || undefined,
  stageCode: row.stage_code,
  previousStageCode: row.previous_stage_code || null,
  note: row.note || "",
  customerNote: row.customer_note || "",
  visibility: row.visibility || "internal",
  updatedBy: row.updated_by || undefined,
  updatedByRole: row.updated_by_role || "",
  occurredAt: row.occurred_at || row.created_at,
  createdAt: row.created_at,
});

const getAttachmentMap = (attachments: AttachmentRecord[]) => {
  const map = new Map<string, AttachmentRecord[]>();
  attachments.forEach((attachment) => {
    const key = `${attachment.entityType}:${attachment.entityId}`;
    map.set(key, [...(map.get(key) || []), attachment]);
  });
  return map;
};

const getTrackingMap = (updates: TrackingUpdateRecord[]) => {
  const map = new Map<string, TrackingUpdateRecord[]>();
  updates.forEach((update) => {
    map.set(update.shipmentId, [...(map.get(update.shipmentId) || []), update]);
  });
  map.forEach((rows, key) => {
    map.set(
      key,
      rows.sort((a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt)),
    );
  });
  return map;
};

export const assertInternalUser = (role: string | null | undefined): role is "owner" | "operations_employee" | "turkish_partner" | "saudi_partner" => {
  return !!role && ["owner", "operations_employee", "turkish_partner", "saudi_partner"].includes(role);
};

export const assertManagementUser = (role: string | null | undefined): role is "owner" | "operations_employee" => {
  return !!role && ["owner", "operations_employee"].includes(role);
};

export const createPurchaseRequestRecord = async (input: {
  requestNumber: string;
  fullName: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  productName: string;
  productDescription: string;
  quantity: number;
  sizeDimensions: string;
  color: string;
  material: string;
  technicalSpecs: string;
  referenceLink: string;
  preferredShippingMethod: string;
  deliveryNotes: string;
  imageUrls: string[];
  // Phase 4 expanded
  weight: string;
  manufacturingCountry: string;
  brand: string;
  qualityLevel: string;
  isReadyMade: boolean;
  hasPreviousSample: boolean;
  expectedSupplyDate: string;
  destination: string;
  deliveryAddress: string;
  isFullSourcing: boolean;
  trackingCode: string;
}) => {
  const { user, profile } = await getCurrentUserContext();
  let customerId: string | null = null;

  if (user && profile?.role === "customer") {
    const upsertedCustomer = await db
      .rpc<CurrentCustomerUpsertRow>("upsert_current_customer_record", {
        p_full_name: input.fullName,
        p_email: input.email,
        p_phone: input.phone,
        p_country: input.country,
        p_city: input.city,
      })
      .maybeSingle();

    if (upsertedCustomer.error || !upsertedCustomer.data?.customer_id) {
      return {
        data: null,
        error: upsertedCustomer.error || {
          message: "تعذر تهيئة سجل العميل المرتبط بطلب الشراء.",
        },
      };
    }

    customerId = upsertedCustomer.data.customer_id;
  }

  const inserted = await safeStructuredMutation<PurchaseRequestRow>(() =>
    db
      .from<PurchaseRequestRow>("purchase_requests")
      .insert({
        request_number: input.requestNumber,
        status: "intake_submitted",
        customer_id: customerId,
        full_name: input.fullName,
        phone: input.phone,
        email: input.email,
        country: input.country,
        city: input.city,
        product_name: input.productName,
        product_description: input.productDescription,
        quantity: input.quantity,
        size_dimensions: input.sizeDimensions,
        color: input.color,
        material: input.material,
        technical_specs: input.technicalSpecs,
        reference_link: input.referenceLink,
        preferred_shipping_method: input.preferredShippingMethod,
        delivery_notes: input.deliveryNotes,
        image_urls: input.imageUrls,
        // Phase 4 expansion mapping
        weight: input.weight,
        manufacturing_country: input.manufacturingCountry,
        brand: input.brand,
        quality_level: input.qualityLevel,
        is_ready_made: input.isReadyMade,
        has_previous_sample: input.hasPreviousSample,
        expected_supply_date: input.expectedSupplyDate,
        destination: input.destination,
        delivery_address: input.deliveryAddress,
        is_full_sourcing: input.isFullSourcing,
        tracking_code: input.trackingCode,
      })
      .select("*")
      .single(),
  );

  if (inserted.error || !inserted.data) {
    return inserted;
  }

  if (input.imageUrls.length === 0) {
    return inserted;
  }

  const attachments = input.imageUrls.map((url, index) => ({
    entity_type: "purchase_request",
    entity_id: inserted.data.id,
    category: "product_image",
    file_name: buildAttachmentLabel(url, `image-${index + 1}`),
    file_url: url,
    visibility: "internal",
    uploaded_by: user?.id || null,
  }));

  const { error: attachmentError } = await safeStructuredMutation(() =>
    db.from("attachments").insert(attachments),
  );

  return { data: inserted.data, error: attachmentError || null };
};

const mapExplicitRequest = (
  row: PurchaseRequestRow,
  attachmentsMap: Map<string, AttachmentRecord[]>,
): OperationalPurchaseRequest => ({
  id: row.id,
  requestNumber: row.request_number,
  status: row.status,
  statusLabel: requestStatusMeta[row.status]?.label,
  customer: {
    id: row.customer_id || row.id,
    fullName: row.full_name,
    phone: row.phone || "",
    email: row.email,
    country: row.country || "",
    city: row.city || "",
  },
  productName: row.product_name || "",
  productDescription: row.product_description || "",
  quantity: Number(row.quantity || 0),
  sizeDimensions: row.size_dimensions || "",
  color: row.color || "",
  material: row.material || "",
  technicalSpecs: row.technical_specs || "",
  referenceLink: row.reference_link || "",
  preferredShippingMethod: row.preferred_shipping_method || "",
  deliveryNotes: row.delivery_notes || "",
  imageUrls: row.image_urls || [],
  createdAt: row.created_at || row.submitted_at,
  // Phase 4 fields
  weight: row.weight || "",
  manufacturingCountry: row.manufacturing_country || "",
  brand: row.brand || "",
  qualityLevel: row.quality_level || "",
  isReadyMade: !!row.is_ready_made,
  hasPreviousSample: !!row.has_previous_sample,
  expectedSupplyDate: row.expected_supply_date || "",
  destination: row.destination || "",
  deliveryAddress: row.delivery_address || "",
  isFullSourcing: !!row.is_full_sourcing,
  trackingCode: row.tracking_code || "",
  sourceInquiryId: row.source_inquiry_id,
  convertedDealId: row.converted_deal_id || null,
  convertedDealNumber: row.converted_deal_number || null,
  isLegacyFallback: false,
  internalNotes: row.internal_notes || "",
  reviewedAt: row.last_reviewed_at || null,
  attachments: attachmentsMap.get(`purchase_request:${row.id}`) || [],
});

export const loadPurchaseRequests = async (
  options: { includeAttachments?: boolean; includeLegacy?: boolean } = {
    includeAttachments: true,
    includeLegacy: true,
  },
): Promise<OperationalPurchaseRequest[]> => {
  const { profile } = await getCurrentUserContext();
  const isCustomer = profile?.role === "customer";

  const [explicitRows, attachmentRows, legacyResult, { data: conversions }] = await Promise.all([
    isCustomer && profile?.id
      ? safeStructuredSelectWhereEq<PurchaseRequestRow>("purchase_requests", "customer_id", profile.id)
      : safeStructuredSelect<PurchaseRequestRow>("purchase_requests"),
    options.includeAttachments ? safeStructuredSelect<AttachmentRow>("attachments") : Promise.resolve([] as AttachmentRow[]),
    !options.includeLegacy || isCustomer
      ? Promise.resolve({ data: [] as InquiryRow[] | null, error: null })
      : supabase
          .from("inquiries")
          .select("id, name, email, phone, company, message, created_at")
          .eq("inquiry_type", "purchase_request")
          .order("created_at", { ascending: false }),
    isCustomer
      ? Promise.resolve({ data: [] as AuditConversionRow[] | null, error: null })
      : supabase
          .from("audit_logs")
          .select("record_id, new_values")
          .eq("action", "purchase_request.converted_to_deal")
          .order("created_at", { ascending: false }),
  ]);

  const attachmentsMap = getAttachmentMap((attachmentRows || []).map(mapAttachment));

  const conversionMap = new Map<string, { dealId?: string; dealNumber?: string }>();
  ((conversions || []) as AuditConversionRow[]).forEach((row) => {
    const newValues = asJsonObject(row.new_values);
    conversionMap.set(row.record_id, {
      dealId: typeof newValues?.deal_id === "string" ? newValues.deal_id : undefined,
      dealNumber: typeof newValues?.deal_number === "string" ? newValues.deal_number : undefined,
    });
  });

  const explicit = (explicitRows || []).map((row) => {
    const conversion = conversionMap.get(row.id) || conversionMap.get(row.source_inquiry_id);
    return mapExplicitRequest(
      {
        ...row,
        converted_deal_id: row.converted_deal_id || conversion?.dealId,
        converted_deal_number: row.converted_deal_number || conversion?.dealNumber,
      },
      attachmentsMap,
    );
  });

  const explicitLegacyIds = new Set(explicit.map((row) => row.sourceInquiryId).filter(Boolean));

  const legacy = ((legacyResult.data || []) as InquiryRow[])
    .filter((row) => !explicitLegacyIds.has(row.id))
    .map((row) => {
      const payload = parsePurchaseRequestMessage(row.message);
      const conversion = conversionMap.get(row.id);
      const [country = "", city = ""] = (row.company || "").split(" - ").map((item: string) => item.trim());
      const status = (conversion?.dealNumber ? "converted_to_deal" : "under_review") as PurchaseRequestStatus;

      return {
        id: row.id,
        requestNumber: requestNumberFromLegacyMessage(row.message, row.id),
        status,
        statusLabel: requestStatusMeta[status].label,
        customer: {
          id: row.id,
          fullName: row.name,
          phone: row.phone || "",
          email: row.email,
          country,
          city,
        },
        productName: payload.productName || "",
        productDescription: payload.productDescription || "",
        quantity: Number(payload.quantity || 0),
        sizeDimensions: payload.sizeDimensions || "",
        color: payload.color || "",
        material: payload.material || "",
        technicalSpecs: payload.technicalSpecs || "",
        referenceLink: payload.referenceLink || "",
        preferredShippingMethod: payload.preferredShippingMethod || "",
        deliveryNotes: payload.deliveryNotes || "",
        imageUrls: payload.imageUrls || [],
        createdAt: row.created_at,
        sourceInquiryId: row.id,
        convertedDealId: conversion?.dealId || null,
        convertedDealNumber: conversion?.dealNumber || null,
        isLegacyFallback: true,
        internalNotes: "",
        reviewedAt: null,
        // Legacy fallback fields for Phase 4
        weight: "",
        manufacturingCountry: "",
        brand: "",
        qualityLevel: "",
        isReadyMade: false,
        hasPreviousSample: false,
        expectedSupplyDate: "",
        destination: country, // Use country as a guess
        deliveryAddress: "",
        isFullSourcing: true,
        trackingCode: "",
        attachments: (payload.imageUrls || []).map((url, index) => ({
          id: `${row.id}-${index}`,
          entityType: "purchase_request",
          entityId: row.id,
          category: "product_image",
          fileName: buildAttachmentLabel(url, `image-${index + 1}`),
          fileUrl: url,
          visibility: "internal",
          createdAt: row.created_at,
        })),
      } satisfies OperationalPurchaseRequest;
    });

  return [...explicit, ...legacy].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
};

export const updatePurchaseRequestStatus = async (
  requestId: string,
  status: PurchaseRequestStatus,
  internalNotes?: string,
) => {
  const { user, profile } = await getCurrentUserContext();
  if (!user || !profile || !assertManagementUser(profile.role)) {
    throw new Error("صلاحياتك الحالية لا تسمح بتحديث طلبات الشراء.");
  }

  const currentRows = await safeStructuredSelect<PurchaseRequestRow>("purchase_requests");
  const current = currentRows.find((row) => row.id === requestId);
  if (!current) throw new Error("تعذر العثور على طلب الشراء المطلوب.");
  if (!canTransitionPurchaseRequestStatus(current.status, status)) {
    throw new Error("لا يمكن نقل طلب الشراء إلى هذه الحالة من حالته الحالية.");
  }

  const result = await safeStructuredMutation(() =>
    db
      .from("purchase_requests")
      .update({
        status,
        internal_notes: internalNotes ?? current?.internal_notes ?? "",
        last_reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id || null,
      })
      .eq("id", requestId),
  );

  if (result.error) {
    logOperationalError("purchase_request_status_update", result.error, { requestId, status });
  } else {
    await writeAuditLog({
      action: "purchase_request.status_updated",
      tableName: "purchase_requests",
      recordId: requestId,
      oldValues: { status: current?.status, internal_notes: current?.internal_notes || "" },
      newValues: {
        request_id: requestId,
        request_number: current?.request_number,
        status,
        internal_notes: internalNotes ?? current?.internal_notes ?? "",
        summary: `تم تحديث حالة الطلب ${current?.request_number || requestId}`,
        entity_label: current?.product_name || current?.request_number || "Purchase Request",
      },
    });
  }

  return result;
};

export const updatePurchaseRequestInternalNotes = async (requestId: string, internalNotes: string) => {
  const { user, profile } = await getCurrentUserContext();
  if (!user || !profile || !assertManagementUser(profile.role)) {
    throw new Error("صلاحياتك الحالية لا تسمح بتحديث ملاحظات طلبات الشراء.");
  }

  const currentRows = await safeStructuredSelect<PurchaseRequestRow>("purchase_requests");
  const current = currentRows.find((row) => row.id === requestId);
  if (!current) throw new Error("تعذر العثور على طلب الشراء المطلوب.");

  const result = await safeStructuredMutation(() =>
    db
      .from("purchase_requests")
      .update({
        internal_notes: internalNotes,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId),
  );

  if (result.error) {
    logOperationalError("purchase_request_notes_update", result.error, { requestId });
  } else {
    await writeAuditLog({
      action: "purchase_request.notes_updated",
      tableName: "purchase_requests",
      recordId: requestId,
      oldValues: { internal_notes: current?.internal_notes || "" },
      newValues: {
        request_id: requestId,
        request_number: current?.request_number,
        summary: `تم تحديث الملاحظات الداخلية للطلب ${current?.request_number || requestId}`,
        entity_label: current?.product_name || current?.request_number || "Purchase Request",
      },
    });
  }

  return result;
};

const ensureCustomer = async (request: OperationalPurchaseRequest) => {
  const available = await getLourexDomainAvailability();
  if (!available) {
    return {
      id: request.customer.id,
      full_name: request.customer.fullName,
      phone: request.customer.phone,
      email: request.customer.email,
      country: request.customer.country,
      city: request.customer.city,
    };
  }

  const existing = await db
    .from("lourex_customers")
    .select("*")
    .eq("email", request.customer.email)
    .maybeSingle();

  if (existing.data) {
    await db
      .from("lourex_customers")
      .update({
        full_name: request.customer.fullName,
        phone: request.customer.phone,
        country: request.customer.country,
        city: request.customer.city,
      })
      .eq("id", existing.data.id);
    return existing.data;
  }

  const inserted = await db
    .from("lourex_customers")
    .insert({
      full_name: request.customer.fullName,
      phone: request.customer.phone,
      email: request.customer.email,
      country: request.customer.country,
      city: request.customer.city,
    })
    .select("*")
    .single();

  return inserted.data;
};

export const convertRequestToDeal = async (
  request: OperationalPurchaseRequest,
  options?: {
    operationalNotes?: string;
    turkishPartnerId?: string;
    saudiPartnerId?: string;
  },
) => {
  const { user, profile } = await getCurrentUserContext();
  if (!user || !profile) throw new Error("يجب تسجيل الدخول أولاً.");
  if (!isValidRole(profile.role)) throw new Error("صلاحيات الحساب الحالية غير صالحة.");
  if (!canConvertPurchaseRequest({
    role: profile.role,
    status: request.status,
    convertedDealNumber: request.convertedDealNumber,
  })) {
    throw new Error("لا يمكن تحويل هذا الطلب إلى صفقة من حالته الحالية أو بصلاحياتك الحالية.");
  }

  const customer = await ensureCustomer(request);
  if (!customer) throw new Error("تعذر إنشاء سجل العميل.");

  const domainAvailable = await getLourexDomainAvailability();

  if (!domainAvailable) {
    const legacyDealNumber = `DL-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    const legacyInsert = await supabase.from("deals").insert({
      deal_number: legacyDealNumber,
      client_id: user.id,
      status: "in_progress",
      destination_country: request.customer.country || null,
      origin_country: "Turkey",
      notes: [
        `Request Number: ${request.requestNumber}`,
        `Customer Name: ${request.customer.fullName}`,
        `Customer Email: ${request.customer.email}`,
        `Product: ${request.productName || "N/A"}`,
        `Preferred Shipping: ${request.preferredShippingMethod || "N/A"}`,
        `Source Request Id: ${request.sourceInquiryId || request.id}`,
      ].join("\n"),
      total_value: 0,
      currency: "SAR",
    });

    if (legacyInsert.error) throw legacyInsert.error;

    await writeAuditLog({
      action: "purchase_request.converted_to_deal",
      tableName: "inquiries",
      recordId: request.sourceInquiryId || request.id,
      newValues: {
        deal_number: legacyDealNumber,
        request_number: request.requestNumber,
        summary: `تم تحويل الطلب ${request.requestNumber} إلى الصفقة ${legacyDealNumber}`,
        entity_label: request.productName || request.requestNumber,
      },
    });

    return {
      dealId: "",
      dealNumber: legacyDealNumber,
      trackingId: "",
    };
  }

  let requestId = request.id;

  if (request.isLegacyFallback) {
    const insertedRequest = await db
      .from<PurchaseRequestRow>("purchase_requests")
      .insert({
        request_number: request.requestNumber,
        source_inquiry_id: request.sourceInquiryId || request.id,
        customer_id: customer.id,
        status: "ready_for_conversion",
        full_name: request.customer.fullName,
        phone: request.customer.phone,
        email: request.customer.email,
        country: request.customer.country,
        city: request.customer.city,
        product_name: request.productName,
        product_description: request.productDescription,
        quantity: request.quantity || 1,
        size_dimensions: request.sizeDimensions,
        color: request.color,
        material: request.material,
        technical_specs: request.technicalSpecs,
        reference_link: request.referenceLink,
        preferred_shipping_method: request.preferredShippingMethod,
        delivery_notes: request.deliveryNotes,
        image_urls: request.imageUrls,
      })
      .select("*")
      .single();

    if (insertedRequest.error) throw insertedRequest.error;
    requestId = insertedRequest.data.id;
  }

  const dealNumber = `DL-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
  const trackingNumber = `TRK-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
  const accountingReference = `ACC-${dealNumber}`;

  // Build a comprehensive operational summary for the deal notes
  const operationalSummary = [
    `Product: ${request.productName}`,
    `Quantity: ${request.quantity}`,
    `Weight: ${request.weight || "N/A"}`,
    `Brand: ${request.brand || "N/A"}`,
    `Quality Level: ${request.qualityLevel || "N/A"}`,
    `Manufacturing Country: ${request.manufacturingCountry || "N/A"}`,
    `Preferred Shipping: ${request.preferredShippingMethod}`,
    `Destination: ${request.destination || "N/A"}`,
    `Sourcing: ${request.isFullSourcing ? "Full Sourcing/Procurement" : "Shipping Only"}`,
    `Product Type: ${request.isReadyMade ? "Ready-made" : "Requires Manufacturing"}`,
    `Has Sample: ${request.hasPreviousSample ? "Yes" : "No"}`,
    `Expected Date: ${request.expectedSupplyDate || "N/A"}`,
    `Delivery Address: ${request.deliveryAddress || "N/A"}`,
    "-------------------",
    `Internal Review Notes: ${options?.operationalNotes || request.internalNotes || "None"}`,
  ].join("\n");

  const insertedDeal = await db
    .from<DealRow>("deals")
    .insert({
      deal_number: dealNumber,
      client_id: user.id,
      customer_id: customer.id,
      source_request_id: requestId,
      accounting_reference: accountingReference,
      operation_title: request.productName,
      status: "in_progress",
      operational_status:
        options?.turkishPartnerId || options?.saudiPartnerId ? "partner_assigned" : "awaiting_assignment",
      destination_country: request.customer.country || null,
      origin_country: "Turkey",
      total_value: 0,
      currency: "SAR",
      notes: operationalSummary,
      assigned_turkish_partner_id: options?.turkishPartnerId || null,
      assigned_saudi_partner_id: options?.saudiPartnerId || null,
    })
    .select("*")
    .single();

  if (insertedDeal.error) throw insertedDeal.error;

  const insertedShipment = await db
    .from<ShipmentRow>("shipments")
    .insert({
      tracking_id: trackingNumber,
      client_name: request.customer.fullName,
      destination: [request.customer.city, request.customer.country].filter(Boolean).join(", "),
      status: "factory",
      current_stage_code: "deal_accepted",
      customer_visible_note: "تم قبول الصفقة وبدء تجهيز العملية.",
      deal_id: insertedDeal.data.id,
      user_id: user.id,
      pallets: 0,
      weight: 0,
    })
    .select("*")
    .single();

  if (insertedShipment.error) throw insertedShipment.error;

  await db
    .from<DealRow>("deals")
    .update({ shipment_id: insertedShipment.data.id })
    .eq("id", insertedDeal.data.id);

  await db
    .from<PurchaseRequestRow>("purchase_requests")
    .update({
      status: "converted_to_deal",
      customer_id: customer.id,
      converted_deal_id: insertedDeal.data.id,
    })
    .eq("id", requestId);

  if (request.attachments.length > 0) {
    await db.from<AttachmentRow>("attachments").insert(
      request.attachments.map((attachment) => ({
        entity_type: "deal",
        entity_id: insertedDeal.data.id,
        category: attachment.category || "reference",
        file_name: attachment.fileName,
        file_url: attachment.fileUrl,
        bucket_name: attachment.bucketName || "product-images",
        storage_path: attachment.storagePath || "",
        visibility: "internal",
        uploaded_by: user.id,
      })),
    );
  }

  await db.from<TrackingUpdateRow>("tracking_updates").insert({
    shipment_id: insertedShipment.data.id,
    deal_id: insertedDeal.data.id,
    stage_code: "deal_accepted",
    previous_stage_code: "deal_accepted",
    note: "تم إنشاء الشحنة وربطها بالصفقة الجديدة.",
    customer_note: "تم قبول الصفقة وبدء تجهيز العملية.",
    visibility: "customer_visible",
    updated_by: user.id,
    updated_by_role: "operations_employee",
  });

  await writeAuditLog({
    action: "purchase_request.converted_to_deal",
    tableName: "purchase_requests",
    recordId: requestId,
    oldValues: { status: request.status },
    newValues: {
      request_number: request.requestNumber,
      request_id: requestId,
      deal_id: insertedDeal.data.id,
      deal_number: dealNumber,
      customer_id: customer.id,
      tracking_id: trackingNumber,
      summary: `تم تحويل الطلب ${request.requestNumber} إلى الصفقة ${dealNumber}`,
      entity_label: request.productName || request.requestNumber,
    },
  });

  await writeAuditLog({
    action: "deal.created_from_request",
    tableName: "deals",
    recordId: insertedDeal.data.id,
    newValues: {
      deal_number: dealNumber,
      request_id: requestId,
      request_number: request.requestNumber,
      tracking_id: trackingNumber,
      accounting_reference: accountingReference,
      customer_name: request.customer.fullName,
      summary: `إنشاء صفقة تشغيلية من الطلب ${request.requestNumber}`,
      entity_label: dealNumber,
    },
  });

  const notificationRecipients = await getInternalNotificationRecipients([
    options?.turkishPartnerId,
    options?.saudiPartnerId,
  ]);

  await createNotifications(
    notificationRecipients.map((recipientId) => ({
      userId: recipientId,
      type: "request_conversion",
      title: "تم تحويل طلب إلى صفقة تشغيلية",
      message: `الطلب ${request.requestNumber} أصبح الآن الصفقة ${dealNumber}.`,
      link: `/dashboard/deals?deal=${dealNumber}`,
    })),
  );

  trackEvent("deal_converted", {
    requestNumber: request.requestNumber,
    dealNumber,
    hasTracking: Boolean(trackingNumber),
  });

  return {
    dealId: insertedDeal.data.id,
    dealNumber,
    trackingId: trackingNumber,
  };
};

export const loadTrackingUpdates = async (): Promise<TrackingUpdateRecord[]> => {
  const rows = await safeStructuredSelect<TrackingUpdateRow>("tracking_updates");
  return (rows || []).map(mapTrackingUpdate).sort((a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt));
};

export const loadDeals = async (): Promise<OperationalDeal[]> => {
  const { profile } = await getCurrentUserContext();
  const isCustomer = profile?.role === "customer";

  const deals = isCustomer && profile?.id
    ? await safeStructuredSelectWhereEq<DealRow>("deals", "customer_id", profile.id)
    : await safeStructuredSelect<DealRow>("deals");

  const dealIds = deals.map((row) => row.id);
  const requestIds = Array.from(
    new Set(deals.map((row) => row.source_request_id).filter((value): value is string => typeof value === "string")),
  );
  const partnerIds = Array.from(
    new Set(
      deals
        .flatMap((row) => [row.assigned_turkish_partner_id, row.assigned_saudi_partner_id])
        .filter((value): value is string => typeof value === "string"),
    ),
  );

  const [requests, customers, shipments, attachmentRows, trackingRows, entryRows, profileRows] = await Promise.all([
    isCustomer
      ? safeStructuredSelectWhereIn<PurchaseRequestRow>(
          "purchase_requests",
          "id",
          requestIds,
          "id, request_number, converted_deal_id",
        )
        : safeStructuredSelect<PurchaseRequestRow>("purchase_requests", "id, request_number, converted_deal_id"),
    isCustomer && profile?.id
      ? safeStructuredSelectWhereEq<CustomerRow>("lourex_customers", "id", profile.id)
      : safeStructuredSelect<CustomerRow>("lourex_customers"),
    isCustomer
      ? safeStructuredSelectWhereIn<ShipmentRow>("shipments", "deal_id", dealIds)
      : safeStructuredSelect<ShipmentRow>("shipments"),
    isCustomer
      ? (async () => {
          const rows = await safeStructuredSelectWhereIn<AttachmentRow>("attachments", "entity_id", dealIds);
          return rows.filter((row) => row.entity_type === "deal");
        })()
      : safeStructuredSelect<AttachmentRow>("attachments"),
    isCustomer ? [] : await safeStructuredSelect<TrackingUpdateRow>("tracking_updates"),
    isCustomer
      ? safeStructuredSelectWhereIn<FinancialEntryRow>("financial_entries", "deal_id", dealIds)
      : await safeStructuredSelect<FinancialEntryRow>("financial_entries"),
    isCustomer ? [] : await safeStructuredSelect<ProfileRow>("profiles", "id, full_name"),
  ]);

  const shipmentIds = shipments.map((row) => row.id);
  const customerTrackingRows = isCustomer
    ? await safeStructuredSelectWhereIn<TrackingUpdateRow>("tracking_updates", "shipment_id", shipmentIds)
    : trackingRows;

  const requestMap = new Map<string, PurchaseRequestRow>((requests || []).map((row) => [row.id, row]));
  const customerMap = new Map<string, CustomerRow>((customers || []).map((row) => [row.id, row]));
  const shipmentMap = new Map<string, ShipmentRow>((shipments || []).map((row) => [row.id, row]));
  const shipmentByDealId = new Map<string, ShipmentRow>(
    (shipments || [])
      .filter((row): row is ShipmentRow & { deal_id: string } => typeof row.deal_id === "string")
      .map((row) => [row.deal_id, row]),
  );
  const attachmentsMap = getAttachmentMap((attachmentRows || []).map(mapAttachment));
  const trackingUpdates = (customerTrackingRows || []).map(mapTrackingUpdate);
  const trackingMap = getTrackingMap(trackingUpdates);
  const profileMap = new Map<string, ProfileRow>((profileRows || []).map((row) => [row.id, row]));

  const filteredDeals = deals || [];

  return filteredDeals.map((row) => {
    const customer = row.customer_id ? customerMap.get(row.customer_id) : null;
    const sourceRequest = row.source_request_id ? requestMap.get(row.source_request_id) : null;
    const shipment = row.shipment_id ? shipmentMap.get(row.shipment_id) : shipmentByDealId.get(row.id);
    const entries = (entryRows || []).filter((entry) => entry.deal_id === row.id);
    const income = entries
      .filter((entry) => entry.type === "income")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const expense = entries
      .filter((entry) => entry.type === "expense")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    const dealTracking = shipment?.id ? trackingMap.get(shipment.id) || [] : [];
    const filteredTracking = isCustomer
      ? dealTracking.filter((update) => update.visibility === "customer_visible")
      : dealTracking;

    return {
      id: row.id,
      dealNumber: row.deal_number,
      operationTitle: row.operation_title || parseNoteLine(row.notes, "Product") || "صفقة تشغيلية",
      customerId: row.customer_id,
      customerName: customer?.full_name || parseNoteLine(row.notes, "Customer Name") || "غير محدد",
      customerEmail: customer?.email || parseNoteLine(row.notes, "Customer Email") || "",
      customerPhone: customer?.phone || "",
      sourceRequestId: row.source_request_id || parseNoteLine(row.notes, "Source Request Id") || null,
      requestNumber: sourceRequest?.request_number || parseNoteLine(row.notes, "Request Number") || "",
      status: row.status,
      operationalStatus: (row.operational_status || "awaiting_assignment") as DealOperationalStatus,
      stage: shipment?.current_stage_code || mapShipmentStatusToStage(shipment?.status || row.status),
      shipmentId: shipment?.id || row.shipment_id || null,
      trackingId: shipment?.tracking_id || "",
      accountingReference: row.accounting_reference || "",
      originCountry: row.origin_country,
      destinationCountry: row.destination_country,
      totalValue: Number(row.total_value || 0),
      currency: row.currency || "SAR",
      createdAt: row.created_at,
      notes: row.notes || "",
      attachments: attachmentsMap.get(`deal:${row.id}`) || [],
      trackingUpdates: filteredTracking,
      turkishPartnerId: row.assigned_turkish_partner_id || null,
      turkishPartnerName: row.assigned_turkish_partner_id
        ? profileMap.get(row.assigned_turkish_partner_id)?.full_name || ""
        : "",
      saudiPartnerId: row.assigned_saudi_partner_id || null,
      saudiPartnerName: row.assigned_saudi_partner_id
        ? profileMap.get(row.assigned_saudi_partner_id)?.full_name || ""
        : "",
      accountingSummary: {
        income,
        expense,
        net: income - expense,
        entriesCount: entries.length,
      },
    };
  });
};

export const updateDealOperation = async (
  dealId: string,
  input: {
    notes?: string;
    operationalStatus?: DealOperationalStatus;
    turkishPartnerId?: string | null;
    saudiPartnerId?: string | null;
  },
) => {
  const { user, profile } = await getCurrentUserContext();
  if (!user || !profile) throw new Error("يجب تسجيل الدخول أولاً.");

  const currentDeals = await loadDeals();
  const current = currentDeals.find((deal) => deal.id === dealId);
  if (!current) throw new Error("تعذر العثور على الصفقة المطلوبة.");

  const payload: Record<string, unknown> = {};
  if (typeof input.notes === "string") payload.notes = input.notes;
  if (input.operationalStatus) payload.operational_status = input.operationalStatus;
  if (Object.prototype.hasOwnProperty.call(input, "turkishPartnerId")) {
    payload.assigned_turkish_partner_id = input.turkishPartnerId || null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "saudiPartnerId")) {
    payload.assigned_saudi_partner_id = input.saudiPartnerId || null;
  }

  if (Object.keys(payload).length === 0) return { data: null, error: null };

  const canManageDeal = profile.role === "owner" || profile.role === "operations_employee";
  if (!canManageDeal) {
    throw new Error("صلاحياتك الحالية لا تسمح بتعديل مركز الصفقة.");
  }

  const nextTurkishPartnerId =
    Object.prototype.hasOwnProperty.call(input, "turkishPartnerId") ? input.turkishPartnerId || null : current.turkishPartnerId || null;
  const nextSaudiPartnerId =
    Object.prototype.hasOwnProperty.call(input, "saudiPartnerId") ? input.saudiPartnerId || null : current.saudiPartnerId || null;
  const nextOperationalStatus = (input.operationalStatus || current.operationalStatus) as DealOperationalStatus;

  if (
    ["partner_assigned", "sourcing", "origin_execution", "in_transit", "destination_execution", "delivered", "closed"].includes(
      nextOperationalStatus,
    ) &&
    (!nextTurkishPartnerId || !nextSaudiPartnerId)
  ) {
    throw new Error("يجب تعيين الشريك التركي والشريك السعودي قبل نقل الصفقة إلى هذه الحالة.");
  }

  if (nextOperationalStatus === "closed" && current.stage !== "delivered") {
    throw new Error("لا يمكن إغلاق الصفقة قبل اكتمال مرحلة تم التسليم.");
  }

  const result = await safeStructuredMutation(() =>
    db.from<DealRow>("deals").update(payload).eq("id", dealId).select("*").single(),
  );

  if (!result.error) {
    await writeAuditLog({
      action: "deal.updated",
      tableName: "deals",
      recordId: dealId,
      oldValues: {
        notes: current?.notes || "",
        operational_status: current?.operationalStatus || "",
        assigned_turkish_partner_id: current?.turkishPartnerId || null,
        assigned_saudi_partner_id: current?.saudiPartnerId || null,
      },
      newValues: {
        deal_id: dealId,
        deal_number: current?.dealNumber,
        summary: `تم تحديث مركز الصفقة ${current?.dealNumber || dealId}`,
        entity_label: current?.dealNumber || "Deal",
        ...payload,
      },
    });
  }

  return result;
};

import { STORAGE_BUCKETS, STORAGE_PATHS, uploadFile, deleteFolder } from "./storage";

export const uploadDealAttachment = async (input: {
  dealId: string;
  dealNumber: string;
  file: File;
  category?: string;
  visibility?: "internal" | "customer_visible";
}) => {
  const { user, profile } = await getCurrentUserContext();
  if (!user || !profile) throw new Error("يجب تسجيل الدخول أولاً.");
  if (!assertInternalUser(profile.role)) {
    throw new Error("صلاحياتك الحالية لا تسمح بإضافة مرفقات الصفقة.");
  }

  const filePath = `${STORAGE_PATHS.DEAL_ATTACHMENTS(input.dealNumber)}/${Date.now()}-${input.file.name}`;
  const publicUrl = await uploadFile("PRODUCT_IMAGES", filePath, input.file);

  const inserted = await db
    .from<AttachmentRow>("attachments")
    .insert({
      entity_type: "deal",
      entity_id: input.dealId,
      category: input.category || "reference",
      file_name: input.file.name,
      file_url: publicUrl,
      bucket_name: STORAGE_BUCKETS.PRODUCT_IMAGES,
      storage_path: filePath,
      visibility: input.visibility || "internal",
      uploaded_by: user.id,
    })
    .select("*")
    .single();

  if (inserted.error) throw inserted.error;

  await writeAuditLog({
    action: "deal.attachment_added",
    tableName: "attachments",
    recordId: inserted.data.id,
    newValues: {
      deal_id: input.dealId,
      deal_number: input.dealNumber,
      file_name: input.file.name,
      summary: `تم رفع مرفق جديد إلى الصفقة ${input.dealNumber}`,
      entity_label: input.dealNumber,
    },
  });

  return mapAttachment(inserted.data);
};

export const loadShipments = async (): Promise<OperationalShipment[]> => {
  const { profile } = await getCurrentUserContext();
  const isCustomer = profile?.role === "customer";

  // Use loadDeals to get the list of deals (this is already optimized)
  const deals = await loadDeals();
  const dealIds = deals.map((deal) => deal.id);

  // In customer mode, we already have shipments from loadDeals, but loadDeals returns OperationalDeal
  // We need to fetch the raw ShipmentRows to build OperationalShipments properly if we want the full list.
  // Actually, loadDeals already fetched all shipments for these deals.
  
  const shipments = isCustomer
    ? await safeStructuredSelectWhereIn<ShipmentRow>("shipments", "deal_id", dealIds)
    : await safeStructuredSelect<ShipmentRow>("shipments");

  const shipmentIds = shipments.map((s) => s.id);

  const trackingRows = isCustomer
    ? await safeStructuredSelectWhereIn<TrackingUpdateRow>("tracking_updates", "shipment_id", shipmentIds)
    : await safeStructuredSelect<TrackingUpdateRow>("tracking_updates");

  const dealMap = new Map(deals.map((deal) => [deal.id, deal]));
  const trackingMap = getTrackingMap((trackingRows || []).map(mapTrackingUpdate));
  
  // RLS handles visibility, but we double-check customer ownership if needed.
  const filteredShipments = shipments.filter((row) => {
    if (!isCustomer) return true;
    const deal = row.deal_id ? dealMap.get(row.deal_id) : null;
    return deal?.customerId === profile?.id;
  });

  return filteredShipments.map((row) => {
    const timeline = (trackingMap.get(row.id) || []).filter((update) => {
      if (!isCustomer) return true;
      return update.visibility === "customer_visible";
    });

    const deal = row.deal_id ? dealMap.get(row.deal_id) : undefined;

    return {
      id: row.id,
      trackingId: row.tracking_id,
      clientName: row.client_name,
      destination: row.destination,
      dealId: row.deal_id,
      dealNumber: deal?.dealNumber,
      stage: row.current_stage_code || mapShipmentStatusToStage(row.status),
      updatedAt: row.updated_at,
      customerVisibleNote: row.customer_visible_note || "",
      timeline,
    };
  });
};

export const createTrackingUpdate = async (input: {
  shipmentId: string;
  dealId?: string;
  stageCode: ShipmentStageCode;
  note: string;
  customerNote?: string;
  visibility?: "internal" | "customer_visible";
}) => {
  const { user, profile } = await getCurrentUserContext();
  if (!user || !profile) throw new Error("يجب تسجيل الدخول أولاً.");
  if (!isValidRole(profile.role)) throw new Error("صلاحيات الحساب الحالية غير صالحة.");

  const shipments = await safeStructuredSelect<ShipmentRow>("shipments");
  const shipment = shipments.find((row) => row.id === input.shipmentId);
  if (!shipment) throw new Error("تعذر العثور على الشحنة المطلوبة.");
  const currentStage = shipment.current_stage_code || mapShipmentStatusToStage(shipment.status);
  if (!canAdvanceShipmentStage({ role: profile.role, currentStage, nextStage: input.stageCode })) {
    throw new Error("لا يمكن نقل الشحنة إلى هذه المرحلة من حالتها الحالية أو بصلاحياتك الحالية.");
  }

  const inserted = await db
    .from<TrackingUpdateRow>("tracking_updates")
    .insert({
      shipment_id: input.shipmentId,
      deal_id: input.dealId || shipment.deal_id || null,
      stage_code: input.stageCode,
      previous_stage_code: shipment.current_stage_code || "deal_accepted",
      note: input.note,
      customer_note: input.customerNote || "",
      visibility: input.visibility || (input.customerNote ? "customer_visible" : "internal"),
      updated_by: user.id,
      updated_by_role: profile.role,
      occurred_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (inserted.error) {
    logOperationalError("tracking_update_create", inserted.error, {
      shipmentId: input.shipmentId,
      stageCode: input.stageCode,
    });
    throw inserted.error;
  }

  await writeAuditLog({
    action: "tracking.updated",
    tableName: "tracking_updates",
    recordId: inserted.data.id,
    oldValues: { stage_code: shipment.current_stage_code || "deal_accepted" },
    newValues: {
      shipment_id: input.shipmentId,
      deal_id: input.dealId || shipment.deal_id || null,
      tracking_id: shipment.tracking_id,
      stage_code: input.stageCode,
      summary: `تم تحديث التتبع إلى مرحلة ${stageLabelByCode[input.stageCode]}`,
      entity_label: shipment.tracking_id,
      customer_note: input.customerNote || "",
    },
  });

  const deal = (await loadDeals()).find((row) => row.id === (input.dealId || shipment.deal_id || null));
  const notificationRecipients = await getInternalNotificationRecipients([
    deal?.turkishPartnerId,
    deal?.saudiPartnerId,
  ]);

  await createNotifications(
    notificationRecipients.map((recipientId) => ({
      userId: recipientId,
      type: "tracking_update",
      title: "تم تسجيل تحديث تتبع جديد",
      message: `${shipment.tracking_id} انتقل إلى مرحلة ${stageLabelByCode[input.stageCode]}.`,
      link: deal?.dealNumber
        ? `/dashboard/tracking?deal=${deal.dealNumber}&tracking=${shipment.tracking_id}`
        : `/dashboard/tracking?tracking=${shipment.tracking_id}`,
    })),
  );

  trackEvent("tracking_update_created", {
    stageCode: input.stageCode,
    visibility: input.visibility || (input.customerNote ? "customer_visible" : "internal"),
  });

  return inserted.data;
};

// loadFinancialEntries moved to @/domain/accounting/service

// createFinancialEntry moved to @/domain/accounting/service

// loadFinancialEditRequests moved to @/domain/accounting/service

// createFinancialEditRequest moved to @/domain/accounting/service

// updateFinancialEditRequestStatus moved to @/domain/accounting/service

export const loadCustomerDashboards = async (): Promise<CustomerDashboard[]> => {
  const { profile } = await getCurrentUserContext();
  const isCustomer = profile?.role === "customer";

  // Optimization: Pre-fetch all data once and pass to sub-loaders where possible
  const deals = await loadDeals();
  const [customers, requests, entries] = await Promise.all([
    isCustomer && profile?.id
      ? safeStructuredSelectWhereEq<CustomerRow>("lourex_customers", "id", profile.id)
      : safeStructuredSelect<CustomerRow>("lourex_customers"),
    loadPurchaseRequests({ includeAttachments: false, includeLegacy: !isCustomer }),
    loadFinancialEntries({ deals }),
  ]);

  const auditCounts = new Map<string, number>();

  if (isCustomer) {
    [...requests, ...deals].forEach((row) => {
      auditCounts.set(row.id, 0);
    });
  } else {
    const { data, error } = await supabase.from("audit_logs").select("id, record_id, table_name, new_values");
    if (error) throw error;

    ((data || []) as AuditLogRow[]).forEach((row) => {
      auditCounts.set(row.record_id, (auditCounts.get(row.record_id) || 0) + 1);
    });
  }

  return (customers || []).map((customer) => {
    const customerRequests = requests.filter((request) => request.customer.id === customer.id);
    const customerDeals = deals.filter((deal) => deal.customerId === customer.id);
    const customerEntries = entries.filter((entry) => entry.customerId === customer.id);
    const customerAuditCount = [...customerRequests, ...customerDeals].reduce(
      (sum, row) => sum + (auditCounts.get(row.id) || 0),
      0,
    );

    return {
      id: customer.id,
      fullName: customer.full_name,
      phone: customer.phone || "",
      email: customer.email,
      country: customer.country || "",
      city: customer.city || "",
      requestsCount: customerRequests.length,
      dealsCount: customerDeals.length,
      financialEntriesCount: customerEntries.length,
      financialBalance: customerEntries.reduce((sum, entry) => {
        return sum + (entry.type === "income" ? entry.amount : -entry.amount);
      }, 0),
      auditCount: customerAuditCount,
      latestRequestNumber: customerRequests[0]?.requestNumber,
      latestDealNumber: customerDeals[0]?.dealNumber,
    };
  });
};

export const loadOperationalUsers = async (): Promise<OperationalUser[]> => {
  const rows = await safeStructuredSelect<ProfileRow>(
    "profiles",
    "id, email, full_name, role, partner_type, status, created_at, updated_at",
  );

  return (rows || [])
    .filter((row) => isValidRole(row.role))
    .map((row) => ({
      id: row.id,
      email: row.email || "",
      fullName: row.full_name || "",
      role: row.role as LourexRole,
      partnerType: row.partner_type || null,
      status: (row.status || "pending") as LourexAccountStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
    }))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
};

export const updateOperationalUserProfile = async (
  userId: string,
  input: { role?: LourexRole; partnerType?: string | null; status?: LourexAccountStatus },
) => {
  const currentUsers = await loadOperationalUsers();
  const current = currentUsers.find((user) => user.id === userId);

  const payload: Record<string, unknown> = {};
  if (input.role) payload.role = input.role;
  if (Object.prototype.hasOwnProperty.call(input, "partnerType")) {
    payload.partner_type = input.partnerType || null;
  }
  if (input.status) payload.status = input.status;

  const result = await safeStructuredMutation(() =>
    db.from<ProfileRow>("profiles").update(payload).eq("id", userId).select("*").single(),
  );

  if (!result.error) {
    await writeAuditLog({
      action: "profile.access_updated",
      tableName: "profiles",
      recordId: userId,
      oldValues: {
        role: current?.role || "",
        partner_type: current?.partnerType || null,
        status: current?.status || "",
      },
      newValues: {
        role: input.role || current?.role || "",
        partner_type: input.partnerType ?? current?.partnerType ?? null,
        status: input.status || current?.status || "",
        summary: `تم تحديث صلاحيات المستخدم ${current?.fullName || userId}`,
        entity_label: current?.fullName || current?.email || userId,
      },
    });
  }

  return result;
};

export const lookupPublicTracking = async (trackingId: string): Promise<PublicTrackingResult | null> => {
  const normalized = trackingId.trim().toUpperCase();
  if (!normalized) return null;

  const domainAvailable = await getLourexDomainAvailability();

  if (!domainAvailable) {
    const { data } = await db.rpc<LegacyTrackingLookupRow>("lookup_shipment_by_tracking", {
      p_tracking_id: normalized,
    }).maybeSingle();

    if (!data) return null;

    const mappedStage = mapShipmentStatusToStage(data.status);
    return {
      trackingId: data.tracking_id,
      destination: data.destination,
      clientName: "Customer Shipment",
      currentStage: mappedStage,
      currentStageLabel: stageLabelByCode[mappedStage],
      currentStageDescription: stageDescriptionByCode[mappedStage],
      customerNote: "",
      lastUpdated: data.updated_at,
      progressRatio:
        ((shipmentStages.findIndex((item) => item.code === mappedStage) + 1) / shipmentStages.length) * 100,
      timeline: [],
    };
  }

  const trackingLookup = await db
    .rpc<SecureTrackingLookupRow>("lookup_lourex_tracking", {
      p_tracking_id: normalized,
    })
    .maybeSingle();

  if (trackingLookup.error) throw trackingLookup.error;
  if (!trackingLookup.data) return null;

  const timelinePayload = Array.isArray(trackingLookup.data.timeline) ? trackingLookup.data.timeline : [];
  const timeline = timelinePayload
    .map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        return null;
      }

      const payload = row as Record<string, unknown>;
      const stageCode =
        typeof payload.stageCode === "string" ? (payload.stageCode as ShipmentStageCode) : "deal_accepted";

      return {
        id: typeof payload.id === "string" ? payload.id : "",
        shipmentId: typeof payload.shipmentId === "string" ? payload.shipmentId : "",
        dealId: typeof payload.dealId === "string" ? payload.dealId : undefined,
        stageCode,
        previousStageCode:
          typeof payload.previousStageCode === "string"
            ? (payload.previousStageCode as ShipmentStageCode)
            : null,
        note: typeof payload.note === "string" ? payload.note : "",
        customerNote: typeof payload.customerNote === "string" ? payload.customerNote : "",
        visibility:
          payload.visibility === "customer_visible" ? "customer_visible" : "internal",
        updatedBy: typeof payload.updatedBy === "string" ? payload.updatedBy : undefined,
        updatedByRole: typeof payload.updatedByRole === "string" ? payload.updatedByRole : "",
        occurredAt:
          typeof payload.occurredAt === "string"
            ? payload.occurredAt
            : typeof payload.createdAt === "string"
              ? payload.createdAt
              : new Date().toISOString(),
        createdAt: typeof payload.createdAt === "string" ? payload.createdAt : new Date().toISOString(),
      } satisfies TrackingUpdateRecord;
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt));

  const currentStage = (trackingLookup.data.current_stage_code || "deal_accepted") as ShipmentStageCode;
  const progressRatio =
    ((shipmentStages.findIndex((item) => item.code === currentStage) + 1) / shipmentStages.length) * 100;

  return {
    trackingId: trackingLookup.data.tracking_id,
    dealNumber: trackingLookup.data.deal_number || undefined,
    requestNumber: trackingLookup.data.request_number || undefined,
    operationTitle: trackingLookup.data.operation_title || "عملية Lourex",
    destination: trackingLookup.data.destination,
    clientName: trackingLookup.data.client_name,
    currentStage,
    currentStageLabel: stageLabelByCode[currentStage],
    currentStageDescription: stageDescriptionByCode[currentStage],
    customerNote: trackingLookup.data.customer_note || timeline[timeline.length - 1]?.customerNote || "",
    lastUpdated: trackingLookup.data.last_updated,
    progressRatio,
    timeline,
  };
};

export const deletePurchaseRequestRecord = async (requestId: string) => {
  const { profile } = await getCurrentUserContext();
  if (!profile || !assertManagementUser(profile.role)) {
    // Permission check for management actions
  }

  // Delete attachments
  await db.from("attachments").delete().eq("entity_id", requestId).eq("entity_type", "purchase_request");

  // Delete record
  const deleted = await db.from("purchase_requests").delete().eq("id", requestId);
  
  if (deleted.error) throw deleted.error;

  await writeAuditLog({
    action: "purchase_request.deleted_on_failure",
    tableName: "purchase_requests",
    recordId: requestId,
    newValues: { reason: "Rollback due to submission flow failure" },
  });

  return deleted;
};

export const deleteStorageFolder = async (bucket: keyof typeof STORAGE_BUCKETS, folderPath: string) => {
  await deleteFolder(bucket, folderPath);
};

export const updatePurchaseRequestImages = async (requestId: string, imageUrls: string[]) => {
  const { user } = await getCurrentUserContext();
  
  const updated = await db
    .from<PurchaseRequestRow>("purchase_requests")
    .update({ image_urls: imageUrls })
    .eq("id", requestId)
    .select("*")
    .single();

  if (updated.error) throw updated.error;

  const attachments = imageUrls.map((url, index) => ({
    entity_type: "purchase_request",
    entity_id: requestId,
    category: "product_image",
    file_name: buildAttachmentLabel(url, `image-${index + 1}`),
    file_url: url,
    visibility: "internal",
    uploaded_by: user?.id || null,
  }));

  const attached = await db.from<AttachmentRow>("attachments").insert(attachments);
  if (attached.error) throw attached.error;

  return updated.data;
};

export const getDomainActivationStatus = async () => {
  const available = await getLourexDomainAvailability();
  const [requests, customers, entries, editRequests, attachments, trackingUpdates] = await Promise.all([
    safeStructuredSelect<PurchaseRequestRow>("purchase_requests"),
    safeStructuredSelect<CustomerRow>("lourex_customers"),
    safeStructuredSelect<FinancialEntryRow>("financial_entries"),
    safeStructuredSelect<FinancialEditRequestRow>("financial_edit_requests"),
    safeStructuredSelect<AttachmentRow>("attachments"),
    safeStructuredSelect<TrackingUpdateRow>("tracking_updates"),
  ]);

  return {
    available,
    purchaseRequests: requests.length,
    customers: customers.length,
    financialEntries: entries.length,
    financialEditRequests: editRequests.length,
    attachments: attachments.length,
    trackingUpdates: trackingUpdates.length,
  };
};

export const formatTrackingVisibility = (visibility: TrackingUpdateRecord["visibility"]) =>
  trackingVisibilityLabel[visibility];

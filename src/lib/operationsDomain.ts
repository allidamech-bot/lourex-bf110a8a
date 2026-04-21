import { parsePurchaseRequestMessage } from "@/features/purchase-requests/lib";
import { supabase } from "@/integrations/supabase/client";
import { shipmentStages } from "@/lib/shipmentStages";
import { mapShipmentStatusToStage } from "@/lib/trackingStageMap";
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

const db = supabase as any;

let lourexDomainAvailable: boolean | null = null;

const isMissingSchemaError = (error: any) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("relation") ||
    message.includes("column")
  );
};

const getLourexDomainAvailability = async () => {
  if (lourexDomainAvailable !== null) return lourexDomainAvailable;

  const { error } = await db.from("purchase_requests").select("id").limit(1);
  lourexDomainAvailable = !error || !isMissingSchemaError(error);
  return lourexDomainAvailable;
};

const safeStructuredSelect = async <T = any>(table: string, query?: string) => {
  const available = await getLourexDomainAvailability();
  if (!available) return [] as T[];

  const builder = query ? db.from(table).select(query) : db.from(table).select("*");
  const { data, error } = await builder;
  if (error && isMissingSchemaError(error)) return [] as T[];
  if (error) throw error;
  return (data as T[]) || [];
};

const safeStructuredMutation = async <T = any>(runner: () => Promise<{ data?: T; error?: any }>) => {
  const available = await getLourexDomainAvailability();
  if (!available) return { data: null as T | null, error: null };

  const result = await runner();
  if (result.error && isMissingSchemaError(result.error)) {
    return { data: null as T | null, error: null };
  }

  return result;
};

const requestNumberFromLegacyMessage = (message?: string | null, id?: string) =>
  message?.split("\n").find((line) => line.startsWith("Request Number:"))?.split(":")[1]?.trim() || `PR-${id?.slice(0, 8) || "LEGACY"}`;

const parseNoteLine = (notes: string | null | undefined, label: string) =>
  notes?.split("\n").find((line) => line.startsWith(`${label}:`))?.split(":")[1]?.trim() || "";

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
  role: string;
  partnerType: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const getCurrentUserContext = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, partner_type, status")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile };
};

const writeAuditLog = async (entry: {
  action: string;
  tableName: string;
  recordId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}) => {
  const { user, profile } = await getCurrentUserContext();

  await supabase.from("audit_logs").insert({
    action: entry.action,
    table_name: entry.tableName,
    record_id: entry.recordId,
    changed_by: user?.id || null,
    old_values: entry.oldValues || null,
    new_values: {
      actor_label: profile?.full_name || user?.email || "System",
      actor_role: profile?.role || null,
      ...entry.newValues,
    },
  });
};

const INTERNAL_NOTIFICATION_ROLES = ["owner", "operations_employee", "turkish_partner", "saudi_partner"] as const;

const createNotifications = async (
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

const getInternalNotificationRecipients = async (extraUserIds: Array<string | null | undefined> = []) => {
  const profiles = await safeStructuredSelect<any>(
    "profiles",
    "id, role, status",
  );

  const internalUsers = (profiles || []).filter(
    (profile) => INTERNAL_NOTIFICATION_ROLES.includes(profile.role) && profile.status === "active",
  );

  return Array.from(
    new Set([...internalUsers.map((profile) => profile.id), ...extraUserIds.filter(Boolean)]),
  );
};

const mapAttachment = (row: any): AttachmentRecord => ({
  id: row.id,
  entityType: row.entity_type,
  entityId: row.entity_id,
  category: row.category || "reference",
  fileName: row.file_name || buildAttachmentLabel(row.file_url || "", "attachment"),
  fileUrl: row.file_url,
  bucketName: row.bucket_name || "product-images",
  storagePath: row.storage_path || "",
  visibility: row.visibility || "internal",
  createdAt: row.created_at,
});

const mapTrackingUpdate = (row: any): TrackingUpdateRecord => ({
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
}) => {
  const inserted = await safeStructuredMutation<any>(() =>
    db
      .from("purchase_requests")
      .insert({
        request_number: input.requestNumber,
        status: "intake_submitted",
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
      })
      .select("*")
      .single(),
  );

  if (inserted.error || !inserted.data || input.imageUrls.length === 0) {
    return inserted;
  }

  const attachments = input.imageUrls.map((url, index) => ({
    entity_type: "purchase_request",
    entity_id: inserted.data.id,
    category: "product_image",
    file_name: buildAttachmentLabel(url, `image-${index + 1}`),
    file_url: url,
    visibility: "internal",
  }));

  const { error: attachmentError } = await safeStructuredMutation(() =>
    db.from("attachments").insert(attachments),
  );

  return { data: inserted.data, error: attachmentError || null };
};

const mapExplicitRequest = (
  row: any,
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
  sourceInquiryId: row.source_inquiry_id,
  convertedDealId: row.converted_deal_id || null,
  convertedDealNumber: row.converted_deal_number || null,
  isLegacyFallback: false,
  internalNotes: row.internal_notes || "",
  reviewedAt: row.last_reviewed_at || null,
  attachments: attachmentsMap.get(`purchase_request:${row.id}`) || [],
});

export const loadPurchaseRequests = async (): Promise<OperationalPurchaseRequest[]> => {
  const [explicitRows, attachmentRows, { data: legacyRows }, { data: conversions }] = await Promise.all([
    safeStructuredSelect<any>("purchase_requests"),
    safeStructuredSelect<any>("attachments"),
    supabase
      .from("inquiries")
      .select("id, name, email, phone, company, message, created_at")
      .eq("inquiry_type", "purchase_request")
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("record_id, new_values")
      .eq("action", "purchase_request.converted_to_deal")
      .order("created_at", { ascending: false }),
  ]);

  const attachmentsMap = getAttachmentMap((attachmentRows || []).map(mapAttachment));

  const conversionMap = new Map<string, { dealId?: string; dealNumber?: string }>();
  ((conversions as any[]) || []).forEach((row) => {
    conversionMap.set(row.record_id, {
      dealId: row.new_values?.deal_id,
      dealNumber: row.new_values?.deal_number,
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

  const legacy = ((legacyRows as any[]) || [])
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
  const { user } = await getCurrentUserContext();
  const currentRows = await safeStructuredSelect<any>("purchase_requests");
  const current = currentRows.find((row) => row.id === requestId);

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

  if (!result.error) {
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
  const currentRows = await safeStructuredSelect<any>("purchase_requests");
  const current = currentRows.find((row) => row.id === requestId);

  const result = await safeStructuredMutation(() =>
    db
      .from("purchase_requests")
      .update({
        internal_notes: internalNotes,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId),
  );

  if (!result.error) {
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
  const { user } = await getCurrentUserContext();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً.");

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
      .from("purchase_requests")
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

  const insertedDeal = await db
    .from("deals")
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
      notes: options?.operationalNotes || request.internalNotes || `Source Request: ${request.requestNumber}`,
      assigned_turkish_partner_id: options?.turkishPartnerId || null,
      assigned_saudi_partner_id: options?.saudiPartnerId || null,
    })
    .select("*")
    .single();

  if (insertedDeal.error) throw insertedDeal.error;

  const insertedShipment = await db
    .from("shipments")
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

  await db.from("deals").update({ shipment_id: insertedShipment.data.id }).eq("id", insertedDeal.data.id);

  await db
    .from("purchase_requests")
    .update({
      status: "converted_to_deal",
      customer_id: customer.id,
      converted_deal_id: insertedDeal.data.id,
    })
    .eq("id", requestId);

  if (request.attachments.length > 0) {
    await db.from("attachments").insert(
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

  await db.from("tracking_updates").insert({
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

  return {
    dealId: insertedDeal.data.id as string,
    dealNumber,
    trackingId: trackingNumber,
  };
};

export const loadTrackingUpdates = async (): Promise<TrackingUpdateRecord[]> => {
  const rows = await safeStructuredSelect<any>("tracking_updates");
  return (rows || []).map(mapTrackingUpdate).sort((a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt));
};

export const loadDeals = async (): Promise<OperationalDeal[]> => {
  const [{ data: deals }, requests, customers, shipments, attachmentRows, trackingRows, entryRows, profileRows] =
    await Promise.all([
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      safeStructuredSelect<any>("purchase_requests", "id, request_number, converted_deal_id"),
      safeStructuredSelect<any>("lourex_customers"),
      safeStructuredSelect<any>("shipments"),
      safeStructuredSelect<any>("attachments"),
      safeStructuredSelect<any>("tracking_updates"),
      safeStructuredSelect<any>("financial_entries"),
      safeStructuredSelect<any>("profiles", "id, full_name"),
    ]);

  const requestMap = new Map<string, any>((requests || []).map((row) => [row.id, row]));
  const customerMap = new Map<string, any>((customers || []).map((row) => [row.id, row]));
  const shipmentMap = new Map<string, any>((shipments || []).map((row) => [row.id, row]));
  const shipmentByDealId = new Map<string, any>((shipments || []).map((row) => [row.deal_id, row]));
  const attachmentsMap = getAttachmentMap((attachmentRows || []).map(mapAttachment));
  const trackingUpdates = (trackingRows || []).map(mapTrackingUpdate);
  const trackingMap = getTrackingMap(trackingUpdates);
  const profileMap = new Map<string, any>((profileRows || []).map((row) => [row.id, row]));

  return ((deals as any[]) || []).map((row) => {
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
      trackingUpdates: shipment?.id ? trackingMap.get(shipment.id) || [] : [],
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
    db.from("deals").update(payload).eq("id", dealId).select("*").single(),
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

export const uploadDealAttachment = async (input: {
  dealId: string;
  dealNumber: string;
  file: File;
  category?: string;
  visibility?: "internal" | "customer_visible";
}) => {
  const { user, profile } = await getCurrentUserContext();
  if (!user || !profile) throw new Error("يجب تسجيل الدخول أولاً.");
  if (!INTERNAL_NOTIFICATION_ROLES.includes(profile.role as (typeof INTERNAL_NOTIFICATION_ROLES)[number])) {
    throw new Error("صلاحياتك الحالية لا تسمح بإضافة مرفقات الصفقة.");
  }

  const filePath = `deal-attachments/${input.dealNumber}/${Date.now()}-${input.file.name}`;
  const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, input.file);
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(filePath);
  const inserted = await db
    .from("attachments")
    .insert({
      entity_type: "deal",
      entity_id: input.dealId,
      category: input.category || "reference",
      file_name: input.file.name,
      file_url: publicUrl.publicUrl,
      bucket_name: "product-images",
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
  const [shipments, deals, trackingRows] = await Promise.all([
    safeStructuredSelect<any>("shipments"),
    loadDeals(),
    safeStructuredSelect<any>("tracking_updates"),
  ]);

  const dealMap = new Map(deals.map((deal) => [deal.id, deal]));
  const trackingMap = getTrackingMap((trackingRows || []).map(mapTrackingUpdate));

  return (shipments || []).map((row) => ({
    id: row.id,
    trackingId: row.tracking_id,
    clientName: row.client_name,
    destination: row.destination,
    dealId: row.deal_id,
    dealNumber: row.deal_id ? dealMap.get(row.deal_id)?.dealNumber : undefined,
    stage: row.current_stage_code || mapShipmentStatusToStage(row.status),
    updatedAt: row.updated_at,
    customerVisibleNote: row.customer_visible_note || "",
    timeline: trackingMap.get(row.id) || [],
  }));
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

  const shipments = await safeStructuredSelect<any>("shipments");
  const shipment = shipments.find((row) => row.id === input.shipmentId);
  if (!shipment) throw new Error("تعذر العثور على الشحنة المطلوبة.");

  const inserted = await db
    .from("tracking_updates")
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

  if (inserted.error) throw inserted.error;

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

  return inserted.data;
};

export const loadFinancialEntries = async (): Promise<FinancialEntry[]> => {
  const [entries, deals, customers] = await Promise.all([
    safeStructuredSelect<any>("financial_entries"),
    loadDeals(),
    safeStructuredSelect<any>("lourex_customers"),
  ]);

  const dealMap = new Map(deals.map((deal) => [deal.id, deal]));
  const customerMap = new Map((customers || []).map((row) => [row.id, row]));

  return (entries || [])
    .map((row) => {
      const relationType = (row.relation_type ||
        (row.deal_id ? "deal_linked" : row.customer_id ? "customer_linked" : "general")) as FinancialEntry["relationType"];

      return {
        id: row.id,
        entryNumber: row.entry_number,
        scope: relationType === "deal_linked" ? "deal" : relationType === "customer_linked" ? "customer" : "global",
        relationType,
        dealId: row.deal_id || undefined,
        dealNumber: row.deal_id ? dealMap.get(row.deal_id)?.dealNumber : undefined,
        customerId: row.customer_id || undefined,
        customerName: row.customer_id ? customerMap.get(row.customer_id)?.full_name : undefined,
        type: row.type,
        amount: Number(row.amount || 0),
        currency: row.currency || "SAR",
        locked: Boolean(row.locked),
        createdBy: row.created_by || "",
        createdAt: row.created_at,
        entryDate: row.entry_date || row.created_at,
        method: row.method || "",
        counterparty: row.counterparty || "",
        category: row.category || "",
        referenceLabel: row.reference_label || "",
        note: row.note || "",
      } satisfies FinancialEntry;
    })
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
};

export const createFinancialEntry = async (input: {
  dealId?: string;
  customerId?: string;
  type: "income" | "expense";
  scope: "deal_linked" | "global" | "customer_linked";
  amount: number;
  currency: string;
  note: string;
  method: string;
  counterparty: string;
  category: string;
  entryDate: string;
  referenceLabel?: string;
}) => {
  const { user } = await getCurrentUserContext();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً.");
  if (!(await getLourexDomainAvailability())) throw new Error("يجب تفعيل مخطط Lourex الجديد أولاً في Supabase.");

  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("يجب أن يكون مبلغ القيد أكبر من صفر.");
  if (!input.entryDate) throw new Error("تاريخ القيد المالي مطلوب.");
  if (!input.note.trim() || !input.method.trim() || !input.counterparty.trim() || !input.category.trim()) {
    throw new Error("يجب استكمال الحقول المحاسبية الأساسية قبل حفظ القيد.");
  }

  const entryNumber = `FE-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
  const relationType =
    input.scope === "deal_linked" ? "deal_linked" : input.scope === "customer_linked" ? "customer_linked" : "general";

  const inserted = await db
    .from("financial_entries")
    .insert({
      entry_number: entryNumber,
      deal_id: input.dealId || null,
      customer_id: input.customerId || null,
      type: input.type,
      scope: input.scope === "global" ? "global" : "deal_linked",
      relation_type: relationType,
      amount: input.amount,
      currency: input.currency,
      note: input.note,
      entry_date: input.entryDate,
      method: input.method,
      counterparty: input.counterparty,
      category: input.category,
      reference_label: input.referenceLabel || "",
      created_by: user.id,
      locked: true,
    })
    .select("*")
    .single();

  if (inserted.error) throw inserted.error;

  await writeAuditLog({
    action: "financial_entry.created",
    tableName: "financial_entries",
    recordId: inserted.data.id,
    newValues: {
      entry_number: entryNumber,
      deal_id: input.dealId || null,
      customer_id: input.customerId || null,
      amount: input.amount,
      currency: input.currency,
      type: input.type,
      summary: `إنشاء قيد مالي ${entryNumber}`,
      entity_label: entryNumber,
    },
  });

  return inserted.data;
};

export const loadFinancialEditRequests = async (): Promise<FinancialEditRequest[]> => {
  const [rows, entries, deals, customers, profiles] = await Promise.all([
    safeStructuredSelect<any>("financial_edit_requests"),
    loadFinancialEntries(),
    loadDeals(),
    safeStructuredSelect<any>("lourex_customers"),
    safeStructuredSelect<any>("profiles", "id, full_name"),
  ]);

  const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
  const dealMap = new Map(deals.map((deal) => [deal.id, deal]));
  const customerMap = new Map((customers || []).map((row) => [row.id, row]));
  const profileMap = new Map((profiles || []).map((row) => [row.id, row]));

  return (rows || [])
    .map((row) => ({
      id: row.id,
      financialEntryId: row.financial_entry_id,
      targetEntryNumber: row.financial_entry_id ? entryMap.get(row.financial_entry_id)?.entryNumber || "" : "",
      dealId: row.deal_id || undefined,
      dealNumber: row.deal_id ? dealMap.get(row.deal_id)?.dealNumber : undefined,
      customerId: row.customer_id || undefined,
      customerName: row.customer_id ? customerMap.get(row.customer_id)?.full_name : undefined,
      requestedBy: row.requested_by_name,
      requestedByEmail: row.requested_by_email,
      reason: row.reason,
      status: row.status,
      submittedAt: row.created_at,
      reviewedAt: row.reviewed_at || null,
      reviewerName: row.reviewer_id ? profileMap.get(row.reviewer_id)?.full_name || "" : "",
      reviewNote: row.review_note || "",
      oldValue: row.old_value || {},
      proposedValue: row.proposed_value || {},
    }))
    .sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));
};

export const createFinancialEditRequest = async (input: {
  financialEntryId: string;
  dealId?: string;
  customerId?: string;
  requester: string;
  email: string;
  reason: string;
  oldValue: Record<string, unknown>;
  proposedValue: Record<string, unknown>;
}) => {
  const { user } = await getCurrentUserContext();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً.");
  if (!(await getLourexDomainAvailability())) throw new Error("يجب تفعيل مخطط Lourex الجديد أولاً في Supabase.");

  const inserted = await db
    .from("financial_edit_requests")
    .insert({
      financial_entry_id: input.financialEntryId,
      deal_id: input.dealId || null,
      customer_id: input.customerId || null,
      requested_by_name: input.requester,
      requested_by_email: input.email,
      reason: input.reason,
      old_value: input.oldValue,
      proposed_value: input.proposedValue,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (inserted.error) throw inserted.error;

  await writeAuditLog({
    action: "financial_entry.edit_requested",
    tableName: "financial_edit_requests",
    recordId: inserted.data.id,
    newValues: {
      financial_entry_id: input.financialEntryId,
      deal_id: input.dealId || null,
      customer_id: input.customerId || null,
      summary: "تم إنشاء طلب تعديل مالي",
      entity_label: input.financialEntryId,
      reason: input.reason,
    },
  });

  const recipients = await getInternalNotificationRecipients();
  await createNotifications(
    recipients.map((recipientId) => ({
      userId: recipientId,
      type: "financial_edit_request",
      title: "تم رفع طلب تعديل مالي",
      message: `يوجد طلب تعديل جديد على القيد ${input.financialEntryId}.`,
      link: input.dealId ? `/dashboard/edit-requests?deal=${input.dealId}` : "/dashboard/edit-requests",
    })),
  );

  return inserted.data;
};

export const updateFinancialEditRequestStatus = async (
  id: string,
  status: "approved" | "rejected",
  reviewNote?: string,
) => {
  const { user } = await getCurrentUserContext();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً.");
  if (!(await getLourexDomainAvailability())) throw new Error("يجب تفعيل مخطط Lourex الجديد أولاً في Supabase.");

  const currentRows = await safeStructuredSelect<any>("financial_edit_requests");
  const current = currentRows.find((row) => row.id === id);

  const updated = await db
    .from("financial_edit_requests")
    .update({
      status,
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote || "",
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updated.error) throw updated.error;

  await writeAuditLog({
    action: `financial_edit_request.${status}`,
    tableName: "financial_edit_requests",
    recordId: id,
    oldValues: { status: current?.status || "pending" },
    newValues: {
      status,
      financial_entry_id: updated.data.financial_entry_id,
      deal_id: updated.data.deal_id,
      review_note: reviewNote || "",
      summary: status === "approved" ? "تمت الموافقة على طلب تعديل مالي" : "تم رفض طلب تعديل مالي",
      entity_label: updated.data.financial_entry_id || id,
    },
  });

  const recipients = await getInternalNotificationRecipients([current?.created_by]);
  await createNotifications(
    recipients.map((recipientId) => ({
      userId: recipientId,
      type: "financial_edit_request_review",
      title: status === "approved" ? "تمت الموافقة على طلب التعديل" : "تم رفض طلب التعديل",
      message:
        status === "approved"
          ? `تمت الموافقة على طلب تعديل القيد ${updated.data.financial_entry_id}.`
          : `تم رفض طلب تعديل القيد ${updated.data.financial_entry_id}.`,
      link: updated.data.deal_id ? `/dashboard/edit-requests?deal=${updated.data.deal_id}` : "/dashboard/edit-requests",
    })),
  );

  return updated.data;
};

export const loadCustomerDashboards = async (): Promise<CustomerDashboard[]> => {
  const [customers, requests, deals, entries, audits] = await Promise.all([
    safeStructuredSelect<any>("lourex_customers"),
    loadPurchaseRequests(),
    loadDeals(),
    loadFinancialEntries(),
    supabase.from("audit_logs").select("id, record_id, table_name, new_values"),
  ]);

  return (customers || []).map((customer) => {
    const customerRequests = requests.filter(
      (request) => request.customer.id === customer.id || request.customer.email === customer.email,
    );
    const customerDeals = deals.filter(
      (deal) => deal.customerId === customer.id || deal.customerEmail === customer.email,
    );
    const customerEntries = entries.filter(
      (entry) => entry.customerId === customer.id || entry.customerName === customer.full_name,
    );
    const customerAuditCount = ((audits.data as any[]) || []).filter((row) => {
      const json = row.new_values || {};
      return json.customer_id === customer.id || json.customer_name === customer.full_name;
    }).length;

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
  const rows = await safeStructuredSelect<any>(
    "profiles",
    "id, email, full_name, role, partner_type, status, created_at, updated_at",
  );

  return (rows || [])
    .map((row) => ({
      id: row.id,
      email: row.email || "",
      fullName: row.full_name || "",
      role: row.role || "customer",
      partnerType: row.partner_type || null,
      status: row.status || "pending",
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
    }))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
};

export const updateOperationalUserProfile = async (
  userId: string,
  input: { role?: string; partnerType?: string | null; status?: string },
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
    db.from("profiles").update(payload).eq("id", userId).select("*").single(),
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
    const { data } = await supabase.rpc("lookup_shipment_by_tracking" as any, {
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

  const shipmentQuery = await db.from("shipments").select("*").eq("tracking_id", normalized).maybeSingle();
  if (shipmentQuery.error) throw shipmentQuery.error;
  if (!shipmentQuery.data) return null;

  const shipment = shipmentQuery.data;
  const [deals, requests, trackingRows] = await Promise.all([
    loadDeals(),
    loadPurchaseRequests(),
    safeStructuredSelect<any>("tracking_updates"),
  ]);

  const deal = deals.find((row) => row.id === shipment.deal_id) || null;
  const request = requests.find((row) => row.id === deal?.sourceRequestId) || null;
  const timeline = (trackingRows || [])
    .map(mapTrackingUpdate)
    .filter((row) => row.shipmentId === shipment.id && (row.visibility === "customer_visible" || row.customerNote))
    .sort((a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt));

  const currentStage = (shipment.current_stage_code || mapShipmentStatusToStage(shipment.status)) as ShipmentStageCode;
  const progressRatio =
    ((shipmentStages.findIndex((item) => item.code === currentStage) + 1) / shipmentStages.length) * 100;

  return {
    trackingId: shipment.tracking_id,
    dealNumber: deal?.dealNumber,
    requestNumber: request?.requestNumber,
    operationTitle: deal?.operationTitle || request?.productName || "عملية Lourex",
    destination: shipment.destination,
    clientName: shipment.client_name,
    currentStage,
    currentStageLabel: stageLabelByCode[currentStage],
    currentStageDescription: stageDescriptionByCode[currentStage],
    customerNote: shipment.customer_visible_note || timeline[timeline.length - 1]?.customerNote || "",
    lastUpdated: shipment.updated_at,
    progressRatio,
    timeline,
  };
};

export const getDomainActivationStatus = async () => {
  const available = await getLourexDomainAvailability();
  const [requests, customers, entries, editRequests, attachments, trackingUpdates] = await Promise.all([
    safeStructuredSelect<any>("purchase_requests"),
    safeStructuredSelect<any>("lourex_customers"),
    safeStructuredSelect<any>("financial_entries"),
    safeStructuredSelect<any>("financial_edit_requests"),
    safeStructuredSelect<any>("attachments"),
    safeStructuredSelect<any>("tracking_updates"),
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

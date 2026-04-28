import { supabase } from "@/integrations/supabase/client";
import type { PurchaseRequestStatus, ShipmentStageCode } from "@/types/lourex";

type JsonPayload = Record<string, unknown>;

export type AutomationEvent =
  | "purchase_request.created"
  | "purchase_request.approved"
  | "purchase_request.cancelled"
  | "payment.received"
  | "shipment.stage_changed";

export type AutomationAction =
  | {
      type: "send_notification";
      recipientIds?: string[];
      recipientRole?: "internal";
      notificationType: string;
      title: string;
      message: string;
      link?: string;
    }
  | {
      type: "create_shipment_if_missing";
      dealId: string;
      trackingId: string;
      clientName: string;
      destination: string;
      userId?: string | null;
      customerVisibleNote?: string;
      initialStage?: ShipmentStageCode;
    }
  | {
      type: "create_financial_entry_if_missing";
      idempotencyKey: string;
      dealId?: string | null;
      customerId?: string | null;
      entryType: "income" | "expense";
      scope: "deal_linked" | "global" | "customer_linked";
      amount: number;
      currency: string;
      note: string;
      method: string;
      counterparty: string;
      category: string;
      entryDate?: string;
      createdBy?: string | null;
    }
  | {
      type: "update_request_status_if_needed";
      requestId: string;
      status: PurchaseRequestStatus;
      allowedCurrentStatuses?: PurchaseRequestStatus[];
      patch?: JsonPayload;
    };

export interface AutomationRule {
  id: string;
  event: AutomationEvent;
  enabled: boolean;
  description: string;
  actions: AutomationAction[];
}

export type AutomationPayload = JsonPayload & {
  requestId?: string;
  requestNumber?: string;
  customerId?: string | null;
  customerName?: string;
  productName?: string;
  summary?: string;
  dealId?: string;
  shipmentId?: string;
  financialEntryId?: string;
};

export type AutomationActionResult = {
  action: AutomationAction["type"];
  status: "skipped" | "created" | "updated" | "sent";
  reason?: string;
  recordId?: string;
};

export type AutomationRunResult = {
  event: AutomationEvent;
  matchedRules: string[];
  actions: AutomationActionResult[];
};

const db = supabase as any;

export const automationRules: AutomationRule[] = [
  {
    id: "purchase-request-created-notify-internal",
    event: "purchase_request.created",
    enabled: true,
    description: "Notify internal users after a purchase request is created.",
    actions: [
      {
        type: "send_notification",
        recipientRole: "internal",
        notificationType: "purchase_request_created",
        title: "New purchase request submitted",
        message: "Purchase request {{requestNumber}} was submitted by {{customerName}}.",
        link: "/dashboard/requests?request={{requestId}}",
      },
    ],
  },
  {
    id: "purchase-request-approved-foundation",
    event: "purchase_request.approved",
    enabled: false,
    description: "Foundation placeholder for post-approval shipment and notification actions.",
    actions: [],
  },
  {
    id: "purchase-request-cancelled-foundation",
    event: "purchase_request.cancelled",
    enabled: false,
    description: "Foundation placeholder for cancellation notifications.",
    actions: [],
  },
  {
    id: "payment-received-foundation",
    event: "payment.received",
    enabled: false,
    description: "Foundation placeholder for payment-driven request status and accounting actions.",
    actions: [],
  },
  {
    id: "shipment-stage-changed-foundation",
    event: "shipment.stage_changed",
    enabled: false,
    description: "Foundation placeholder for shipment stage notifications.",
    actions: [],
  },
];

export const runAutomation = async (
  event: AutomationEvent,
  payload: AutomationPayload = {},
): Promise<AutomationRunResult> => {
  const matchedRules = automationRules.filter((rule) => rule.enabled && rule.event === event);
  const actions: AutomationActionResult[] = [];

  for (const rule of matchedRules) {
    for (const action of rule.actions) {
      actions.push(await executeAction(action, payload));
    }
  }

  return {
    event,
    matchedRules: matchedRules.map((rule) => rule.id),
    actions,
  };
};

export const executeAction = async (
  action: AutomationAction,
  payload: AutomationPayload = {},
): Promise<AutomationActionResult> => {
  switch (action.type) {
    case "send_notification":
      return sendNotificationIfMissing(action, payload);
    case "create_shipment_if_missing":
      return createShipmentIfMissing(action);
    case "create_financial_entry_if_missing":
      return createFinancialEntryIfMissing(action);
    case "update_request_status_if_needed":
      return updateRequestStatusIfNeeded(action);
    default:
      return {
        action: (action as AutomationAction).type,
        status: "skipped",
        reason: `Unhandled automation action for payload ${JSON.stringify(payload)}`,
      };
  }
};

const sendNotificationIfMissing = async (
  action: Extract<AutomationAction, { type: "send_notification" }>,
  payload: AutomationPayload,
): Promise<AutomationActionResult> => {
  const recipientIds = Array.from(
    new Set([
      ...(action.recipientIds || []),
      ...(action.recipientRole === "internal" ? await loadInternalRecipientIds() : []),
    ].filter(Boolean)),
  );
  if (recipientIds.length === 0) {
    return { action: action.type, status: "skipped", reason: "No recipients provided." };
  }

  const title = interpolateTemplate(action.title, payload);
  const message = interpolateTemplate(action.message, payload);
  const link = action.link ? interpolateTemplate(action.link, payload) : "";
  let sentCount = 0;

  for (const userId of recipientIds) {
    const { data: existing, error: lookupError } = await db
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", action.notificationType)
      .eq("title", title)
      .eq("link", link)
      .limit(1);

    if (lookupError) throw lookupError;
    if (existing?.length) continue;

    const { error: insertError } = await db.from("notifications").insert({
      user_id: userId,
      type: action.notificationType,
      title,
      message,
      link,
    });

    if (insertError) throw insertError;
    sentCount += 1;
  }

  return {
    action: action.type,
    status: sentCount > 0 ? "sent" : "skipped",
    reason: sentCount > 0 ? undefined : "Matching notifications already exist.",
  };
};

const loadInternalRecipientIds = async (): Promise<string[]> => {
  const { data, error } = await db
    .from("profiles")
    .select("id, role, status")
    .in("role", ["owner", "operations_employee", "turkish_partner", "saudi_partner"])
    .eq("status", "active");

  if (error) throw error;
  return (data || []).map((row: { id?: string | null }) => row.id).filter(Boolean) as string[];
};

const interpolateTemplate = (template: string, payload: AutomationPayload) =>
  Object.entries({
    requestId: payload.requestId || "",
    requestNumber: payload.requestNumber || "new request",
    customerId: payload.customerId || "",
    customerName: payload.customerName || "a customer",
    productName: payload.productName || "requested product",
    summary: payload.summary || "",
  }).reduce(
    (currentTemplate, [key, value]) => currentTemplate.split(`{{${key}}}`).join(String(value)),
    template,
  );

const createShipmentIfMissing = async (
  action: Extract<AutomationAction, { type: "create_shipment_if_missing" }>,
): Promise<AutomationActionResult> => {
  if (!action.dealId || !action.trackingId) {
    return { action: action.type, status: "skipped", reason: "dealId and trackingId are required." };
  }

  const { data: existingByDeal, error: dealLookupError } = await db
    .from("shipments")
    .select("id")
    .eq("deal_id", action.dealId)
    .limit(1);

  if (dealLookupError) throw dealLookupError;
  if (existingByDeal?.length) {
    return { action: action.type, status: "skipped", reason: "Shipment already exists for deal.", recordId: existingByDeal[0].id };
  }

  const { data: existingByTracking, error: trackingLookupError } = await db
    .from("shipments")
    .select("id")
    .eq("tracking_id", action.trackingId)
    .limit(1);

  if (trackingLookupError) throw trackingLookupError;
  if (existingByTracking?.length) {
    return {
      action: action.type,
      status: "skipped",
      reason: "Shipment already exists for tracking id.",
      recordId: existingByTracking[0].id,
    };
  }

  const { data: inserted, error: insertError } = await db
    .from("shipments")
    .insert({
      tracking_id: action.trackingId,
      client_name: action.clientName,
      destination: action.destination,
      status: "factory",
      current_stage_code: action.initialStage || "deal_accepted",
      customer_visible_note: action.customerVisibleNote || "",
      deal_id: action.dealId,
      user_id: action.userId || null,
      pallets: 0,
      weight: 0,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return { action: action.type, status: "created", recordId: inserted.id };
};

const createFinancialEntryIfMissing = async (
  action: Extract<AutomationAction, { type: "create_financial_entry_if_missing" }>,
): Promise<AutomationActionResult> => {
  if (!action.idempotencyKey) {
    return { action: action.type, status: "skipped", reason: "idempotencyKey is required." };
  }

  const { data: existing, error: lookupError } = await db
    .from("financial_entries")
    .select("id")
    .eq("reference_label", action.idempotencyKey)
    .limit(1);

  if (lookupError) throw lookupError;
  if (existing?.length) {
    return {
      action: action.type,
      status: "skipped",
      reason: "Financial entry already exists for idempotency key.",
      recordId: existing[0].id,
    };
  }

  const entryNumber = `FE-AUTO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  const { data: inserted, error: insertError } = await db
    .from("financial_entries")
    .insert({
      entry_number: entryNumber,
      deal_id: action.dealId || null,
      customer_id: action.customerId || null,
      type: action.entryType,
      scope: action.scope,
      relation_type:
        action.scope === "deal_linked" ? "deal_linked" : action.scope === "customer_linked" ? "customer_linked" : "general",
      amount: action.amount,
      currency: action.currency,
      note: action.note,
      entry_date: action.entryDate || new Date().toISOString().slice(0, 10),
      method: action.method,
      counterparty: action.counterparty,
      category: action.category,
      reference_label: action.idempotencyKey,
      created_by: action.createdBy || null,
      locked: true,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return { action: action.type, status: "created", recordId: inserted.id };
};

const updateRequestStatusIfNeeded = async (
  action: Extract<AutomationAction, { type: "update_request_status_if_needed" }>,
): Promise<AutomationActionResult> => {
  if (!action.requestId) {
    return { action: action.type, status: "skipped", reason: "requestId is required." };
  }

  const { data: request, error: lookupError } = await db
    .from("purchase_requests")
    .select("id, status")
    .eq("id", action.requestId)
    .single();

  if (lookupError) throw lookupError;
  if (!request) return { action: action.type, status: "skipped", reason: "Request not found." };
  if (request.status === action.status) {
    return { action: action.type, status: "skipped", reason: "Request already has target status.", recordId: request.id };
  }
  if (action.allowedCurrentStatuses?.length && !action.allowedCurrentStatuses.includes(request.status)) {
    return {
      action: action.type,
      status: "skipped",
      reason: "Current request status is not allowed for this automation.",
      recordId: request.id,
    };
  }

  const { error: updateError } = await db
    .from("purchase_requests")
    .update({
      ...(action.patch || {}),
      status: action.status,
    })
    .eq("id", action.requestId);

  if (updateError) throw updateError;
  return { action: action.type, status: "updated", recordId: request.id };
};

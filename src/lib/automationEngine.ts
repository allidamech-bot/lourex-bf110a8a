import { supabase } from "@/integrations/supabase/client";
import { generateTrackingId, syncShipmentStatusWithStage } from "@/lib/shipmentIdentity";
import type { LooseDomainClient } from "@/lib/operationsDomain";
import type { PurchaseRequestStatus, ShipmentStageCode } from "@/types/lourex";

type JsonPayload = Record<string, unknown>;

export type AutomationEvent =
  | "purchase_request.created"
  | "purchase_request.approved"
  | "purchase_request.cancelled"
  | "purchase_request.ready_for_conversion"
  | "payment.received"
  | "shipment.stage_changed";

export type AutomationAction =
  | {
      type: "send_notification";
      recipientIds?: string[];
      recipientRole?: "internal" | "customer";
      notificationType: string;
      title: string;
      message: string;
      link?: string;
    }
  | {
      type: "send_purchase_request_email";
    }
  | {
      type: "create_deal_if_missing";
    }
  | {
      type: "create_shipment_if_missing";
      dealId?: string;
      trackingId?: string;
      clientName?: string;
      destination?: string;
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
  customerEmail?: string;
  customerPhone?: string;
  customerCountry?: string;
  customerCity?: string;
  productName?: string;
  productDescription?: string;
  quantity?: number;
  destination?: string;
  preferredShippingMethod?: string;
  technicalSpecs?: string;
  deliveryNotes?: string;
  attachmentCount?: number;
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

const db = supabase as unknown as LooseDomainClient;

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
      {
        type: "send_purchase_request_email",
      },
    ],
  },
  {
    id: "purchase-request-approved-foundation",
    event: "purchase_request.approved",
    enabled: true,
    description: "Notify the customer after a purchase request is approved for payment or conversion.",
    actions: [
      {
        type: "send_notification",
        recipientRole: "customer",
        notificationType: "purchase_request_approved",
        title: "Purchase request approved",
        message: "Purchase request {{requestNumber}} is approved and ready for the next step.",
        link: "/customer/requests?request={{requestId}}",
      },
    ],
  },
  {
    id: "purchase-request-cancelled-foundation",
    event: "purchase_request.cancelled",
    enabled: true,
    description: "Notify the customer after a purchase request is cancelled.",
    actions: [
      {
        type: "send_notification",
        recipientRole: "customer",
        notificationType: "purchase_request_cancelled",
        title: "Purchase request cancelled",
        message: "Purchase request {{requestNumber}} was cancelled.",
        link: "/customer/requests?request={{requestId}}",
      },
    ],
  },
  {
    id: "purchase-request-ready-for-conversion-create-deal",
    event: "purchase_request.ready_for_conversion",
    enabled: true,
    description: "Create a minimal deal when a purchase request becomes ready for conversion.",
    actions: [
      { type: "create_deal_if_missing" },
      { type: "create_shipment_if_missing" },
      {
        type: "send_notification",
        recipientRole: "internal",
        notificationType: "purchase_request_ready_for_conversion",
        title: "Purchase request ready for conversion",
        message: "Purchase request {{requestNumber}} is ready for conversion.",
        link: "/dashboard/requests?request={{requestId}}",
      },
    ],
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
    case "send_purchase_request_email":
      return sendPurchaseRequestEmail(payload);
    case "create_deal_if_missing":
      return createDealIfMissing(payload);
    case "create_shipment_if_missing":
      return createShipmentIfMissing(action, payload);
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

const sendPurchaseRequestEmail = async (payload: AutomationPayload): Promise<AutomationActionResult> => {
  if (!payload.requestId && !payload.requestNumber) {
    return { action: "send_purchase_request_email", status: "skipped", reason: "requestId or requestNumber is required." };
  }

  const dashboardUrl =
    typeof window !== "undefined" && payload.requestId
      ? `${window.location.origin}/dashboard/requests?request=${encodeURIComponent(payload.requestId)}`
      : undefined;

  try {
    const response = await fetch("/api/lourex-request-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: payload.requestId,
        requestNumber: payload.requestNumber,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        customerCountry: payload.customerCountry,
        customerCity: payload.customerCity,
        productName: payload.productName,
        productDescription: payload.productDescription,
        quantity: payload.quantity,
        destination: payload.destination,
        preferredShippingMethod: payload.preferredShippingMethod,
        technicalSpecs: payload.technicalSpecs,
        deliveryNotes: payload.deliveryNotes,
        attachmentCount: payload.attachmentCount,
        dashboardUrl,
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      return {
        action: "send_purchase_request_email",
        status: "skipped",
        reason: details || `Email API failed with status ${response.status}.`,
      };
    }

    return { action: "send_purchase_request_email", status: "sent" };
  } catch (error) {
    return {
      action: "send_purchase_request_email",
      status: "skipped",
      reason: error instanceof Error ? error.message : "Unable to invoke email API route.",
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
      ...(action.recipientRole === "customer" && payload.customerId ? [payload.customerId] : []),
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
    customerEmail: payload.customerEmail || "",
    productName: payload.productName || "requested product",
    summary: payload.summary || "",
  }).reduce(
    (currentTemplate, [key, value]) => currentTemplate.split(`{{${key}}}`).join(String(value)),
    template,
  );

const createDealIfMissing = async (payload: AutomationPayload): Promise<AutomationActionResult> => {
  if (!payload.requestId) {
    return { action: "create_deal_if_missing", status: "skipped", reason: "requestId is required." };
  }
  return { action: "create_deal_if_missing", status: "skipped", reason: "Deal creation is handled by the explicit conversion flow." };
};

const createShipmentIfMissing = async (
  action: Extract<AutomationAction, { type: "create_shipment_if_missing" }>,
  payload: AutomationPayload,
): Promise<AutomationActionResult> => {
  if (!payload.requestId && !action.dealId && !payload.dealId) {
    return { action: action.type, status: "skipped", reason: "No request or deal id provided." };
  }
  return { action: action.type, status: "skipped", reason: "Shipment creation is handled after deal conversion." };
};

const createFinancialEntryIfMissing = async (
  action: Extract<AutomationAction, { type: "create_financial_entry_if_missing" }>,
): Promise<AutomationActionResult> => {
  if (!action.idempotencyKey) {
    return { action: action.type, status: "skipped", reason: "idempotencyKey is required." };
  }
  return { action: action.type, status: "skipped", reason: "Financial automation is disabled for this lightweight notification path." };
};

const updateRequestStatusIfNeeded = async (
  action: Extract<AutomationAction, { type: "update_request_status_if_needed" }>,
): Promise<AutomationActionResult> => {
  if (!action.requestId) {
    return { action: action.type, status: "skipped", reason: "requestId is required." };
  }
  return { action: action.type, status: "skipped", reason: "Status updates are handled by guarded request workflows." };
};

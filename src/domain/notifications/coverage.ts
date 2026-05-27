export type NotificationCoverageStatus = "covered" | "partial" | "pending";

export type NotificationCoverageItem = {
  id: string;
  title: string;
  area: "Purchase Requests" | "Tracking" | "Payments" | "Conversations" | "Followups" | "Provider";
  eventType: string;
  status: NotificationCoverageStatus;
  source: string;
  impact: string;
  nextAction: string;
};

export const notificationCoverageItems: NotificationCoverageItem[] = [
  {
    id: "transfer-receipt-uploaded",
    title: "Transfer proof uploaded",
    area: "Payments",
    eventType: "transfer_receipt_uploaded",
    status: "covered",
    source: "submitTransferProofForPurchaseRequest",
    impact: "Creates a customer notification readiness event when a customer uploads transfer proof.",
    nextAction: "Keep observing delivery queue until an external provider is configured.",
  },
  {
    id: "transfer-receipt-reviewed",
    title: "Transfer proof accepted or rejected",
    area: "Payments",
    eventType: "transfer_receipt_reviewed",
    status: "covered",
    source: "acceptTransferProof / rejectTransferProof / acceptTransferProofWithPayment",
    impact: "Creates notification events when management reviews customer payment proof.",
    nextAction: "Later attach provider templates for accepted and rejected outcomes separately.",
  },
  {
    id: "official-conversation-opened",
    title: "Official conversation opened",
    area: "Conversations",
    eventType: "official_conversation_opened",
    status: "covered",
    source: "ensureOfficialOrderConversation",
    impact: "Creates a notification event when an official order conversation is opened.",
    nextAction: "Use in-app customer portal inbox before external provider delivery.",
  },
  {
    id: "official-conversation-message",
    title: "Official conversation message",
    area: "Conversations",
    eventType: "official_conversation_message",
    status: "covered",
    source: "sendOfficialConversationMessage",
    impact: "Creates a notification event when a message is added to an official conversation.",
    nextAction: "Add unread counters in customer portal after the inbox phase.",
  },
  {
    id: "order-followup-added",
    title: "Customer-visible order followup",
    area: "Followups",
    eventType: "order_followup_added",
    status: "covered",
    source: "createOrderFollowup",
    impact: "Creates a notification event when an operations followup is visible to the customer.",
    nextAction: "Keep internal-only followups silent by design.",
  },
  {
    id: "purchase-request-status",
    title: "Purchase request status updates",
    area: "Purchase Requests",
    eventType: "order_stage_changed",
    status: "partial",
    source: "updatePurchaseRequestStatus",
    impact: "Some status transitions already open official conversations or trigger automation, but every status change still needs one unified customer notification event.",
    nextAction: "Add a direct order_stage_changed notification hook to the status transition function.",
  },
  {
    id: "shipment-stage-update",
    title: "Shipment stage updates",
    area: "Tracking",
    eventType: "shipment_status_changed",
    status: "partial",
    source: "createTrackingUpdate",
    impact: "Internal notifications are created, but customer-visible tracking updates need a direct customer notification event for full queue observability.",
    nextAction: "Add a direct shipment_status_changed notification hook when visibility is customer_visible.",
  },
  {
    id: "provider-delivery",
    title: "External provider delivery",
    area: "Provider",
    eventType: "email / whatsapp_sms",
    status: "pending",
    source: "Vercel provider environment flags",
    impact: "Events remain safely logged and visible as provider_not_configured until email or WhatsApp/SMS credentials are available.",
    nextAction: "Do not enable sending before provider credentials and opt-in rules are ready.",
  },
];

export const getNotificationCoverageSummary = () => {
  const covered = notificationCoverageItems.filter((item) => item.status === "covered").length;
  const partial = notificationCoverageItems.filter((item) => item.status === "partial").length;
  const pending = notificationCoverageItems.filter((item) => item.status === "pending").length;

  return {
    total: notificationCoverageItems.length,
    covered,
    partial,
    pending,
  };
};

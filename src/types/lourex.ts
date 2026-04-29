export type PlatformRole =
  | "owner"
  | "turkish_partner"
  | "saudi_partner"
  | "operations_employee"
  | "customer";

export type PurchaseRequestStatus =
  | "intake_submitted"
  | "under_review"
  | "awaiting_clarification"
  | "ready_for_conversion"
  | "transfer_proof_pending"
  | "transfer_proof_rejected"
  | "in_progress"
  | "completed"
  | "cancelled";

export type DealOperationalStatus =
  | "awaiting_assignment"
  | "partner_assigned"
  | "sourcing"
  | "origin_execution"
  | "in_transit"
  | "destination_execution"
  | "delivered"
  | "closed";

export type ShipmentStageCode =
  | "factory"
  | "received_turkey"
  | "in_turkey_warehouse"
  | "preparing_export"
  | "departed_turkey"
  | "in_transit"
  | "arrived_destination"
  | "customs_clearance"
  | "out_for_delivery"
  | "delivered"
  | "closed";

export interface ShipmentStageDefinition {
  code: ShipmentStageCode;
  order: number;
  label: string;
  description: string;
  owner?: string;
}

export interface CustomerAccount {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  companyName?: string;
}

export interface AttachmentRecord {
  id: string;
  entityType: "purchase_request" | "deal";
  entityId: string;
  category: string;
  fileName: string;
  fileUrl: string;
  bucketName?: string;
  storagePath?: string;
  visibility: "internal" | "customer_visible";
  createdAt: string;
}

export interface TrackingUpdateRecord {
  id: string;
  shipmentId: string;
  dealId?: string;
  stageCode: ShipmentStageCode;
  previousStageCode?: ShipmentStageCode | null;
  note: string;
  customerNote: string;
  visibility: "internal" | "customer_visible";
  updatedBy?: string;
  updatedByRole?: string;
  occurredAt: string;
  createdAt: string;
}

export interface ShipmentEventRecord {
  id: string;
  shipmentId: string;
  eventType: string;
  fromStage?: ShipmentStageCode | null;
  toStage?: ShipmentStageCode | null;
  note?: string | null;
  actorUserId?: string | null;
  isCustomerVisible: boolean;
  createdAt: string;
}

export interface PurchaseRequest {
  id: string;
  requestNumber: string;
  status: PurchaseRequestStatus;
  statusLabel?: string;
  customer: CustomerAccount;
  productName: string;
  productDescription: string;
  quantity: number;
  sizeDimensions: string;
  color: string;
  material: string;
  technicalSpecs: string;
  referenceLink?: string;
  preferredShippingMethod: string;
  deliveryNotes: string;
  imageUrls: string[];
  createdAt: string;
  internalNotes?: string;
  reviewedAt?: string | null;
  convertedDealId?: string | null;
  convertedDealNumber?: string | null;
  attachments?: AttachmentRecord[];
  // New operational fields for Phase 4
  weight?: string;
  manufacturingCountry?: string;
  brand?: string;
  qualityLevel?: string;
  isReadyMade: boolean;
  hasPreviousSample: boolean;
  expectedSupplyDate?: string;
  destination: string;
  deliveryAddress?: string;
  isFullSourcing: boolean;
  trackingCode: string;
  // Transfer proof fields
  transferProofUrl?: string | null;
  transferProofName?: string | null;
  transferProofUploadedAt?: string | null;
  transferProofStatus?: "pending" | "accepted" | "rejected" | null;
  transferAcceptedAt?: string | null;
  transferAcceptedBy?: string | null;
  transferRejectionReason?: string | null;
}

export interface DealOperation {
  id: string;
  dealNumber: string;
  operationTitle?: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  requestNumber?: string;
  sourceRequestId?: string | null;
  turkishPartnerId?: string | null;
  turkishPartnerName?: string;
  saudiPartnerId?: string | null;
  saudiPartnerName?: string;
  operationalStatus: DealOperationalStatus;
  shipmentStage: ShipmentStageCode;
  shipmentId?: string;
  trackingId?: string;
  accountingReference?: string;
  value: number;
  currency: string;
  createdAt: string;
  notes?: string;
  attachments?: AttachmentRecord[];
  trackingUpdates?: TrackingUpdateRecord[];
  accountingSummary?: {
    income: number;
    expense: number;
    net: number;
    entriesCount: number;
  };
}

export type FinancialEntryScope = "global" | "deal" | "customer";
export type FinancialRelationType = "general" | "deal_linked" | "customer_linked";

export interface FinancialEntry {
  id: string;
  entryNumber: string;
  scope: FinancialEntryScope;
  relationType: FinancialRelationType;
  dealId?: string;
  dealNumber?: string;
  customerId?: string;
  customerName?: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  locked: boolean;
  createdBy: string;
  createdAt: string;
  entryDate: string;
  method: string;
  counterparty: string;
  category: string;
  referenceLabel?: string;
  note: string;
}

export interface FinancialEditRequest {
  id: string;
  financialEntryId?: string;
  targetEntryNumber: string;
  dealId?: string;
  dealNumber?: string;
  customerId?: string;
  customerName?: string;
  requestedBy: string;
  requestedByEmail?: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string | null;
  reviewerName?: string;
  reviewNote?: string;
  oldValue?: Record<string, unknown>;
  proposedValue?: Record<string, unknown>;
}

export type PartnerSettlementStatus = "draft" | "pending_review" | "approved" | "paid" | "disputed";
export type PartnerSettlementRole = "turkish_partner" | "saudi_partner";

export interface PartnerSettlement {
  id: string;
  partnerId: string;
  partnerName?: string;
  partnerRole: PartnerSettlementRole;
  settlementPeriod: string;
  grossAmount: number;
  partnerCommission: number;
  expenses: number;
  netDue: number;
  status: PartnerSettlementStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditRecord {
  id: string;
  action: string;
  actor: string;
  actorRole?: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  summary: string;
}

export interface PublicTrackingResult {
  trackingId: string;
  dealNumber?: string;
  requestNumber?: string;
  operationTitle?: string;
  destination: string;
  clientName: string;
  currentStage: ShipmentStageCode;
  currentStageLabel: string;
  currentStageDescription: string;
  customerNote: string;
  lastUpdated: string;
  progressRatio: number;
  timeline: TrackingUpdateRecord[];
}

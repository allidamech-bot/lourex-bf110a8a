export type PlatformRole =
  | "owner"
  | "admin"
  | "turkey_agent"
  | "saudi_agent"
  | "operations"
  | "customer";

export type PurchaseRequestStatus =
  | "submitted"
  | "under_review"
  | "converted_to_deal"
  | "on_hold";

export type ShipmentStageCode =
  | "deal_accepted"
  | "product_preparation"
  | "transfer_to_port"
  | "origin_port"
  | "origin_customs"
  | "departed_origin"
  | "in_transit"
  | "arrived_destination"
  | "destination_customs"
  | "transfer_to_warehouse"
  | "delivered";

export interface ShipmentStageDefinition {
  code: ShipmentStageCode;
  order: number;
  label: string;
  description: string;
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

export interface PurchaseRequest {
  id: string;
  requestNumber: string;
  status: PurchaseRequestStatus;
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
}

export interface DealOperation {
  id: string;
  dealNumber: string;
  customerName: string;
  requestNumber?: string;
  turkeyAgent: string;
  saudiAgent: string;
  status: "intake" | "sourcing" | "origin" | "transit" | "destination" | "completed";
  shipmentStage: ShipmentStageCode;
  value: number;
  currency: string;
  createdAt: string;
}

export interface FinancialEntry {
  id: string;
  entryNumber: string;
  scope: "global" | "deal";
  dealNumber?: string;
  customerName?: string;
  category: "income" | "expense" | "adjustment";
  amount: number;
  currency: string;
  locked: boolean;
  createdBy: string;
  createdAt: string;
  note: string;
}

export interface FinancialEditRequest {
  id: string;
  targetEntryNumber: string;
  requestedBy: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

export interface AuditRecord {
  id: string;
  action: string;
  actor: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  summary: string;
}

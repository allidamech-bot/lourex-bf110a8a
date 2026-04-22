import type {
  AttachmentRecord,
  CustomerAccount,
  DealOperationalStatus,
  FinancialEditRequest,
  FinancialEntry,
  PurchaseRequest,
  ShipmentStageCode,
  TrackingUpdateRecord,
} from "@/types/lourex";
import type { Json } from "@/integrations/supabase/types";

export type DomainError = {
  message: string;
  cause?: unknown;
};

export type DomainResult<T> =
  | { data: T; error: null }
  | { data: null; error: DomainError };

export type DomainJsonObject = Record<string, Json | undefined>;

export type OperationsCustomer = CustomerAccount & {
  requestsCount: number;
  dealsCount: number;
  financialEntriesCount: number;
  financialBalance: number;
  auditCount: number;
  latestRequestNumber?: string;
  latestDealNumber?: string;
};

export type OperationsRequest = PurchaseRequest & {
  sourceInquiryId?: string | null;
  convertedDealId?: string | null;
  convertedDealNumber?: string | null;
  isLegacyFallback?: boolean;
  internalNotes: string;
  reviewedAt?: string | null;
  attachments: AttachmentRecord[];
};

export type OperationsDeal = {
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

export type OperationsFinancialEntry = FinancialEntry;

export type OperationsFinancialEditRequest = FinancialEditRequest;

export type OperationsShipment = {
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

export type OperationsUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  partnerType: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditPreviewRow = {
  id: string;
  action: string;
  createdAt: string;
  newValues: DomainJsonObject | null;
};

export type CreateRequestInput = {
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
  // Phase 4 expanded fields
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
};

export type UpdateDealStatusInput = {
  operationalStatus: DealOperationalStatus;
  notes?: string;
  turkishPartnerId?: string | null;
  saudiPartnerId?: string | null;
};

export type PurchaseRequestImageUpload = {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeLabel: string;
};

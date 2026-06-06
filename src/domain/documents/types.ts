import type { MonetaryValue } from "@/domain/currency/types";
import type { TrackingUpdateRecord } from "@/types/lourex";

export type DocumentType = 'INVOICE' | 'CONTRACT' | 'MANIFEST';

export interface DocumentMetadata {
  documentId: string;
  dealId: string;
  generatedAt: Date;
  hashSignature: string; // Cryptographic-like data integrity placeholder
  type: DocumentType;
}

export interface DocumentIdentity {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
}

export interface DocumentTemplateData {
  metadata: DocumentMetadata;
  sellerIdentity: DocumentIdentity;
  buyerIdentity: DocumentIdentity;
  financialLines: {
    description: string;
    amount: MonetaryValue;
  }[];
  totalValue: MonetaryValue;
  trackingHistory: TrackingUpdateRecord[];
}

import type { OperationalDeal } from "@/lib/operationsDomain";
import type { LedgerLine } from "@/domain/financial/types";
import type { DocumentTemplateData, DocumentType, DocumentMetadata, DocumentIdentity } from "./types";
import { createMonetaryValue } from "@/domain/currency/currencyService";
import type { CurrencyCode } from "@/domain/currency/types";

/**
 * Validates that a deal is fully closed before allowing document generation.
 * This is a critical domain invariant.
 */
const assertDealIsClosedForDocumentation = (deal: OperationalDeal) => {
  if (deal.operationalStatus !== "closed") {
    throw new Error(`Cannot generate final documentation for deal ${deal.dealNumber}. The deal must be fully closed (Stage 11).`);
  }
};

/**
 * Generates a deterministic hash signature for the document metadata.
 * In a real-world scenario, this might use a cryptographic hash of the content.
 */
const generateSignature = (dealId: string, docType: DocumentType, timestamp: number): string => {
  return `SIG-${docType}-${dealId.substring(0, 8)}-${timestamp}`;
};

/**
 * Base utility to assemble the standard structure of a document template.
 */
const createBaseDocumentTemplate = (
  deal: OperationalDeal,
  ledgerLines: LedgerLine[],
  docType: DocumentType
): DocumentTemplateData => {
  assertDealIsClosedForDocumentation(deal);

  const timestamp = Date.now();
  const generatedAt = new Date(timestamp);
  
  const metadata: DocumentMetadata = {
    documentId: `DOC-${docType}-${timestamp.toString().slice(-6)}`,
    dealId: deal.id,
    generatedAt,
    hashSignature: generateSignature(deal.id, docType, timestamp),
    type: docType,
  };

  const buyerIdentity: DocumentIdentity = {
    name: deal.customerName || "Unknown Customer",
    email: deal.customerEmail,
    phone: deal.customerPhone,
  };

  const sellerIdentity: DocumentIdentity = {
    name: "Lourex Trading LLC", // Base seller entity
    address: "Global Clearing Center",
  };

  const currency = (deal.currency || "SAR") as CurrencyCode;

  // We convert the ledger lines into displayable financial lines.
  // Note: ledger amounts are already in cents.
  const financialLines = ledgerLines.map(line => ({
    description: line.description || `Ledger Entry: ${line.accountId}`,
    amount: {
      amountInCents: line.amount,
      currency: line.currency,
    },
  }));

  const totalValue = createMonetaryValue(deal.totalValue || 0, currency);

  return {
    metadata,
    sellerIdentity,
    buyerIdentity,
    financialLines,
    totalValue,
    trackingHistory: deal.trackingUpdates || [],
  };
};

/**
 * Assembles a Commercial Invoice template.
 */
export const assembleInvoiceTemplate = (
  deal: OperationalDeal,
  ledgerLines: LedgerLine[]
): DocumentTemplateData => {
  // We might filter ledger lines to only include REVENUE or specific customer-facing expenses
  // For a commercial invoice, we usually only show debits matching the customer obligation.
  const customerObligationLines = ledgerLines.filter(l => l.direction === "DEBIT" && l.accountId.startsWith("REV-"));
  
  return createBaseDocumentTemplate(deal, customerObligationLines.length > 0 ? customerObligationLines : ledgerLines, "INVOICE");
};

/**
 * Assembles a Brokerage Contract template.
 */
export const assembleContractTemplate = (
  deal: OperationalDeal,
  ledgerLines: LedgerLine[]
): DocumentTemplateData => {
  // Contracts may need all lines for transparency to the broker
  return createBaseDocumentTemplate(deal, ledgerLines, "CONTRACT");
};

/**
 * Assembles a Shipment Manifest template.
 */
export const assembleManifestTemplate = (
  deal: OperationalDeal,
  ledgerLines: LedgerLine[]
): DocumentTemplateData => {
  // Manifests focus primarily on identity and tracking history rather than financials,
  // but keeping standard template structure
  const template = createBaseDocumentTemplate(deal, [], "MANIFEST");
  // Ensure we emphasize the destination
  template.sellerIdentity.address = `Origin: ${deal.originCountry || 'Unknown'}`;
  template.buyerIdentity.address = `Destination: ${deal.destinationCountry || 'Unknown'}`;
  
  return template;
};

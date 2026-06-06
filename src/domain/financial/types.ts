export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
export type LedgerDirection = "DEBIT" | "CREDIT";

export interface LedgerAccount {
  id: string;
  name: string;
  type: AccountType;
}

export interface LedgerLine {
  id: string;
  accountId: string;
  dealId?: string;
  amount: number; // Stored in integer cents/halalas
  direction: LedgerDirection;
  description: string;
}

export interface LedgerEntry {
  id: string;
  dealId: string;
  timestamp: string;
  lines: LedgerLine[];
}

export interface DealFinancialInput {
  dealId: string;
  totalRevenue: number; // Stored in integer cents/halalas
  totalCosts: number; // Stored in integer cents/halalas
  saudiPartnerId?: string;
  turkishPartnerId?: string;
}

export interface SettlementResult {
  netProfit: number;
  saudiProfit: number;
  turkishProfit: number;
  ledgerEntry: LedgerEntry;
}

export interface ReconciliationReport {
  isValid: boolean;
  checksum: number;
  discrepancies: string[];
}

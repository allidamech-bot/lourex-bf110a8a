import type { DealFinancialInput, LedgerLine, ReconciliationReport } from "./types";

/**
 * Validates the ledger integrity for a deal against operational inputs.
 */
export const verifyLedgerIntegrity = (
  dealId: string,
  ledgerLines: LedgerLine[],
  operationalData: DealFinancialInput
): ReconciliationReport => {
  const discrepancies: string[] = [];

  const totalDebits = ledgerLines
    .filter((l) => l.direction === "DEBIT")
    .reduce((sum, l) => sum + l.amount, 0);

  const totalCredits = ledgerLines
    .filter((l) => l.direction === "CREDIT")
    .reduce((sum, l) => sum + l.amount, 0);

  // Check 1: Debits == Credits
  if (totalDebits !== totalCredits) {
    discrepancies.push(`Ledger imbalance: Debits (${totalDebits}) != Credits (${totalCredits})`);
  }

  // Check 2: Total debits == operational revenue
  if (totalDebits !== operationalData.totalRevenue) {
    discrepancies.push(`Revenue mismatch: Ledger Debits (${totalDebits}) != Expected Revenue (${operationalData.totalRevenue})`);
  }

  // Check 3: Partner profits match expected splits
  const netProfit = operationalData.totalRevenue - operationalData.totalCosts;
  const expectedSaudiProfit = Math.floor(netProfit / 2);
  const expectedTurkishProfit = netProfit - expectedSaudiProfit;

  const actualCosts = ledgerLines.find((l) => l.accountId === "EXP-COSTS-01")?.amount || 0;
  const actualSaudiProfit = ledgerLines.find((l) => l.accountId === "LIAB-SAUDI-01")?.amount || 0;
  const actualTurkishProfit = ledgerLines.find((l) => l.accountId === "LIAB-TURKEY-01")?.amount || 0;

  if (actualCosts !== operationalData.totalCosts) {
    discrepancies.push(`Cost mismatch: Ledger Costs (${actualCosts}) != Expected Costs (${operationalData.totalCosts})`);
  }

  if (actualSaudiProfit !== expectedSaudiProfit) {
    discrepancies.push(`Saudi Profit mismatch: Ledger (${actualSaudiProfit}) != Expected (${expectedSaudiProfit})`);
  }

  if (actualTurkishProfit !== expectedTurkishProfit) {
    discrepancies.push(`Turkish Profit mismatch: Ledger (${actualTurkishProfit}) != Expected (${expectedTurkishProfit})`);
  }

  const checksum = totalDebits ^ totalCredits ^ actualCosts ^ actualSaudiProfit ^ actualTurkishProfit;

  return {
    isValid: discrepancies.length === 0,
    checksum,
    discrepancies,
  };
};

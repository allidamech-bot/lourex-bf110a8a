import type { DealFinancialInput, SettlementResult, LedgerLine, LedgerEntry } from "./types";

export const calculateDealSettlement = (input: DealFinancialInput): SettlementResult => {
  const { dealId, totalRevenue, totalCosts } = input;

  // Enforce integer cents/halalas
  if (!Number.isInteger(totalRevenue) || !Number.isInteger(totalCosts)) {
    throw new Error("Financial values must be integers (cents/halalas) to prevent rounding errors.");
  }

  const netProfit = totalRevenue - totalCosts;

  if (netProfit <= 0) {
    throw new Error(`Invalid settlement: Net profit must be greater than zero. Received: ${netProfit}`);
  }

  // Exact profit split using integer math (50/50 split)
  const saudiProfit = Math.floor(netProfit / 2);
  const turkishProfit = netProfit - saudiProfit; // Remainder handles the odd cent

  const lines: LedgerLine[] = [];

  // 1 DEBIT line for clearing total revenue
  lines.push({
    id: crypto.randomUUID(),
    accountId: "REV-CLEARING-01",
    dealId,
    amount: totalRevenue,
    currency: input.currency,
    direction: "DEBIT",
    description: `Clear Total Revenue for Deal ${dealId}`,
  });

  // 3 CREDIT lines for costs, Saudi profit, and Turkey profit
  lines.push({
    id: crypto.randomUUID(),
    accountId: "EXP-COSTS-01",
    dealId,
    amount: totalCosts,
    currency: input.currency,
    direction: "CREDIT",
    description: `Record Costs for Deal ${dealId}`,
  });

  lines.push({
    id: crypto.randomUUID(),
    accountId: "LIAB-SAUDI-01",
    dealId,
    amount: saudiProfit,
    currency: input.currency,
    direction: "CREDIT",
    description: `Saudi Partner Profit Share for Deal ${dealId}`,
  });

  lines.push({
    id: crypto.randomUUID(),
    accountId: "LIAB-TURKEY-01",
    dealId,
    amount: turkishProfit,
    currency: input.currency,
    direction: "CREDIT",
    description: `Turkey Broker Profit Share for Deal ${dealId}`,
  });

  // Double-entry discipline: Sum Debits == Sum Credits
  const totalDebits = lines.filter((l) => l.direction === "DEBIT").reduce((sum, l) => sum + l.amount, 0);
  const totalCredits = lines.filter((l) => l.direction === "CREDIT").reduce((sum, l) => sum + l.amount, 0);

  if (totalDebits !== totalCredits) {
    throw new Error(`Ledger imbalance detected! Debits: ${totalDebits}, Credits: ${totalCredits}`);
  }

  const ledgerEntry: LedgerEntry = {
    id: crypto.randomUUID(),
    dealId,
    timestamp: new Date().toISOString(),
    lines,
  };

  return {
    netProfit,
    saudiProfit,
    turkishProfit,
    ledgerEntry,
  };
};

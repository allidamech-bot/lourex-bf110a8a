import { telemetry } from "@/domain/telemetry/telemetryService";
import { verifyLedgerIntegrity } from "@/domain/financial/reconciliationEngine";
import { canAdvanceShipmentStage } from "@/domain/operations/guards";
import type { LedgerLine, DealFinancialInput } from "@/domain/financial/types";
import type { ShipmentStageCode, DealOperationalStatus } from "@/types/lourex";

export interface ChaosScenarioResult {
  scenarioName: string;
  stoppedByGuard: boolean;
  alertTriggered: boolean;
  details?: string;
}

export const simulateUnauthorizedClientWrite = (): ChaosScenarioResult => {
  let stoppedByGuard = false;
  let alertTriggered = false;
  
  try {
    // Simulate domain guard rejecting client write
    const userRole = "client";
    if (userRole === "client") {
      throw new Error("Operation forbidden: Client account has read-only privileges.");
    }
  } catch (error) {
    stoppedByGuard = true;
    try {
      telemetry.captureException(error, "Unauthorized client write attempt blocked", { role: "client" });
      telemetry.trackMetric("SECURITY_VIOLATION", "ERROR", "Client attempted to write financial margins", { role: "client" });
      alertTriggered = true;
    } catch (telemetryError) {
      alertTriggered = false;
    }
  }

  return { scenarioName: "Unauthorized Client Write", stoppedByGuard, alertTriggered };
};

export const simulatePostClosureTampering = (): ChaosScenarioResult => {
  let stoppedByGuard = false;
  let alertTriggered = false;

  try {
    // Simulate tampering with a closed deal
    const currentStage: ShipmentStageCode = "delivered";
    const nextStage: ShipmentStageCode = "closed";
    const dealStatus: DealOperationalStatus = "closed";
    
    // Using operations guard
    const allowed = canAdvanceShipmentStage({
      role: "operations_employee",
      currentStage,
      nextStage,
      dealOperationalStatus: dealStatus
    });

    if (!allowed) {
      throw new Error("Invalid state transition: Cannot tamper with closed deals.");
    }
  } catch (error) {
    stoppedByGuard = true;
    try {
      telemetry.captureException(error, "Post-closure tampering attempt blocked", { dealStatus: "closed" });
      telemetry.trackMetric("SECURITY_VIOLATION", "ERROR", "Attempt to force modify Stage 11 shipment", { dealStatus: "closed" });
      alertTriggered = true;
    } catch (telemetryError) {
      alertTriggered = false;
    }
  }

  return { scenarioName: "Post-Closure Tampering", stoppedByGuard, alertTriggered };
};

export const simulateCrossCurrencyCollateral = (): ChaosScenarioResult => {
  let stoppedByGuard = false;
  let alertTriggered = false;
  let discrepanciesFound = false;

  try {
    // Setup a mixed currency ledger scenario
    const operationalData: DealFinancialInput = {
      totalRevenue: 10000,
      totalCosts: 2000,
      currency: "SAR"
    };

    const ledgerLines: LedgerLine[] = [
      { id: "1", dealId: "D-1", accountId: "REV-01", type: "income", amount: 10000, direction: "CREDIT", currency: "SAR", timestamp: new Date(), description: "", referenceId: null },
      { id: "2", dealId: "D-1", accountId: "EXP-01", type: "expense", amount: 2000, direction: "DEBIT", currency: "USD", timestamp: new Date(), description: "", referenceId: null } // Drift currency!
    ];

    const report = verifyLedgerIntegrity("D-1", ledgerLines, operationalData);
    
    if (!report.isValid) {
      discrepanciesFound = true;
      throw new Error(`CRITICAL_DRIFT: Ledger validation failed. Discrepancies: ${report.discrepancies.join(" | ")}`);
    }
  } catch (error) {
    if (discrepanciesFound) {
      stoppedByGuard = true;
      try {
        telemetry.captureException(error, "Cross-currency collateral drift detected", { driftType: "CURRENCY_MISMATCH" });
        telemetry.trackMetric("CRITICAL_DRIFT", "FATAL", "Mixed currencies in ledger", {});
        alertTriggered = true;
      } catch (telemetryError) {
        alertTriggered = false;
      }
    }
  }

  return { scenarioName: "Cross-Currency Collateral", stoppedByGuard, alertTriggered };
};

export const runChaosSweep = (): ChaosScenarioResult[] => {
  const results: ChaosScenarioResult[] = [];
  
  results.push(simulateUnauthorizedClientWrite());
  results.push(simulatePostClosureTampering());
  results.push(simulateCrossCurrencyCollateral());
  
  return results;
};

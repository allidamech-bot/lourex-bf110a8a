import { loadPartnerSettlements } from "@/domain/accounting/partnerSettlements";
import type { PartnerSettlement } from "@/types/lourex";

export const loadAvailableSettlements = async (): Promise<PartnerSettlement[]> => {
  try {
    return await loadPartnerSettlements();
  } catch {
    return [];
  }
};

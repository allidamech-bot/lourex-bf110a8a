import { translate, type Lang } from "@/lib/i18n";
import type { PurchaseRequestStatus } from "@/types/lourex";

type LocalizedCopy = {
  label: string;
  description: string;
  nextStep: string;
};

const requestStatusKeys: Record<PurchaseRequestStatus | "cancelled", string> = {
  intake_submitted: "customerPortal.requestStatus.intake_submitted",
  under_review: "customerPortal.requestStatus.under_review",
  awaiting_clarification: "customerPortal.requestStatus.awaiting_clarification",
  ready_for_conversion: "customerPortal.requestStatus.ready_for_conversion",
  converted_to_deal: "customerPortal.requestStatus.converted_to_deal",
  cancelled: "customerPortal.requestStatus.cancelled",
};

export const getCustomerRequestStatusCopy = (status: PurchaseRequestStatus, lang: Lang): LocalizedCopy => {
  const key = requestStatusKeys[status];

  return {
    label: translate(lang, `${key}.label`),
    description: translate(lang, `${key}.description`),
    nextStep: translate(lang, `${key}.nextStep`),
  };
};

export const getCustomerFinancialSummaryCopy = (
  lang: Lang,
  options: { hasMixedCurrencies: boolean; dealsCount: number },
) => {
  if (options.hasMixedCurrencies) {
    return translate(lang, "customerPortal.financial.summary.mixedCurrencies");
  }

  if (options.dealsCount === 0) {
    return translate(lang, "customerPortal.financial.summary.noDeals");
  }

  return translate(lang, "customerPortal.financial.summary.default");
};

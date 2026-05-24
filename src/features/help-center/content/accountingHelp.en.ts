import type { PageHelpContent } from "@/features/help-center/types/helpTypes";

export const accountingHelpEn: Record<string, PageHelpContent> = {
  accounting: {
    pageKey: "accounting",
    audience: "admin",
    eyebrow: "Accounting help",
    title: "How do I understand the accounting?",
    summary: "Use this page to understand money in, money out, locked entries, edit requests, and financial risk signals.",
    topics: [
      { id: "balance", title: "What is a balance?", body: "A balance is the difference between incoming and outgoing amounts. Positive usually means covered; negative means something needs review." },
      { id: "locked", title: "What is a locked entry?", body: "A locked entry is protected after creation. Corrections should go through a formal edit request so the financial history stays clear." },
      { id: "profit", title: "How do I read profit or loss?", body: "Compare total income with total expense. Net result is a useful operational indicator, but final statements still need review." },
    ],
  },
  dashboard_predictive_intelligence: {
    pageKey: "dashboard_predictive_intelligence",
    audience: "admin",
    eyebrow: "Predictive intelligence help",
    title: "How do I use predictive intelligence?",
    summary: "Use this page to review risk signals, conversion opportunities, and operational bottlenecks from current Lourex data before they escalate.",
    topics: [
      { id: "signals", title: "What are the signals?", body: "Signals are review indicators, not final decisions. They help you identify requests, shipments, or finance edits that deserve attention first." },
      { id: "conversion", title: "How do I read conversion opportunities?", body: "A conversion opportunity means a request or operation may be ready for a clearer commercial or operational next step. Review the source record before acting." },
      { id: "bottlenecks", title: "What are bottlenecks?", body: "A bottleneck is a stage where requests accumulate, shipments slow down, or approvals wait. Start with the highest-impact item and open the related record." },
      { id: "action", title: "What should I do next?", body: "Use the output to plan follow-up, then verify the related request, deal, shipment, or financial entry. Sensitive decisions still require human approval." },
    ],
  },
};
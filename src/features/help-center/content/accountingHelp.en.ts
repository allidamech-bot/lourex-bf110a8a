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
};

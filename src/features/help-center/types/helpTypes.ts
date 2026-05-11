import type { LourexRole } from "@/features/auth/rbac";

export type HelpLanguage = "ar" | "en";

export type HelpAudience = "admin" | "partner" | "customer" | "general";

export type HelpPageKey =
  | "dashboard_overview"
  | "accounting"
  | "reports"
  | "audit"
  | "partner_settlements"
  | "customer_portal"
  | "customer_tracking"
  | "purchase_requests"
  | "request"
  | "deals"
  | "ai_operations";

export type HelpStep = Readonly<{
  title: string;
  body: string;
}>;

export type HelpTopic = Readonly<{
  id: string;
  title: string;
  body: string;
  steps?: HelpStep[];
}>;

export type PageHelpContent = Readonly<{
  pageKey: HelpPageKey;
  audience: HelpAudience;
  eyebrow: string;
  title: string;
  summary: string;
  topics: HelpTopic[];
}>;

export type HelpResolveInput = Readonly<{
  pageKey: HelpPageKey;
  language: HelpLanguage;
  role?: LourexRole | null;
}>;

import { supabase } from "@/integrations/supabase/client";

export type SupplierState =
  | "not_authenticated"
  | "no_application"        // logged in but never started
  | "onboarding_incomplete" // started application/profile but not finished
  | "pending"               // submitted, awaiting admin
  | "rejected"              // admin rejected
  | "approved_incomplete"   // approved but profile/branding/products missing
  | "approved_ready";       // approved + activation checklist complete

export interface SupplierContext {
  state: SupplierState;
  userId: string | null;
  applicationId: string | null;
  applicationStatus: string | null;
  factoryId: string | null;
  profileId: string | null;
  onboardingStep: number;
  checklist: ActivationChecklist;
}

export interface ActivationChecklist {
  hasProfile: boolean;          // company_profiles row exists
  hasDescription: boolean;      // ≥ 80 chars
  hasLogo: boolean;
  hasCover: boolean;
  hasCategories: boolean;       // ≥ 1
  hasFirstProduct: boolean;
  completedCount: number;
  totalCount: number;
  percent: number;
  allComplete: boolean;
}

const EMPTY_CHECKLIST: ActivationChecklist = {
  hasProfile: false,
  hasDescription: false,
  hasLogo: false,
  hasCover: false,
  hasCategories: false,
  hasFirstProduct: false,
  completedCount: 0,
  totalCount: 4,
  percent: 0,
  allComplete: false,
};

/**
 * Derive the supplier's current onboarding/activation state from real data.
 * No jsonb checklist trust — everything is computed from source-of-truth tables.
 */
export async function getSupplierContext(): Promise<SupplierContext> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      state: "not_authenticated",
      userId: null,
      applicationId: null,
      applicationStatus: null,
      factoryId: null,
      profileId: null,
      onboardingStep: 1,
      checklist: EMPTY_CHECKLIST,
    };
  }

  // Latest application
  const { data: app } = await supabase
    .from("factory_applications")
    .select("id, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Linked factory (created on admin approval, but may exist earlier in some flows)
  const { data: factory } = await supabase
    .from("factories")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  // Company profile + product count (only if factory exists)
  let profile: Record<string, unknown> | null = null;
  let productCount = 0;
  if (factory?.id) {
    const [{ data: p }, { count }] = await Promise.all([
      supabase
        .from("company_profiles")
        .select("id, description, logo_url, cover_url, categories, onboarding_step, onboarding_completed")
        .eq("factory_id", factory.id)
        .maybeSingle(),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("factory_id", factory.id),
    ]);
    profile = p;
    productCount = count ?? 0;
  }

  const checklist: ActivationChecklist = {
    hasProfile: !!profile,
    hasDescription: !!profile?.description && profile.description.trim().length >= 80,
    hasLogo: !!profile?.logo_url,
    hasCover: !!profile?.cover_url,
    hasCategories: Array.isArray(profile?.categories) && profile.categories.length > 0,
    hasFirstProduct: productCount > 0,
    completedCount: 0,
    totalCount: 4,
    percent: 0,
    allComplete: false,
  };

  // 4 checklist items: profile (desc), branding (logo), categories, first product
  const items = [
    checklist.hasDescription,
    checklist.hasLogo,
    checklist.hasCategories,
    checklist.hasFirstProduct,
  ];
  checklist.completedCount = items.filter(Boolean).length;
  checklist.percent = Math.round((checklist.completedCount / checklist.totalCount) * 100);
  checklist.allComplete = checklist.completedCount === checklist.totalCount;

  // Determine state
  let state: SupplierState;
  if (!app) {
    state = "no_application";
  } else if (app.status === "rejected") {
    state = "rejected";
  } else if (app.status === "pending") {
    state = "pending";
  } else if (app.status === "approved") {
    state = checklist.allComplete ? "approved_ready" : "approved_incomplete";
  } else {
    // unknown status → treat as incomplete
    state = "onboarding_incomplete";
  }

  return {
    state,
    userId: user.id,
    applicationId: app?.id ?? null,
    applicationStatus: app?.status ?? null,
    factoryId: factory?.id ?? null,
    profileId: profile?.id ?? null,
    onboardingStep: profile?.onboarding_step ?? 1,
    checklist,
  };
}

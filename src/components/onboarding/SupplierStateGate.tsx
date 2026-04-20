import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSupplierContext, type SupplierContext } from "@/lib/supplierState";
import { PendingScreen } from "./states/PendingScreen";
import { RejectedScreen } from "./states/RejectedScreen";

interface Props {
  children: (ctx: SupplierContext) => React.ReactNode;
}

/**
 * Wraps the supplier dashboard. Detects state and routes to the right screen.
 * - not_authenticated → /auth
 * - no_application | onboarding_incomplete → /factory-signup
 * - pending → PendingScreen
 * - rejected → RejectedScreen
 * - approved_incomplete | approved_ready → render children with context
 */
export const SupplierStateGate = ({ children }: Props) => {
  const navigate = useNavigate();
  const [ctx, setCtx] = useState<SupplierContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const c = await getSupplierContext();
      if (!mounted) return;
      setCtx(c);
      setLoading(false);

      if (c.state === "not_authenticated") {
        navigate("/auth");
      } else if (c.state === "no_application" || c.state === "onboarding_incomplete") {
        navigate("/factory-signup");
      }

      // On first post-approval visit, hydrate company_profile from the
      // localStorage payload saved during the wizard.
      if ((c.state === "approved_incomplete" || c.state === "approved_ready") && c.factoryId && !c.profileId && c.userId) {
        await hydratePendingProfile(c.userId, c.factoryId);
        // Reload context with new profile
        const c2 = await getSupplierContext();
        if (mounted) setCtx(c2);
      }
    };

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading || !ctx) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (ctx.state === "pending") return <PendingScreen />;
  if (ctx.state === "rejected") return <RejectedScreen />;
  if (ctx.state === "approved_incomplete" || ctx.state === "approved_ready") {
    return <>{children(ctx)}</>;
  }
  // Loading state for redirects in flight
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

async function hydratePendingProfile(userId: string, factoryId: string) {
  try {
    const raw = localStorage.getItem(`lourex:pending_profile:${userId}`);
    if (!raw) return;
    const payload = JSON.parse(raw);
    await supabase.from("company_profiles").insert({
      factory_id: factoryId,
      business_type: payload.business_type ?? "",
      categories: payload.categories ?? [],
      description: payload.description ?? "",
      logo_url: payload.logo_url ?? "",
      cover_url: payload.cover_url ?? "",
      website: payload.website ?? "",
      year_established: payload.year_established ?? null,
      employee_count: payload.employee_count ?? "",
      onboarding_step: 4,
      onboarding_completed: true,
    });
    localStorage.removeItem(`lourex:pending_profile:${userId}`);
  } catch {
    /* non-blocking */
  }
}

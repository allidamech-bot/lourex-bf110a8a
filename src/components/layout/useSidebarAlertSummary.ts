import { useState, useEffect } from "react";
import {
  fetchRequests,
  fetchDeals,
  fetchShipments,
  fetchFinancialEntries,
  fetchFinancialEditRequests,
} from "@/domain/operations/service";
import { loadAvailableSettlements } from "@/features/ai-ops/services/aiOpsService";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { dashboardRoutePermissions } from "@/features/auth/rbac";
import type { SidebarBadgeSeverity } from "./SidebarNavBadge";

export type SidebarAlertSummary = {
  purchaseRequests?: { count: number; severity?: SidebarBadgeSeverity };
  deals?: { count: number; severity?: SidebarBadgeSeverity };
  tracking?: { count: number; severity?: SidebarBadgeSeverity };
  accounting?: { count: number; severity?: SidebarBadgeSeverity };
  editRequests?: { count: number; severity?: SidebarBadgeSeverity };
  settlements?: { count: number; severity?: SidebarBadgeSeverity };
  notifications?: { count: number; severity?: SidebarBadgeSeverity };
  system?: { count?: number; severity?: SidebarBadgeSeverity | null };
};

export function useSidebarAlertSummary() {
  const { profile } = useAuthSession();
  const [summary, setSummary] = useState<SidebarAlertSummary>({});

  useEffect(() => {
    if (!profile || !profile.role) return;
    
    let isMounted = true;
    
    async function fetchSummary() {
      try {
        const role = profile!.role;
        const canAccess = (permissions: readonly string[]) => permissions.includes(role);

        // Fetch required data in parallel, safely swallowing individual failures
        const [
          requests,
          deals,
          shipments,
          entries,
          editReqs,
          settlements,
        ] = await Promise.all([
          canAccess(dashboardRoutePermissions.requests) ? fetchRequests().catch(() => []) : Promise.resolve([]),
          canAccess(dashboardRoutePermissions.deals) ? fetchDeals().catch(() => []) : Promise.resolve([]),
          canAccess(dashboardRoutePermissions.tracking) ? fetchShipments().catch(() => []) : Promise.resolve([]),
          canAccess(dashboardRoutePermissions.accounting) ? fetchFinancialEntries().catch(() => []) : Promise.resolve([]),
          canAccess(dashboardRoutePermissions.editRequests) ? fetchFinancialEditRequests().catch(() => []) : Promise.resolve([]),
          canAccess(dashboardRoutePermissions.settlements) ? loadAvailableSettlements().catch(() => []) : Promise.resolve([]),
        ]);

        if (!isMounted) return;

        // Determine counts
        const prCount = requests.filter(r => 
          ["new", "intake_submitted", "internal_review", "needs_more_info"].includes(r.status)
        ).length;
        
        const dealsCount = deals.filter(d => 
          ["waiting_customer_approval", "waiting_payment", "negotiating"].includes(d.operationalStatus || d.status)
        ).length;
        
        const trackingCount = shipments.filter(s => 
          ["delayed", "blocked", "issue", "overdue"].includes(s.stage)
        ).length;
        
        const accountingCount = entries.filter(e => 
          e.status === "pending_approval" || e.status === "pending"
        ).length;
        
        const editReqCount = editReqs.filter(e => e.status === "pending").length;
        
        const settlementsCount = settlements.filter(s => 
          ["pending", "unsettled", "review_required"].includes(s.status)
        ).length;

        setSummary({
          purchaseRequests: prCount > 0 ? { count: prCount, severity: "info" } : undefined,
          deals: dealsCount > 0 ? { count: dealsCount, severity: "info" } : undefined,
          tracking: trackingCount > 0 ? { count: trackingCount, severity: "warning" } : undefined,
          accounting: accountingCount > 0 ? { count: accountingCount, severity: "info" } : undefined,
          editRequests: editReqCount > 0 ? { count: editReqCount, severity: "info" } : undefined,
          settlements: settlementsCount > 0 ? { count: settlementsCount, severity: "warning" } : undefined,
          // TODO: Add actual notifications/system logic when data sources are available
          notifications: undefined,
          system: undefined, 
        });

      } catch (err) {
        console.error("Failed to load sidebar alert summary:", err);
      }
    }

    fetchSummary();

    // Refresh every 2 minutes
    const interval = setInterval(fetchSummary, 2 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [profile, profile?.role]);

  return summary;
}

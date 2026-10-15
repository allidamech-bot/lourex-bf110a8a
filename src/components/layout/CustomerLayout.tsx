import { FLOATING_AI_ENABLED } from "@/lib/siteExperience";
import { BellRing, ClipboardList, LayoutDashboard, Radar, Route } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useI18n } from "@/lib/i18n";
import { CustomerAIAssistantStub } from "@/features/customer-intelligence/components/CustomerAIAssistantStub";
import { useEffect, useState } from "react";
import { fetchRequests, fetchDeals } from "@/domain/operations/service";
import type { OperationsRequest, OperationsDeal } from "@/domain/operations/types";

export const CustomerLayout = () => {
  const { lang } = useI18n();
  const isRtl = lang === "ar";

  const links = [
    {
      to: "/customer-portal",
      label: isRtl ? "الرئيسية" : "Overview",
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: "/customer-portal/operations",
      label: isRtl ? "مركز العمليات" : "Operations",
      icon: Radar,
    },
    {
      to: "/customer-portal/requests",
      label: isRtl ? "طلباتي" : "My requests",
      icon: ClipboardList,
    },
    {
      to: "/customer-portal/tracking",
      label: isRtl ? "التتبع" : "Tracking",
      icon: Route,
    },
    {
      to: "/customer-portal/notifications",
      label: isRtl ? "الإشعارات" : "Notifications",
      icon: BellRing,
    },
  ];

  const [requests, setRequests] = useState<OperationsRequest[]>([]);
  const [deals, setDeals] = useState<OperationsDeal[]>([]);

  useEffect(() => {
    if (!FLOATING_AI_ENABLED) return;
    fetchRequests().then(setRequests).catch(() => {});
    fetchDeals().then(setDeals).catch(() => {});
  }, []);

  return (
    <div className="lourex-workspace min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground selection:bg-primary-soft selection:text-primary">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_5%_3%,rgba(170,54,36,0.055),transparent_40%)] dark:bg-[radial-gradient(ellipse_at_5%_3%,rgba(214,173,108,0.04),transparent_40%)]" />
      <SiteHeader />
      <main className="relative w-full max-w-full overflow-x-hidden pb-24 pt-8">
        <div className="mx-auto w-full min-w-0 max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="mb-6 min-w-0 overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/90 p-4 shadow-soft backdrop-blur-xl sm:mb-8 sm:rounded-[1.75rem] sm:p-8">
            <div className={`flex min-w-0 flex-col gap-4 ${isRtl ? "text-right" : "text-left"}`}>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">LOUREX PORTAL</span>
                <h1 className="mt-2 break-words text-2xl font-extrabold tracking-tight text-heading sm:text-[2rem]">
                  {isRtl ? "بوابة العميل" : "Customer Portal"}
                </h1>
              </div>
              <nav className="flex w-full min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={isRtl ? "تنقل بوابة العميل" : "Customer portal navigation"}>
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `inline-flex min-h-11 min-w-max flex-none shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-[13px] font-semibold leading-none transition-colors sm:px-4 sm:text-sm ${
                        isActive
                          ? "bg-primary-soft text-primary ring-1 ring-primary/20"
                          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                      }`
                    }
                  >
                    <link.icon className="h-4 w-4 shrink-0" />
                    <span className="block shrink-0 whitespace-nowrap break-normal" style={{ whiteSpace: "nowrap", wordBreak: "keep-all" }}>{link.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
          <Outlet />
        </div>
      </main>
      {FLOATING_AI_ENABLED && <CustomerAIAssistantStub requests={requests} deals={deals} />}
    </div>
  );
};
import { BellRing, ClipboardList, LayoutDashboard, Radar, Route } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useI18n } from "@/lib/i18n";

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

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-stone-950 text-stone-100 selection:bg-amber-500/30 selection:text-amber-200">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.03),transparent_40%)] pointer-events-none" />
      <SiteHeader />
      <main className="relative w-full max-w-full overflow-x-hidden pb-24 pt-8">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 rounded-[2rem] border border-amber-200/10 bg-stone-900/55 p-6 shadow-2xl shadow-black/25 backdrop-blur-xl">
            <div className={`flex flex-col gap-4 ${isRtl ? "text-right" : "text-left"}`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500/80">LOUREX PORTAL</span>
                <h1 className="mt-1 font-serif text-2xl font-bold text-stone-100 md:text-3xl">
                  {isRtl ? "بوابة العميل" : "Customer Portal"}
                </h1>
              </div>
              <nav className="flex max-w-full gap-2 overflow-x-auto pb-1" aria-label={isRtl ? "تنقل بوابة العميل" : "Customer portal navigation"}>
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `flex min-w-fit items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/20"
                          : "text-stone-400 hover:bg-stone-800/70 hover:text-stone-100"
                      }`
                    }
                  >
                    <link.icon className="h-4 w-4 shrink-0" />
                    <span>{link.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
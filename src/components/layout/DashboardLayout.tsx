import {
  Activity,
  BarChart3,
  BellRing,
  Boxes,
  BrainCircuit,
  ClipboardList,
  FilePenLine,
  Files,
  LayoutDashboard,
  PackageSearch,
  Receipt,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { dashboardRoutePermissions } from "@/features/auth/rbac";
import { getEntityLabel, getRoleDisplayName, getWorkspaceDescription, getWorkspaceTitle } from "@/lib/identity";
import { useI18n } from "@/lib/i18n";
import { useSidebarAlertSummary } from "./useSidebarAlertSummary";
import { SidebarNavBadge } from "./SidebarNavBadge";

export const DashboardLayout = () => {
  const { profile } = useAuthSession();
  const { t, lang } = useI18n();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const workspaceTitle = profile ? getWorkspaceTitle(profile, t) : t("identity.workspaces.operations_employee.title");
  const workspaceDescription = profile ? getWorkspaceDescription(profile, t) : "";
  const roleLabel = profile ? getRoleDisplayName(profile.role, t) : t("identity.labels.role");
  const entityLabel = profile ? getEntityLabel(profile, t) : null;
  const alertSummary = useSidebarAlertSummary();

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const timer = setTimeout(() => {
      const activeItem = nav.querySelector('.active-nav-item');
      const badgedItems = nav.querySelectorAll('.badged-nav-item');
      
      let targetEl = activeItem;
      if (activeItem && activeItem.classList.contains('badged-nav-item')) {
        targetEl = activeItem;
      } else if (badgedItems.length > 0) {
        targetEl = badgedItems[0];
      }

      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname, alertSummary]);

  const dashboardLinks = [
    { to: "/dashboard", label: t("dashboardNav.overview"), icon: LayoutDashboard, end: true, roles: dashboardRoutePermissions.overview },
    { to: "/dashboard/predictive-intelligence", label: lang === "ar" ? "الذكاء التنبؤي" : "Predictive Intelligence", icon: BrainCircuit, roles: dashboardRoutePermissions.predictiveIntelligence },
    { to: "/dashboard/requests", label: t("dashboardNav.requests"), icon: ClipboardList, roles: dashboardRoutePermissions.requests, badge: alertSummary.purchaseRequests },
    { to: "/dashboard/products", label: lang === "ar" ? "المنتجات" : "Products", icon: Boxes, roles: dashboardRoutePermissions.products },
    { to: "/dashboard/customers", label: t("dashboardNav.customers"), icon: Users, roles: dashboardRoutePermissions.customers },
    { to: "/dashboard/deals", label: t("dashboardNav.deals"), icon: PackageSearch, roles: dashboardRoutePermissions.deals, badge: alertSummary.deals },
    { to: "/dashboard/tracking", label: t("dashboardNav.tracking"), icon: Files, roles: dashboardRoutePermissions.tracking, badge: alertSummary.tracking },
    { to: "/dashboard/accounting", label: t("dashboardNav.accounting"), icon: Receipt, roles: dashboardRoutePermissions.accounting, badge: alertSummary.accounting },
    { to: "/dashboard/edit-requests", label: t("dashboardNav.editRequests"), icon: FilePenLine, roles: dashboardRoutePermissions.editRequests, badge: alertSummary.editRequests },
    { to: "/dashboard/settlements", label: t("dashboardNav.settlements"), icon: Scale, roles: dashboardRoutePermissions.settlements, badge: alertSummary.settlements },
    { to: "/dashboard/audit", label: t("dashboardNav.audit"), icon: ShieldCheck, roles: dashboardRoutePermissions.audit },
    { to: "/dashboard/reports", label: t("dashboardNav.reports"), icon: BarChart3, roles: dashboardRoutePermissions.reports },
    { to: "/dashboard/notifications", label: lang === "ar" ? "الإشعارات" : "Notifications", icon: BellRing, roles: dashboardRoutePermissions.system, badge: alertSummary.notifications },
    { to: "/dashboard/system", label: t("dashboardNav.system"), icon: SlidersHorizontal, roles: dashboardRoutePermissions.system, badge: alertSummary.system },
    {
      to: "/dashboard/health",
      label: lang === "ar" ? "الصحة والجاهزية" : "Health & Readiness",
      icon: Activity,
      roles: dashboardRoutePermissions.system,
      badge: alertSummary.system
    },
  ];

  const visibleLinks = dashboardLinks.filter((link) => profile && link.roles.includes(profile.role));

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-stone-950 text-stone-100">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(251,191,36,0.10),transparent_28%),radial-gradient(circle_at_90%_18%,rgba(255,255,255,0.04),transparent_24%),linear-gradient(180deg,#0c0a09_0%,#11100e_48%,#0c0a09_100%)]" />
        <div className="absolute inset-x-12 top-24 h-px bg-gradient-to-r from-transparent via-amber-200/20 to-transparent" />
      </div>

      <div className="relative z-10">
        <SiteHeader />
        <div className="mx-auto grid w-full max-w-[1700px] gap-5 overflow-x-hidden px-4 pb-5 pt-16 sm:px-6 lg:px-8 xl:grid-cols-[270px_minmax(0,1fr)]">
          <aside
            className="w-full max-w-full min-w-0 rounded-[1.75rem] border border-amber-200/10 bg-stone-900/65 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl xl:sticky xl:top-[4.5rem] xl:self-start"
            aria-label="Sidebar"
          >
            <div className="mb-3 h-1 rounded-full bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />

            <div className="mb-3 rounded-2xl border border-amber-200/10 bg-stone-950/45 p-4 shadow-inner shadow-black/20">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/70">
                {t("identity.labels.workspace")}
              </p>
              <h2 className="mt-2 break-words font-serif text-base font-bold leading-snug text-stone-100">
                {workspaceTitle}
              </h2>
              {workspaceDescription ? (
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-400">
                  {workspaceDescription}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="max-w-full break-words rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-200">
                  {t("identity.labels.role")}: {roleLabel}
                </span>
                <span className="max-w-full break-words rounded-full border border-amber-200/10 bg-stone-50/5 px-2.5 py-0.5 text-[10px] font-semibold text-stone-300">
                  Executive workspace
                </span>
                {entityLabel ? (
                  <span className="max-w-full break-words rounded-full border border-amber-200/10 bg-stone-50/5 px-2.5 py-0.5 text-[10px] font-medium text-stone-300">
                    {t("identity.labels.entity")}: {entityLabel}
                  </span>
                ) : null}
              </div>
            </div>

            <nav ref={navRef} className="flex w-full max-w-full min-w-0 gap-2 overflow-x-auto pb-1 xl:block xl:space-y-1 xl:overflow-visible xl:pb-0 scroll-smooth" aria-label={t("nav.dashboardNavigation")}>
              {visibleLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex min-w-fit items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 xl:min-w-0 nav-item ${
                      isActive
                        ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/20 shadow-lg shadow-black/20 active-nav-item"
                        : "text-stone-400 hover:bg-stone-800/70 hover:text-stone-100"
                    } ${link.badge ? 'badged-nav-item' : ''}`
                  }
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 whitespace-nowrap xl:truncate">{link.label}</span>
                  {link.badge && (
                    <SidebarNavBadge
                      count={link.badge.count}
                      severity={link.badge.severity}
                      pulse={link.badge.severity === "critical"}
                    />
                  )}
                </NavLink>
              ))}
            </nav>
          </aside>

          <main className="w-full max-w-full min-w-0 overflow-x-hidden pb-24 lg:pb-12">
            <div className="mb-5 w-full max-w-full min-w-0 rounded-[1.75rem] border border-amber-200/10 bg-stone-900/55 px-4 py-4 shadow-2xl shadow-black/25 backdrop-blur-xl sm:px-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-200/70">
                    {t("identity.labels.workspace")}
                  </p>
                  <h1 className="mt-1.5 break-words font-serif text-xl font-semibold text-stone-100">
                    {workspaceTitle}
                  </h1>
                  {workspaceDescription ? (
                    <p className="mt-1.5 break-words text-sm leading-6 text-stone-400">
                      {workspaceDescription}
                    </p>
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-wrap gap-2">
                  <span className="max-w-full break-words rounded-full border border-amber-500/20 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-200">
                    {t("identity.labels.role")}: {roleLabel}
                  </span>
                  {entityLabel ? (
                    <span className="max-w-full break-words rounded-full border border-amber-200/10 bg-stone-50/5 px-3.5 py-1.5 text-xs font-medium text-stone-300">
                      {t("identity.labels.entity")}: {entityLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
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
    if (!nav || window.matchMedia("(min-width: 1280px)").matches) return;

    // Reveal only the active destination; alert badges should never drag the
    // mobile strip to a different page and cut off the first navigation items.
    const frame = requestAnimationFrame(() => {
      const active = nav.querySelector<HTMLElement>(".active-nav-item");
      if (!active) return;
      const navRect = nav.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      const margin = 12;
      if (itemRect.left < navRect.left + margin) {
        nav.scrollBy({ left: itemRect.left - navRect.left - margin, behavior: "instant" });
      } else if (itemRect.right > navRect.right - margin) {
        nav.scrollBy({ left: itemRect.right - navRect.right + margin, behavior: "instant" });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

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
    <div className="lourex-workspace min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_6%_8%,rgba(170,54,36,0.06),transparent_35%)] dark:bg-[radial-gradient(ellipse_at_6%_8%,rgba(214,173,108,0.035),transparent_32%)]" />
        <div className="absolute inset-x-12 top-24 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
      </div>

      <div className="relative z-10">
        <SiteHeader />
        <div className="mx-auto grid w-full max-w-[1700px] gap-6 overflow-x-hidden px-4 pb-6 pt-7 sm:px-6 lg:px-8 xl:grid-cols-[258px_minmax(0,1fr)]">
          <aside
            className="lrx-dashboard-side w-full max-w-full min-w-0 rounded-[1.75rem] border border-border/70 bg-card/90 p-3 shadow-soft backdrop-blur-xl xl:sticky xl:top-[5.5rem] xl:self-start"
            aria-label={lang === "ar" ? "التنقل في لوحة الإدارة" : "Dashboard navigation panel"}
          >
            <div className="mb-5 ms-3 hidden xl:block h-0.5 w-10 rounded-full bg-primary" />

            <div className="mb-5 hidden xl:block rounded-2xl border border-border/50 bg-secondary/55 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                {t("identity.labels.workspace")}
              </p>
              <h2 className="mt-2 break-words text-lg font-bold leading-snug text-heading">
                {workspaceTitle}
              </h2>
              {workspaceDescription ? (
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {workspaceDescription}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="max-w-full break-words rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-semibold text-primary">
                  {t("identity.labels.role")}: {roleLabel}
                </span>
                <span className="max-w-full break-words rounded-full border border-border/70 bg-card px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  {lang === "ar" ? "مساحة الإدارة" : "Executive workspace"}
                </span>
                {entityLabel ? (
                  <span className="max-w-full break-words rounded-full border border-border/70 bg-card px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                    {t("identity.labels.entity")}: {entityLabel}
                  </span>
                ) : null}
              </div>
            </div>

            <nav ref={navRef} className="lrx-dashboard-nav flex w-full max-w-full min-w-0 gap-2 overflow-x-auto pb-1 xl:block xl:space-y-1 xl:overflow-visible xl:pb-0" aria-label={t("nav.dashboardNavigation")}>
              {visibleLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex min-h-11 min-w-fit items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-200 xl:min-w-0 nav-item ${
                      isActive
                        ? "bg-primary-soft font-bold text-primary ring-1 ring-primary/10 active-nav-item"
                        : "text-muted-foreground hover:bg-secondary hover:text-heading"
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
            <div className="lrx-workspace-heading mb-6 w-full max-w-full min-w-0 rounded-[1.75rem] border border-border/70 bg-card/90 px-5 py-6 shadow-soft sm:px-7">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
                    {t("identity.labels.workspace")}
                  </p>
                  <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-heading sm:text-[1.85rem]">
                    {workspaceTitle}
                  </h1>
                  {workspaceDescription ? (
                    <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
                      {workspaceDescription}
                    </p>
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-wrap gap-2">
                  <span className="max-w-full break-words rounded-full bg-primary-soft px-3.5 py-1.5 text-xs font-semibold text-primary">
                    {t("identity.labels.role")}: {roleLabel}
                  </span>
                  {entityLabel ? (
                    <span className="max-w-full break-words rounded-full border border-border/70 bg-secondary/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
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
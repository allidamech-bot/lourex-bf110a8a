import {
  BarChart3,
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
import { NavLink, Outlet } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { dashboardRoutePermissions } from "@/features/auth/rbac";
import { getEntityLabel, getRoleDisplayName, getWorkspaceDescription, getWorkspaceTitle } from "@/lib/identity";
import { useI18n } from "@/lib/i18n";

export const DashboardLayout = () => {
  const { profile } = useAuthSession();
  const { t } = useI18n();
  const workspaceTitle = profile ? getWorkspaceTitle(profile, t) : t("identity.workspaces.operations_employee.title");
  const workspaceDescription = profile ? getWorkspaceDescription(profile, t) : "";
  const roleLabel = profile ? getRoleDisplayName(profile.role, t) : t("identity.labels.role");
  const entityLabel = profile ? getEntityLabel(profile, t) : null;

  const dashboardLinks = [
    {
      to: "/dashboard",
      label: t("dashboardNav.overview"),
      icon: LayoutDashboard,
      end: true,
      roles: dashboardRoutePermissions.overview,
    },
    {
      to: "/dashboard/requests",
      label: t("dashboardNav.requests"),
      icon: ClipboardList,
      roles: dashboardRoutePermissions.requests,
    },
    {
      to: "/dashboard/customers",
      label: t("dashboardNav.customers"),
      icon: Users,
      roles: dashboardRoutePermissions.customers,
    },
    {
      to: "/dashboard/deals",
      label: t("dashboardNav.deals"),
      icon: PackageSearch,
      roles: dashboardRoutePermissions.deals,
    },
    {
      to: "/dashboard/tracking",
      label: t("dashboardNav.tracking"),
      icon: Files,
      roles: dashboardRoutePermissions.tracking,
    },
    {
      to: "/dashboard/accounting",
      label: t("dashboardNav.accounting"),
      icon: Receipt,
      roles: dashboardRoutePermissions.accounting,
    },
    {
      to: "/dashboard/edit-requests",
      label: t("dashboardNav.editRequests"),
      icon: FilePenLine,
      roles: dashboardRoutePermissions.editRequests,
    },
    {
      to: "/dashboard/settlements",
      label: t("dashboardNav.settlements"),
      icon: Scale,
      roles: dashboardRoutePermissions.settlements,
    },
    {
      to: "/dashboard/audit",
      label: t("dashboardNav.audit"),
      icon: ShieldCheck,
      roles: dashboardRoutePermissions.audit,
    },
    {
      to: "/dashboard/reports",
      label: t("dashboardNav.reports"),
      icon: BarChart3,
      roles: dashboardRoutePermissions.reports,
    },
    {
      to: "/dashboard/system",
      label: t("dashboardNav.system"),
      icon: SlidersHorizontal,
      roles: dashboardRoutePermissions.system,
    },
  ];

  const visibleLinks = dashboardLinks.filter((link) => profile && link.roles.includes(profile.role));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0F172A" }}>
      <SiteHeader />
      <div className="container mx-auto grid gap-5 px-4 py-5 md:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">

        {/* ── Sidebar ── */}
        <aside
          className="glass-sidebar p-3 lg:sticky lg:top-[4.5rem] lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto"
          aria-label="Sidebar"
        >
          {/* Workspace badge */}
          <div
            className="mb-3 rounded-xl p-3"
            style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}
          >
            <p className="text-[10px] uppercase tracking-[0.22em] text-blue-400/70">
              {t("identity.labels.workspace")}
            </p>
            <h2 className="mt-1.5 font-serif text-base font-bold text-white leading-snug">
              {workspaceTitle}
            </h2>
            {workspaceDescription ? (
              <p className="mt-1.5 text-xs leading-5 text-slate-400 line-clamp-2">
                {workspaceDescription}
              </p>
            ) : null}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-blue-200"
                style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.18)" }}
              >
                {t("identity.labels.role")}: {roleLabel}
              </span>
              {entityLabel ? (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-medium text-slate-300"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {t("identity.labels.entity")}: {entityLabel}
                </span>
              ) : null}
            </div>
          </div>

          {/* Nav links */}
          <nav className="space-y-0.5" aria-label={t("nav.dashboardNavigation")}>
            {visibleLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-500/15 text-blue-200 ring-1 ring-blue-400/25 shadow-sm"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                  }`
                }
              >
                <link.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="min-w-0 pb-12">
          {/* Workspace context header */}
          <div
            className="mb-5 rounded-2xl px-5 py-4"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-blue-400/70">
                  {t("identity.labels.workspace")}
                </p>
                <h1 className="mt-1.5 font-serif text-xl font-semibold text-white">
                  {workspaceTitle}
                </h1>
                {workspaceDescription ? (
                  <p className="mt-1.5 text-sm leading-6 text-slate-400">
                    {workspaceDescription}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className="rounded-full px-3.5 py-1.5 text-xs font-medium text-blue-200"
                  style={{ background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.18)" }}
                >
                  {t("identity.labels.role")}: {roleLabel}
                </span>
                {entityLabel ? (
                  <span
                    className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
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
  );
};

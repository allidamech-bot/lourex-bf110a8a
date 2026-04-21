import {
  BarChart3,
  ClipboardList,
  FilePenLine,
  Files,
  LayoutDashboard,
  PackageSearch,
  Receipt,
  ShieldCheck,
  Users,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { dashboardRoutePermissions } from "@/features/auth/rbac";
import { useI18n } from "@/lib/i18n";

export const DashboardLayout = () => {
  const { profile } = useAuthSession();
  const { t } = useI18n();

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
  ];

  const visibleLinks = dashboardLinks.filter((link) => profile && link.roles.includes(profile.role));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto grid gap-6 px-4 py-8 md:px-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <div className="mb-5 rounded-2xl bg-secondary/70 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              {t("workspace.operatingSystem")}
            </p>
            <h2 className="mt-2 font-serif text-xl font-bold">
              {profile ? t(`roles.${profile.role}`) : t("workspace.operationsRoom")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {profile ? t(`workspace.roleDescriptions.${profile.role}`) : ""}
            </p>
          </div>
          <nav className="space-y-1">
            {visibleLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`
                }
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          <div className="mb-6 rounded-[1.9rem] border border-primary/15 bg-[linear-gradient(180deg,hsla(var(--card)/0.98),hsla(var(--card)/0.9))] px-6 py-5 shadow-[0_24px_55px_-38px_rgba(0,0,0,0.32)] dark:shadow-[0_24px_55px_-38px_rgba(0,0,0,0.65)]">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-primary/80">
                  {t("workspace.operationsRoom")}
                </p>
                <h1 className="mt-2 font-serif text-2xl font-semibold">
                  {t("workspace.environmentTitle")}
                </h1>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {t("workspace.environmentDescription")}
                </p>
              </div>
              <div className="rounded-full bg-primary/10 px-4 py-2 text-xs font-medium text-primary">
                {profile ? t(`roles.${profile.role}`) : t("workspace.accessLabel")}
              </div>
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

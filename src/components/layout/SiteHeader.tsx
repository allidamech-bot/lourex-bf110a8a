import { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, Shield, UserCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { getDefaultRouteForRole } from "@/features/auth/rbac";
import { getRoleDisplayName, getWorkspaceTitle } from "@/lib/identity";
import { useI18n } from "@/lib/i18n";

export const SiteHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();
  const { user, profile, signOut } = useAuthSession();
  const navigate = useNavigate();

  const publicLinks = useMemo(
    () => [
      { to: "/", label: t("nav.home") },
      {
        to: profile?.role === "customer" ? "/customer-portal/requests" : profile ? "/dashboard/requests" : "/request",
        label: t("nav.purchaseRequest"),
      },
      {
        to: profile?.role === "customer" ? "/customer-portal/tracking" : profile ? "/dashboard/tracking" : "/track",
        label: t("nav.trackShipment"),
      },
      { to: "/why-lourex", label: t("nav.whyLourex") },
      { to: "/contact", label: t("nav.contact") },
    ],
    [profile, t],
  );

  const workspaceLink = profile ? getDefaultRouteForRole(profile.role) : "/auth";
  const workspaceLabel = profile
    ? getWorkspaceTitle(profile, t)
    : t("nav.signIn");
  const roleLabel = profile ? getRoleDisplayName(profile.role, t) : null;

  const handleLogout = async () => {
    await signOut();
    toast.success(t("nav.signOut"));
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-20 items-center justify-between gap-4 px-4 md:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-3">
          <img src="/logo.png" alt="Lourex" className="h-11 w-11 rounded-2xl object-contain" />
          <div className="flex items-center">
            <p className="font-serif text-xl font-bold tracking-wide text-foreground">LOUREX</p>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {publicLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          {user && profile ? (
            <NavLink
              to={workspaceLink}
              className={({ isActive }) =>
                `rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`
              }
            >
              {workspaceLabel}
            </NavLink>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-2 lg:gap-3">
          {user ? <NotificationBell userId={user.id} /> : null}
          <ThemeToggle />
          <LanguageSwitcher />

          {profile?.role === "owner" ? (
            <Button variant="outline" asChild className="hidden lg:inline-flex">
              <Link to="/admin">
                <Shield className="me-2 h-4 w-4" />
                {t("nav.admin")}
              </Link>
            </Button>
          ) : null}

          {user && profile ? (
            <>
              <div className="hidden rounded-full border border-border/60 bg-card px-4 py-2 text-xs text-muted-foreground lg:block">
                {roleLabel}
              </div>

              <Button variant="outline" asChild className="hidden lg:inline-flex">
                <Link to={workspaceLink}>
                  <UserCircle2 className="me-2 h-4 w-4" />
                  {workspaceLabel}
                </Link>
              </Button>

              <Button variant="ghost" onClick={handleLogout} className="hidden lg:inline-flex">
                <LogOut className="me-2 h-4 w-4" />
                {t("nav.signOut")}
              </Button>
            </>
          ) : (
            <Button variant="gold" asChild className="hidden lg:inline-flex">
              <Link to="/auth">{t("nav.signIn")}</Link>
            </Button>
          )}

          <button className="rounded-lg p-2 text-foreground lg:hidden" onClick={() => setIsOpen((value) => !value)}>
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="border-t border-border/60 bg-background lg:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-4">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </NavLink>
            ))}

            {user && profile ? (
              <>
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {roleLabel}
                </div>

                {profile.role === "owner" ? (
                  <NavLink
                    to="/admin"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {t("nav.admin")}
                  </NavLink>
                ) : null}

                <NavLink
                  to={workspaceLink}
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {workspaceLabel}
                </NavLink>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    void handleLogout();
                  }}
                  className="rounded-lg px-3 py-2 text-start text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {t("nav.signOut")}
                </button>
              </>
            ) : (
              <Button variant="gold" asChild className="mt-2">
                <Link to="/auth" onClick={() => setIsOpen(false)}>
                  {t("nav.signIn")}
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
};

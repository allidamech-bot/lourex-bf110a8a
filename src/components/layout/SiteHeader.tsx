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

const getSafeLabel = (value: string, fallback: string) => {
  if (!value || value.includes(".")) return fallback;
  return value;
};

export const SiteHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();
  const { user, profile, signOut } = useAuthSession();
  const navigate = useNavigate();

  const userEmail = profile?.email || user?.email || "";
  const userName =
      profile?.fullName ||
      String(user?.user_metadata?.full_name || user?.user_metadata?.name || "").trim() ||
      userEmail.split("@")[0] ||
      getSafeLabel(t("common.customer"), "Customer");

  const publicLinks = useMemo(
      () => [
        { to: "/", label: getSafeLabel(t("nav.home"), "Home") },
        {
          to: profile?.role === "customer" ? "/customer-portal/requests" : profile ? "/dashboard/requests" : "/request",
          label: getSafeLabel(t("nav.purchaseRequest"), "Purchase Request"),
        },
        {
          to: profile?.role === "customer" ? "/customer-portal/tracking" : profile ? "/dashboard/tracking" : "/track",
          label: getSafeLabel(t("nav.trackShipment"), "Track Shipment"),
        },
        { to: "/privacy", label: getSafeLabel(t("nav.privacy"), "Privacy Policy") },
        { to: "/terms", label: getSafeLabel(t("nav.guidelines"), "Guidelines") },
        { to: "/contact", label: getSafeLabel(t("nav.contact"), "Contact") },
      ],
      [profile, t],
  );

  const workspaceLink = profile ? getDefaultRouteForRole(profile.role) : user ? "/profile" : "/auth";
  const workspaceLabel = profile
      ? getWorkspaceTitle(profile, t)
      : user
          ? getSafeLabel(t("nav.profile"), "Profile")
          : getSafeLabel(t("nav.signIn"), "Sign in");

  const roleLabel = profile ? getRoleDisplayName(profile.role, t) : null;

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut();
    toast.success(getSafeLabel(t("nav.signOut"), "Signed out"));
    navigate("/");
  };

  return (
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-20 items-center justify-between gap-4 px-4 md:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-3" onClick={() => setIsOpen(false)}>
            <img src="/logo.png" alt="Lourex" className="h-11 w-11 rounded-2xl object-contain" />
            <div className="flex items-center">
              <p className="font-serif text-xl font-bold tracking-wide text-foreground">LOUREX</p>
            </div>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {publicLinks.map((link) => (
                <NavLink
                    key={`${link.to}-${link.label}`}
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

            {user ? (
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
                    {getSafeLabel(t("nav.admin"), "Admin")}
                  </Link>
                </Button>
            ) : null}

            {user ? (
                <>
                  <Link
                      to={workspaceLink}
                      className="hidden max-w-[260px] items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-2 transition-colors hover:border-primary/30 hover:bg-secondary/40 lg:flex"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {userName.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="min-w-0 text-start">
                      <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
                      <p className="truncate text-xs text-muted-foreground">{userEmail || roleLabel || workspaceLabel}</p>
                    </div>
                  </Link>

                  <Button variant="outline" asChild className="hidden lg:inline-flex">
                    <Link to={workspaceLink}>
                      <UserCircle2 className="me-2 h-4 w-4" />
                      {workspaceLabel}
                    </Link>
                  </Button>

                  <Button variant="ghost" onClick={handleLogout} className="hidden lg:inline-flex">
                    <LogOut className="me-2 h-4 w-4" />
                    {getSafeLabel(t("nav.signOut"), "Sign out")}
                  </Button>
                </>
            ) : (
                <Button variant="gold" asChild className="hidden lg:inline-flex">
                  <Link to="/auth">{getSafeLabel(t("nav.signIn"), "Sign in")}</Link>
                </Button>
            )}

            <button
                type="button"
                className="rounded-lg p-2 text-foreground lg:hidden"
                onClick={() => setIsOpen((value) => !value)}
                aria-label="Toggle navigation menu"
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {isOpen ? (
            <div className="border-t border-border/60 bg-background lg:hidden">
              <div className="container mx-auto flex flex-col gap-1 px-4 py-4">
                {user ? (
                    <div className="mb-3 rounded-2xl border border-border/60 bg-card px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                          {userName.slice(0, 1).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
                          <p className="truncate text-xs text-muted-foreground">{userEmail || roleLabel || workspaceLabel}</p>
                        </div>
                      </div>

                      {roleLabel ? (
                          <p className="mt-3 rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                            {roleLabel}
                          </p>
                      ) : null}
                    </div>
                ) : null}

                {publicLinks.map((link) => (
                    <NavLink
                        key={`${link.to}-${link.label}`}
                        to={link.to}
                        onClick={() => setIsOpen(false)}
                        className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      {link.label}
                    </NavLink>
                ))}

                {user ? (
                    <>
                      {profile?.role === "owner" ? (
                          <NavLink
                              to="/admin"
                              onClick={() => setIsOpen(false)}
                              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            {getSafeLabel(t("nav.admin"), "Admin")}
                          </NavLink>
                      ) : null}

                      <NavLink
                          to={workspaceLink}
                          onClick={() => setIsOpen(false)}
                          className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        {workspaceLabel}
                      </NavLink>

                      <NavLink
                          to="/profile"
                          onClick={() => setIsOpen(false)}
                          className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        {getSafeLabel(t("nav.profile"), "Profile")}
                      </NavLink>

                      <button
                          type="button"
                          onClick={() => void handleLogout()}
                          className="rounded-lg px-3 py-2 text-start text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        {getSafeLabel(t("nav.signOut"), "Sign out")}
                      </button>
                    </>
                ) : (
                    <Button variant="gold" asChild className="mt-2">
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        {getSafeLabel(t("nav.signIn"), "Sign in")}
                      </Link>
                    </Button>
                )}
              </div>
            </div>
        ) : null}
      </header>
  );
};
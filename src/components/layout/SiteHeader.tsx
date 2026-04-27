import { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, Shield, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { getRoleDisplayName, getWorkspaceTitle } from "@/lib/identity";
import { useI18n } from "@/lib/i18n";

// Removed getSafeLabel as t() should handle missing keys or fallbacks gracefully via i18n.tsx

export const SiteHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { lang, t } = useI18n();
  const { user, profile, signOut } = useAuthSession();
  const navigate = useNavigate();
  const isRtl = lang === "ar";

  const isAuthenticated = Boolean(user || profile);
  const userEmail = profile?.email || user?.email || "";
  const signInLabel = t("nav.signIn");
  const signOutLabel = t("nav.signOut");

  const userName =
      profile?.fullName ||
      String(user?.user_metadata?.full_name || user?.user_metadata?.name || "").trim() ||
      userEmail ||
      t("common.customer");

  const publicLinks = useMemo(
      () => [
        { to: "/", label: t("nav.home") },
        { to: "/request", label: t("nav.purchaseRequest") },
        { to: isAuthenticated ? "/customer-portal/requests" : "/auth", label: t("customerPortal.actions.requests.title") },
        { to: isAuthenticated ? "/customer-portal/tracking" : "/track", label: t("customerPortal.actions.tracking.title") },
        { to: "/guidelines", label: t("nav.guidelines") },
        { to: "/contact", label: t("nav.contact") },
      ],
      [isAuthenticated, t],
  );

  const workspaceLabel = profile
      ? getWorkspaceTitle(profile, t)
      : user
          ? t("nav.profile")
          : t("nav.signIn");

  const roleLabel = profile ? getRoleDisplayName(profile.role, t) : null;
  const canSeeDashboardMenu = profile?.role === "owner" || profile?.role === "saudi_partner";

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut();
    toast.success(t("nav.signOut"));
    navigate("/");
  };

  return (
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 shadow-[0_1px_0_rgba(212,175,55,0.12)] backdrop-blur" dir={isRtl ? "rtl" : "ltr"}>
        <div className="mx-auto flex h-16 max-w-[1440px] items-center px-4 sm:px-6 xl:hidden" dir={isRtl ? "rtl" : "ltr"}>
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex shrink-0 items-center">
              <Link
                  to="/"
                  className="flex shrink-0 items-center gap-3"
                  onClick={() => setIsOpen(false)}
              >
                <img src="/logo.png" alt="Lourex" className="h-10 w-10 rounded-xl object-contain" />
                <p className="font-serif text-xl font-bold tracking-wide text-foreground">LOUREX</p>
              </Link>
            </div>

            <div className="flex shrink-0 items-center">
              <button
                  type="button"
                  className="rounded-lg border border-border/80 bg-card p-2 text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  onClick={() => setIsOpen((value) => !value)}
                  aria-label="Toggle navigation menu"
              >
                {isOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto hidden h-16 max-w-[1440px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 xl:grid" dir="ltr">
          <Link
              to="/"
              className="flex shrink-0 items-center gap-3"
              onClick={() => setIsOpen(false)}
          >
            <img src="/logo.png" alt="Lourex" className="h-10 w-10 rounded-xl object-contain" />
            <p className="font-serif text-xl font-bold tracking-wide text-foreground">LOUREX</p>
          </Link>

          <nav className="hidden min-w-0 items-center justify-center gap-1 xl:flex 2xl:gap-2" dir={isRtl ? "rtl" : "ltr"}>
            {canSeeDashboardMenu ? (
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        `whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold transition-colors 2xl:px-3 2xl:text-sm ${
                            isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                        }`
                    }
                >
                  {t("nav.dashboard")}
                </NavLink>
            ) : null}

            {publicLinks.map((link) => (
                <NavLink
                    key={`${link.to}-${link.label}`}
                    to={link.to}
                    className={({ isActive }) =>
                        `whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold transition-colors 2xl:px-3 2xl:text-sm ${
                            isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                        }`
                    }
                >
                  {link.label}
                </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-2" dir={isRtl ? "rtl" : "ltr"}>
            <div className="hidden shrink-0 items-center gap-2 xl:flex">
              {isAuthenticated ? (
                  <>
                    <Link
                        to="/profile"
                        className="flex min-w-0 max-w-[160px] items-center gap-2 rounded-lg border border-border/80 bg-card px-2.5 py-1.5 transition-colors hover:border-primary/50 hover:bg-secondary/70 2xl:max-w-[230px] 2xl:px-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                        {userName.slice(0, 1).toUpperCase()}
                      </div>

                      <div className="min-w-0 text-start">
                        <p className="truncate text-sm font-semibold leading-5 text-foreground">{userName}</p>
                        <p className="truncate text-xs leading-4 text-muted-foreground">{userEmail || roleLabel || workspaceLabel}</p>
                      </div>
                    </Link>

                    {profile?.role === "owner" ? (
                        <Button variant="gold-outline" asChild className="h-9 w-9 px-0 2xl:w-auto 2xl:px-3">
                          <Link to="/admin" aria-label={t("nav.admin")}>
                            <Shield className="h-4 w-4 2xl:me-2" />
                            <span className="hidden 2xl:inline">{t("nav.admin")}</span>
                          </Link>
                        </Button>
                    ) : null}

                    {user ? <NotificationBell userId={user.id} /> : null}
                    <LanguageSwitcher />
                    <ThemeToggle />

                    <Button variant="ghost" onClick={handleLogout} className="h-9 w-9 px-0 text-muted-foreground hover:bg-secondary/80 hover:text-primary 2xl:w-auto 2xl:px-3">
                      <LogOut className="h-4 w-4 2xl:me-2" />
                      <span className="hidden whitespace-nowrap 2xl:inline">{t("nav.signOut")}</span>
                    </Button>
                  </>
              ) : (
                  <>
                    <LanguageSwitcher />
                    <ThemeToggle />
                    <Button variant="gold" asChild className="h-9 px-4">
                      <Link to="/auth">{t("nav.signIn")}</Link>
                    </Button>
                  </>
              )}
            </div>

          </div>
        </div>

        {isOpen ? (
            <div className="border-t border-border/80 bg-background xl:hidden">
              <div className="container mx-auto flex flex-col gap-1 px-4 py-4" dir={isRtl ? "rtl" : "ltr"}>
                {isAuthenticated ? (
                    <Link
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className="mb-3 block rounded-2xl border border-border/80 bg-card px-4 py-4 transition-colors hover:border-primary/50 hover:bg-secondary/70"
                    >
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
                          <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
                            {roleLabel}
                          </p>
                      ) : null}
                    </Link>
                ) : null}

                <div className="mb-3 flex items-center gap-3 rounded-xl border border-border/80 bg-card px-3 py-2">
                  {user ? <NotificationBell userId={user.id} /> : null}
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>

                {publicLinks.map((link) => (
                    <NavLink
                        key={`${link.to}-${link.label}`}
                        to={link.to}
                        onClick={() => setIsOpen(false)}
                        className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      {link.label}
                    </NavLink>
                ))}

                {isAuthenticated ? (
                    <>
                      {canSeeDashboardMenu ? (
                          <NavLink
                              to="/dashboard"
                              onClick={() => setIsOpen(false)}
                              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            {t("nav.dashboard")}
                          </NavLink>
                      ) : null}

                      {profile?.role === "owner" ? (
                          <NavLink
                              to="/admin"
                              onClick={() => setIsOpen(false)}
                              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            {t("nav.admin")}
                          </NavLink>
                      ) : null}

                      <button
                          type="button"
                          onClick={() => void handleLogout()}
                          className="rounded-lg px-3 py-2 text-start text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                      >
                        {signOutLabel}
                      </button>
                    </>
                ) : (
                    <Button variant="gold" asChild className="mt-2">
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        {signInLabel}
                      </Link>
                    </Button>
                )}
              </div>
            </div>
        ) : null}
      </header>
  );
};

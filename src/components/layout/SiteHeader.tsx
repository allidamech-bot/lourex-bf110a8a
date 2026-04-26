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

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut();
    toast.success(t("nav.signOut"));
    navigate("/");
  };

  return (
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur" dir={isRtl ? "rtl" : "ltr"}>
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-6">
          <div className={`flex min-w-0 flex-1 items-center gap-3 ${isRtl ? "justify-start" : "justify-end"}`}>
            <div className="hidden items-center gap-3 lg:flex">
              {user ? <NotificationBell userId={user.id} /> : null}
              <LanguageSwitcher />
              <ThemeToggle />
            </div>

            {profile?.role === "owner" ? (
                <Button variant="outline" asChild className="hidden h-9 px-3 lg:inline-flex">
                  <Link to="/admin">
                    <Shield className="me-2 h-4 w-4" />
                    {t("nav.admin")}
                  </Link>
                </Button>
            ) : null}

            {isAuthenticated ? (
                <>
                  <Link
                      to="/profile"
                      className="hidden max-w-[220px] items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3 py-1.5 transition-colors hover:border-primary/30 hover:bg-secondary/40 lg:flex"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {userName.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="min-w-0 text-start">
                      <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
                      <p className="truncate text-xs text-muted-foreground">{userEmail || roleLabel || workspaceLabel}</p>
                    </div>
                  </Link>

                  <Button variant="ghost" onClick={handleLogout} className="hidden h-9 px-3 lg:inline-flex">
                    <LogOut className="me-2 h-4 w-4" />
                    {t("nav.signOut")}
                  </Button>
                </>
            ) : (
                <Button variant="gold" asChild className="hidden h-9 px-4 lg:inline-flex">
                  <Link to="/auth">{t("nav.signIn")}</Link>
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

          <nav className="hidden flex-none items-center justify-center gap-6 lg:flex">
            {publicLinks.map((link) => (
                <NavLink
                    key={`${link.to}-${link.label}`}
                    to={link.to}
                    className={({ isActive }) =>
                        `text-sm transition-colors ${
                            isActive
                                ? "font-bold text-foreground"
                                : "font-medium text-muted-foreground opacity-70 hover:opacity-100"
                        }`
                    }
                >
                  {link.label}
                </NavLink>
            ))}
          </nav>

          <div className={`flex min-w-0 flex-1 items-center ${isRtl ? "justify-end" : "justify-start"}`}>
          <Link
              to="/"
              className="flex shrink-0 items-center gap-3"
              onClick={() => setIsOpen(false)}
          >
            <img src="/logo.png" alt="Lourex" className="h-10 w-10 rounded-xl object-contain" />
            <p className="font-serif text-xl font-bold tracking-wide text-foreground">LOUREX</p>
          </Link>
          </div>
        </div>

        {isOpen ? (
            <div className="border-t border-border/60 bg-background lg:hidden">
              <div className="container mx-auto flex flex-col gap-1 px-4 py-4" dir={isRtl ? "rtl" : "ltr"}>
                {isAuthenticated ? (
                    <Link
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className="mb-3 block rounded-2xl border border-border/60 bg-card px-4 py-4 transition-colors hover:border-primary/30 hover:bg-secondary/40"
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
                          <p className="mt-3 rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                            {roleLabel}
                          </p>
                      ) : null}
                    </Link>
                ) : null}

                <div className="mb-3 flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2">
                  {user ? <NotificationBell userId={user.id} /> : null}
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>

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

                {isAuthenticated ? (
                    <>
                      {profile?.role === "owner" ? (
                          <NavLink
                              to="/admin"
                              onClick={() => setIsOpen(false)}
                              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            {t("nav.admin")}
                          </NavLink>
                      ) : null}

                      <button
                          type="button"
                          onClick={() => void handleLogout()}
                          className="rounded-lg px-3 py-2 text-start text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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

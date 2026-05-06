import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, Menu, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { getRoleDisplayName, getWorkspaceTitle } from "@/lib/identity";
import { useI18n } from "@/lib/i18n";

export const SiteHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { lang, t } = useI18n();
  const { user, profile, signOut } = useAuthSession();
  const navigate = useNavigate();
  const isRtl = lang === "ar";

  const isAuthenticated = Boolean(user || profile);
  const isCustomer = profile?.role === "customer";
  const usesDashboardWorkspace = Boolean(profile && profile.role !== "customer");
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
        {
          to: usesDashboardWorkspace
              ? "/dashboard/requests"
              : isCustomer
                  ? "/customer-portal/requests#requests"
                  : "/auth",
          label: t("customerPortal.actions.requests.title"),
        },
        {
          to: usesDashboardWorkspace
              ? "/dashboard/tracking"
              : isCustomer
                  ? "/customer-portal/tracking"
                  : "/track",
          label: t("customerPortal.actions.tracking.title"),
        },
        { to: "/guidelines", label: t("nav.guidelines") },
        { to: "/contact", label: t("nav.contact") },
      ],
      [isCustomer, t, usesDashboardWorkspace],
  );

  const workspaceLabel = profile
      ? getWorkspaceTitle(profile, t)
      : user
          ? t("nav.profile")
          : t("nav.signIn");

  const roleLabel = profile ? getRoleDisplayName(profile.role, t) : null;
  const canSeeDashboardMenu = Boolean(profile && profile.role !== "customer");

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut();
    toast.success(t("nav.signOut"));
    navigate("/");
  };

  return (
      <header
          className="glass-topbar sticky top-0 z-50 w-full max-w-full overflow-x-hidden shadow-[0_4px_24px_-8px_rgba(0,0,0,0.4)]"
          dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Mobile header */}
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center px-4 sm:px-6 lg:hidden">
          <div className="flex w-full items-center justify-between gap-4">
            <Link
                to="/"
                className="flex min-w-0 shrink items-center gap-3"
                onClick={() => setIsOpen(false)}
                aria-label="Lourex home"
            >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-white/[0.04] shadow-[0_0_15px_rgba(212,166,58,0.15)]">
              <img src="/logo.png" alt="Lourex" className="h-8 w-8 object-contain" />
            </span>
              <span className="min-w-0 truncate font-serif text-xl font-bold text-foreground">LOUREX</span>
            </Link>

            <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-foreground shadow-sm transition-colors hover:border-blue-400/50 hover:bg-blue-500/10 hover:text-blue-100"
                onClick={() => setIsOpen((value) => !value)}
                aria-label={t("nav.menu")}
                aria-expanded={isOpen}
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Desktop header */}
        <div
            className="mx-auto hidden h-16 w-full max-w-[1440px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-6 lg:grid"
            dir={isRtl ? "rtl" : "ltr"}
        >
          <Link
              to="/"
              className="flex shrink-0 items-center gap-3"
              onClick={() => setIsOpen(false)}
              aria-label="Lourex home"
          >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-white/[0.04] shadow-[0_0_15px_rgba(212,166,58,0.15)]">
            <img src="/logo.png" alt="Lourex" className="h-8 w-8 object-contain" />
          </span>
            <span className="font-serif text-xl font-bold text-foreground">LOUREX</span>
          </Link>

          <nav
              className="hidden min-w-0 items-center justify-center gap-1 lg:flex"
              aria-label={t("nav.primaryNavigation")}
          >
            {canSeeDashboardMenu ? (
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        `whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors 2xl:px-3.5 2xl:text-sm ${
                            isActive
                                ? "bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/30"
                                : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
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
                        `whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors 2xl:px-3.5 2xl:text-sm ${
                            isActive
                                ? "bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/30"
                                : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                        }`
                    }
                >
                  {link.label}
                </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-3">
            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              {user ? <NotificationBell userId={user.id} /> : null}

              <LanguageSwitcher />
              <ThemeToggle />

              {isAuthenticated ? (
                  <>
                    <Link
                        to="/profile"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/15 text-sm font-bold text-blue-100 transition hover:border-blue-300/50 hover:bg-blue-500/25"
                        title={userName}
                    >
                      {userName.slice(0, 1).toUpperCase()}
                    </Link>

                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="h-10 rounded-xl px-3 text-slate-300 hover:bg-blue-500/10 hover:text-white"
                        title={signOutLabel}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </>
              ) : (
                  <Button
                      variant="default"
                      asChild
                      className="h-10 rounded-xl bg-blue-600 px-5 font-semibold text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500"
                  >
                    <Link to="/auth">{signInLabel}</Link>
                  </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {isOpen ? (
            <div className="fixed inset-0 z-[9999] h-[100vh] w-full overflow-y-auto border-l border-white/10 bg-[#0B1220]/95 shadow-2xl backdrop-blur-md lg:hidden">
              <div className="flex min-h-full w-full max-w-full min-w-0 flex-col p-4 sm:p-5">
                <div className="mb-8 flex items-center justify-between">
                  <Link
                      to="/"
                      className="flex min-w-0 shrink items-center gap-3"
                      onClick={() => setIsOpen(false)}
                  >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-white/[0.04] shadow-[0_0_15px_rgba(212,166,58,0.15)]">
                  <img src="/logo.png" alt="Lourex" className="h-8 w-8 object-contain" />
                </span>
                    <span className="min-w-0 truncate font-serif text-xl font-bold text-foreground">LOUREX</span>
                  </Link>

                  <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-white/5"
                      aria-label={t("common.close")}
                  >
                    <X size={20} />
                  </button>
                </div>

                {isAuthenticated ? (
                    <Link
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className="mb-6 block w-full max-w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 transition-colors hover:border-blue-400/40 hover:bg-blue-500/10"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-base font-bold text-blue-100 ring-1 ring-blue-400/30">
                          {userName.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
                          <p className="truncate text-xs text-slate-400">
                            {roleLabel || userEmail || workspaceLabel}
                          </p>
                        </div>
                      </div>
                    </Link>
                ) : null}

                <div className="mb-6 flex max-w-full flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  {user ? <NotificationBell userId={user.id} /> : null}
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>

                <nav className="min-w-0 flex-1 space-y-1.5 overflow-y-auto" aria-label={t("nav.mobileNavigation")}>
                  {canSeeDashboardMenu ? (
                      <NavLink
                          to="/dashboard"
                          onClick={() => setIsOpen(false)}
                          className={({ isActive }) =>
                              `flex min-h-11 items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                                  isActive
                                      ? "bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/30"
                                      : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                              }`
                          }
                      >
                        <span className="min-w-0 break-words">{t("nav.dashboard")}</span>
                        <ChevronRight className={`h-4 w-4 opacity-60 ${isRtl ? "rotate-180" : ""}`} />
                      </NavLink>
                  ) : null}

                  {publicLinks.map((link) => (
                      <NavLink
                          key={`${link.to}-${link.label}`}
                          to={link.to}
                          onClick={() => setIsOpen(false)}
                          className={({ isActive }) =>
                              `flex min-h-11 items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                                  isActive
                                      ? "bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/30"
                                      : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                              }`
                          }
                      >
                        <span className="min-w-0 break-words">{link.label}</span>
                        <ChevronRight className={`h-4 w-4 opacity-60 ${isRtl ? "rotate-180" : ""}`} />
                      </NavLink>
                  ))}
                </nav>

                <div className="mt-auto border-t border-white/5 pt-6">
                  {isAuthenticated ? (
                      <button
                          type="button"
                          onClick={() => void handleLogout()}
                          className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                      >
                        <span>{signOutLabel}</span>
                        <LogOut className="h-4 w-4 opacity-70" />
                      </button>
                  ) : (
                      <Button
                          variant="default"
                          asChild
                          className="h-11 w-full rounded-xl bg-blue-500 font-semibold text-white shadow-lg shadow-blue-950/30 hover:bg-blue-400"
                      >
                        <Link to="/auth" onClick={() => setIsOpen(false)}>
                          {signInLabel}
                        </Link>
                      </Button>
                  )}
                </div>
              </div>
            </div>
        ) : null}
      </header>
  );
};

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
        { to: "/products", label: lang === "ar" ? "المنتجات" : "Products" },
        { to: "/request", label: t("nav.purchaseRequest") },
        {
          to: usesDashboardWorkspace
              ? "/dashboard/requests"
              : isCustomer
                  ? "/customer-portal/requests#requests"
                  : "/auth",
          label: lang === "ar" ? "طلباتي" : "My Requests",
        },
        {
          to: usesDashboardWorkspace
              ? "/dashboard/tracking"
              : isCustomer
                  ? "/customer-portal/tracking"
                  : "/track",
          label: t("nav.trackShipment"),
        },
        { to: "/guidelines", label: t("nav.guidelines") },
        { to: "/contact", label: t("nav.contact") },
      ],
      [isCustomer, lang, t, usesDashboardWorkspace],
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
          className="bg-stone-950/90 backdrop-blur-xl sticky top-0 z-[1000] h-16 w-full max-w-full overflow-visible border-b border-amber-200/15"
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
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/20 bg-stone-900 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
              <img src="/logo.png" alt="Lourex" className="h-8 w-8 object-contain" />
            </span>
              <span className="min-w-0 truncate font-serif text-xl font-bold text-stone-100">LOUREX</span>
            </Link>

            <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/15 bg-stone-900 text-stone-100 transition-colors hover:bg-stone-800"
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
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/20 bg-stone-900 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
            <img src="/logo.png" alt="Lourex" className="h-8 w-8 object-contain" />
          </span>
            <span className="font-serif text-xl font-bold text-stone-100">LOUREX</span>
          </Link>

          <nav
              className="hidden min-w-0 items-center justify-center gap-1.5 lg:flex"
              aria-label={t("nav.primaryNavigation")}
          >
            {canSeeDashboardMenu ? (
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        `whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors 2xl:px-3.5 2xl:text-sm ${
                            isActive
                                ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/20"
                                : "text-stone-300 hover:bg-stone-800/50 hover:text-stone-100"
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
                                ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/20"
                                : "text-stone-300 hover:bg-stone-800/50 hover:text-stone-100"
                        }`
                    }
                >
                  {link.label}
                </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-3 border-s border-amber-200/15 ps-4">
            <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
              {user ? <NotificationBell userId={user.id} /> : null}

              <LanguageSwitcher />
              <ThemeToggle />

              {isAuthenticated ? (
                  <>
                    <Link
                        to="/profile"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/20 bg-amber-500/10 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20"
                        title={userName}
                    >
                      {userName.slice(0, 1).toUpperCase()}
                    </Link>

                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="h-10 rounded-xl px-3 text-stone-300 hover:bg-stone-800/50 hover:text-stone-100"
                        title={signOutLabel}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </>
              ) : (
                  <Button
                      variant="default"
                      asChild
                      className="h-10 rounded-xl bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 px-5 font-semibold text-stone-950 shadow-lg shadow-amber-950/20 hover:brightness-110"
                  >
                    <Link to="/auth">{signInLabel}</Link>
                  </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {isOpen ? (
            <div className="fixed inset-0 z-[10000] lg:hidden" role="dialog" aria-modal="true" aria-label={t("nav.mobileNavigation")}>
              <button
                  type="button"
                  className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-sm"
                  aria-label={t("common.close")}
                  onClick={() => setIsOpen(false)}
              />
              <div
                  className={`absolute inset-y-0 ${isRtl ? "left-0" : "right-0"} flex h-[100dvh] w-[min(100vw,26rem)] max-w-full overflow-hidden border-amber-200/15 bg-stone-950 shadow-2xl ${isRtl ? "border-r" : "border-l"}`}
              >
              <div className="flex h-full w-full max-w-full min-w-0 flex-col overflow-y-auto overscroll-contain p-4 sm:p-5">
                <div className="mb-8 flex items-center justify-between">
                  <Link
                      to="/"
                      className="flex min-w-0 shrink items-center gap-3"
                      onClick={() => setIsOpen(false)}
                  >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/20 bg-stone-900">
                  <img src="/logo.png" alt="Lourex" className="h-8 w-8 object-contain" />
                </span>
                    <span className="min-w-0 truncate font-serif text-xl font-bold text-stone-100">LOUREX</span>
                  </Link>

                  <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg p-2 text-stone-400 hover:bg-stone-800"
                      aria-label={t("common.close")}
                  >
                    <X size={20} />
                  </button>
                </div>

                {isAuthenticated ? (
                    <Link
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className="mb-6 block w-full max-w-full rounded-2xl border border-amber-200/15 bg-stone-900/50 px-4 py-4 transition-colors hover:bg-stone-800"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-base font-bold text-amber-200 ring-1 ring-amber-500/20">
                          {userName.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-stone-100">{userName}</p>
                          <p className="truncate text-xs text-stone-400">
                            {roleLabel || userEmail || workspaceLabel}
                          </p>
                        </div>
                      </div>
                    </Link>
                ) : null}

                <div className="mb-6 flex max-w-full flex-wrap items-center gap-3 rounded-xl border border-amber-200/15 bg-stone-900/50 px-3 py-2">
                  {user ? <NotificationBell userId={user.id} /> : null}
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>

                <nav className="min-w-0 flex-1 space-y-1.5" aria-label={t("nav.mobileNavigation")}>
                  {canSeeDashboardMenu ? (
                      <NavLink
                          to="/dashboard"
                          onClick={() => setIsOpen(false)}
                          className={({ isActive }) =>
                              `flex min-h-11 items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                                  isActive
                                      ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/20"
                                      : "text-stone-300 hover:bg-stone-800/50 hover:text-stone-100"
                              }`
                          }
                      >
                        <span className="min-w-0 truncate">{t("nav.dashboard")}</span>
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
                                      ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/20"
                                      : "text-stone-300 hover:bg-stone-800/50 hover:text-stone-100"
                              }`
                          }
                      >
                        <span className="min-w-0 truncate">{link.label}</span>
                        <ChevronRight className={`h-4 w-4 opacity-60 ${isRtl ? "rotate-180" : ""}`} />
                      </NavLink>
                  ))}
                </nav>

                <div className="mt-auto border-t border-amber-200/10 pt-6">
                  {isAuthenticated ? (
                      <button
                          type="button"
                          onClick={() => void handleLogout()}
                          className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100"
                      >
                        <span>{signOutLabel}</span>
                        <LogOut className="h-4 w-4 opacity-70" />
                      </button>
                  ) : (
                      <Button
                          variant="default"
                          asChild
                          className="h-11 w-full rounded-xl bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-semibold text-stone-950 shadow-lg shadow-amber-950/20 hover:brightness-110"
                      >
                        <Link to="/auth" onClick={() => setIsOpen(false)}>
                          {signInLabel}
                        </Link>
                      </Button>
                  )}
                </div>
              </div>
              </div>
            </div>
        ) : null}
      </header>
  );
};

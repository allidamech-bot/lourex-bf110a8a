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
          className="sticky top-0 z-[1000] h-[72px] w-full max-w-full overflow-visible border-b border-border/70 bg-background/95 shadow-[0_12px_28px_-25px_rgba(8,127,120,0.5)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/85"
          dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Mobile header */}
        <div className="mx-auto flex h-[72px] w-full max-w-[1700px] items-center px-4 sm:px-6 xl:hidden">
          <div className="flex w-full items-center justify-between gap-4">
            <Link
                to="/"
                className="flex min-w-0 shrink items-center gap-3"
                onClick={() => setIsOpen(false)}
                aria-label="Lourex home"
            >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-card shadow-soft">
              <img src="/brand/lourex-official.jpeg" alt="LOUREX official logo" className="h-8 w-8 object-contain" />
            </span>
              <span className="min-w-0 truncate font-heading text-lg font-extrabold tracking-[0.08em] text-heading">LOUREX</span>
            </Link>

            <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
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
            className="mx-auto hidden h-[72px] w-full max-w-[1700px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-6 xl:grid"
            dir={isRtl ? "rtl" : "ltr"}
        >
          <Link
              to="/"
              className="flex shrink-0 items-center gap-3"
              onClick={() => setIsOpen(false)}
              aria-label="Lourex home"
          >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-card shadow-soft">
            <img src="/brand/lourex-official.jpeg" alt="LOUREX official logo" className="h-8 w-8 object-contain" />
          </span>
            <span className="font-heading text-lg font-extrabold tracking-[0.08em] text-heading">LOUREX</span>
          </Link>

          <nav
              className="hidden min-w-0 items-center justify-center gap-1 xl:flex"
              aria-label={t("nav.primaryNavigation")}
          >
            {canSeeDashboardMenu ? (
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        `whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors 2xl:px-3.5 2xl:text-sm ${
                            isActive
                                ? "bg-primary-soft text-primary"
                                : "text-muted-foreground hover:bg-secondary hover:text-heading"
                        }`
                    }
                >
                  {t("nav.dashboard")}
                </NavLink>
            ) : null}

            {publicLinks.filter((_, index) => [0, 1, 2, 4, 6].includes(index)).map((link) => (
                <NavLink
                    key={`${link.to}-${link.label}`}
                    to={link.to}
                    className={({ isActive }) =>
                        `whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors 2xl:px-3.5 2xl:text-sm ${
                            isActive
                                ? "bg-primary-soft text-primary"
                                : "text-muted-foreground hover:bg-secondary hover:text-heading"
                        }`
                    }
                >
                  {link.label}
                </NavLink>
            ))}
            <details className="group relative shrink-0">
              <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-heading [&::-webkit-details-marker]:hidden">
                {lang === "ar" ? "المزيد" : "More"}
                <ChevronRight className={`h-3.5 w-3.5 transition-transform group-open:rotate-90 ${isRtl ? "rotate-180" : ""}`} aria-hidden="true" />
              </summary>
              <div className="absolute end-0 top-[calc(100%+0.5rem)] z-50 min-w-[205px] rounded-2xl border border-border/80 bg-popover p-2 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.4)]">
                {publicLinks.filter((_, index) => [3, 5].includes(index)).map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `block rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${isActive ? "bg-primary-soft text-primary" : "text-foreground hover:bg-secondary"}`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </details>
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-3 border-s border-border ps-4">
            <div className="hidden shrink-0 items-center gap-2.5 xl:flex">
              {user ? <NotificationBell userId={user.id} /> : null}

              <LanguageSwitcher />
              <ThemeToggle />

              {isAuthenticated ? (
                  <>
                    <Link
                        to="/profile"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/25 bg-primary-soft text-sm font-bold text-primary transition hover:border-primary/50"
                        title={userName}
                    >
                      {userName.slice(0, 1).toUpperCase()}
                    </Link>

                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="h-10 rounded-xl px-3 text-muted-foreground hover:bg-secondary hover:text-heading"
                        title={signOutLabel}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </>
              ) : (
                  <Button
                      variant="default"
                      asChild
                      className="h-10 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90"
                  >
                    <Link to="/auth">{signInLabel}</Link>
                  </Button>
              )}
            </div>
          </div>
        </div>

        <div className="meridian-line pointer-events-none absolute inset-x-0 bottom-[-1px] opacity-60" aria-hidden="true" />

        {/* Mobile drawer */}
        {isOpen ? (
            <div className="fixed inset-0 z-[10000] xl:hidden" role="dialog" aria-modal="true" aria-label={t("nav.mobileNavigation")}>
              <button
                  type="button"
                  className="absolute inset-0 h-full w-full bg-foreground/40 backdrop-blur-sm"
                  aria-label={t("common.close")}
                  onClick={() => setIsOpen(false)}
              />
              <div
                  className={`absolute inset-y-0 ${isRtl ? "left-0" : "right-0"} flex h-[100dvh] w-[min(100vw,26rem)] max-w-full overflow-hidden border-border bg-background shadow-2xl ${isRtl ? "border-r" : "border-l"}`}
              >
              <div className="flex h-full w-full max-w-full min-w-0 flex-col overflow-y-auto overscroll-contain p-4 sm:p-5">
                <div className="mb-8 flex items-center justify-between">
                  <Link
                      to="/"
                      className="flex min-w-0 shrink items-center gap-3"
                      onClick={() => setIsOpen(false)}
                  >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-card shadow-soft">
                  <img src="/brand/lourex-official.jpeg" alt="LOUREX official logo" className="h-8 w-8 object-contain" />
                </span>
                    <span className="min-w-0 truncate font-heading text-lg font-extrabold tracking-[0.08em] text-heading">LOUREX</span>
                  </Link>

                  <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
                      aria-label={t("common.close")}
                  >
                    <X size={20} />
                  </button>
                </div>

                {isAuthenticated ? (
                    <Link
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className="mb-6 block w-full max-w-full rounded-2xl border border-border bg-card px-4 py-4 shadow-soft transition-colors hover:border-primary/40"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-base font-bold text-primary">
                          {userName.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-heading">{userName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {roleLabel || userEmail || workspaceLabel}
                          </p>
                        </div>
                      </div>
                    </Link>
                ) : null}

                <div className="mb-6 flex max-w-full flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
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
                                      ? "bg-primary-soft text-primary"
                                      : "text-muted-foreground hover:bg-secondary hover:text-heading"
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
                                      ? "bg-primary-soft text-primary"
                                      : "text-muted-foreground hover:bg-secondary hover:text-heading"
                              }`
                          }
                      >
                        <span className="min-w-0 truncate">{link.label}</span>
                        <ChevronRight className={`h-4 w-4 opacity-60 ${isRtl ? "rotate-180" : ""}`} />
                      </NavLink>
                  ))}
                </nav>

                <div className="mt-auto border-t border-border pt-6">
                  {isAuthenticated ? (
                      <button
                          type="button"
                          onClick={() => void handleLogout()}
                          className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-heading"
                      >
                        <span>{signOutLabel}</span>
                        <LogOut className="h-4 w-4 opacity-70" />
                      </button>
                  ) : (
                      <Button
                          variant="default"
                          asChild
                          className="h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-soft hover:bg-primary/90"
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

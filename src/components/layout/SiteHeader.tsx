import { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, Menu, Shield, X } from "lucide-react";
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
        { to: "/", label: t("nav.home") || "الرئيسية" },
        { to: "/#how-it-works", label: t("nav.howItWorks") || "كيف يعمل" },
        { to: "/#services", label: t("nav.services") || "الخدمات" },
        { to: "/track", label: t("nav.track") || "تتبع الشحنات" },
        { to: "/contact", label: t("nav.contact") || "تواصل معنا" },
      ],
      [t],
  );

  const workspaceLabel = profile
      ? getWorkspaceTitle(profile, t)
      : user
          ? t("nav.profile")
          : t("nav.signIn");

  const roleLabel = profile ? getRoleDisplayName(profile.role, t) : null;
  const canSeeDashboardMenu = Boolean(profile && profile.role !== "customer");

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut();
    toast.success(t("nav.signOut"));
    navigate("/");
  };

  return (
      <header
        className="glass-topbar sticky top-0 z-50 border-b border-white/[0.08] shadow-[0_4px_30px_-8px_rgba(212,166,58,0.1)]"
        style={{ background: "rgba(11,18,32,0.85)", backdropFilter: "blur(16px)" }}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center px-4 sm:px-6 xl:hidden">
          <div className="flex w-full items-center justify-between gap-4">
            <Link
              to="/"
              className="flex min-w-0 shrink-0 items-center gap-3"
              onClick={() => setIsOpen(false)}
              aria-label="Lourex home"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-white/[0.03] shadow-[0_0_15px_rgba(212,166,58,0.15)]">
                <img src="/logo.png" alt="Lourex" className="h-9 w-9 object-contain" />
              </span>
              <span className="truncate font-serif text-2xl font-bold tracking-wide text-foreground">LOUREX</span>
            </Link>

            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-foreground shadow-sm transition-colors hover:border-gold/50 hover:bg-gold/10 hover:text-gold-light"
              onClick={() => setIsOpen((value) => !value)}
              aria-label={t("nav.menu")}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        <div className="mx-auto hidden h-16 max-w-[1440px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-6 xl:grid" dir={isRtl ? "rtl" : "ltr"}>
          <Link
            to="/"
            className="flex shrink-0 items-center gap-3"
            onClick={() => setIsOpen(false)}
            aria-label="Lourex home"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-white/[0.03] shadow-[0_0_15px_rgba(212,166,58,0.15)]">
              <img src="/logo.png" alt="Lourex" className="h-9 w-9 object-contain" />
            </span>
            <span className="font-serif text-2xl font-bold tracking-wide text-foreground">LOUREX</span>
          </Link>

          <nav className="hidden min-w-0 items-center justify-center gap-1 xl:flex" aria-label={t("nav.primaryNavigation")}>
            {canSeeDashboardMenu ? (
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ${
                            isActive
                                ? "text-gold drop-shadow-[0_0_8px_rgba(212,166,58,0.5)] shadow-[0_2px_0_0_var(--gold)]"
                                : "text-slate-300 hover:bg-white/[0.03] hover:text-gold-light"
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
                        `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ${
                            isActive
                                ? "text-gold drop-shadow-[0_0_8px_rgba(212,166,58,0.5)] shadow-[0_2px_0_0_var(--gold)]"
                                : "text-slate-300 hover:bg-white/[0.03] hover:text-gold-light"
                        }`
                    }
                >
                  {link.label}
                </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <div className="hidden shrink-0 items-center gap-2 xl:flex">
              {isAuthenticated ? (
                  <>
                    <Link
                        to="/profile"
                        className="flex min-w-0 max-w-[170px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5 transition-colors hover:border-gold/40 hover:bg-gold/10 2xl:max-w-[230px] 2xl:px-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-bold text-gold ring-1 ring-gold/30">
                        {userName.slice(0, 1).toUpperCase()}
                      </div>

                      <div className="min-w-0 text-start">
                        <p className="truncate text-sm font-semibold leading-5 text-foreground">{userName}</p>
                        <p className="truncate text-xs leading-4 text-slate-400">{roleLabel || userEmail || workspaceLabel}</p>
                      </div>
                    </Link>

                    {profile?.role === "owner" ? (
                        <Button variant="outline" asChild className="h-9 w-9 border-white/10 bg-white/[0.03] px-0 text-slate-200 hover:border-gold/40 hover:bg-gold/10 hover:text-white 2xl:w-auto 2xl:px-3">
                          <Link to="/admin" aria-label={t("nav.admin")}>
                            <Shield className="h-4 w-4 2xl:me-2" />
                            <span className="hidden 2xl:inline">{t("nav.admin")}</span>
                          </Link>
                        </Button>
                    ) : null}

                    {user ? <NotificationBell userId={user.id} /> : null}
                    <LanguageSwitcher />

                    <Button variant="ghost" onClick={handleLogout} className="h-9 w-9 px-0 text-slate-300 hover:bg-white/[0.04] hover:text-white 2xl:w-auto 2xl:px-3">
                      <LogOut className="h-4 w-4 2xl:me-2" />
                      <span className="hidden whitespace-nowrap 2xl:inline">{t("nav.signOut")}</span>
                    </Button>
                    
                    <Button variant="default" asChild className="ml-2 h-9 rounded-xl bg-gold px-5 font-semibold text-background shadow-[0_0_15px_rgba(212,166,58,0.25)] hover:bg-gold-light hover:shadow-[0_0_20px_rgba(212,166,58,0.4)] transition-all">
                      <Link to="/dashboard">ابدأ الآن</Link>
                    </Button>
                  </>
              ) : (
                  <>
                    <LanguageSwitcher />
                    <Button variant="default" asChild className="ml-2 h-9 rounded-xl bg-gold px-5 font-semibold text-background shadow-[0_0_15px_rgba(212,166,58,0.25)] hover:bg-gold-light hover:shadow-[0_0_20px_rgba(212,166,58,0.4)] transition-all">
                      <Link to="/auth">ابدأ الآن</Link>
                    </Button>
                  </>
              )}
            </div>

          </div>
        </div>

        {isOpen ? (
            <div className="border-t border-white/[0.08] shadow-2xl xl:hidden" style={{ background: "rgba(11,18,32,0.98)", backdropFilter: "blur(16px)" }}>
              <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-4 sm:px-6" dir={isRtl ? "rtl" : "ltr"}>
                {isAuthenticated ? (
                    <Link
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition-colors hover:border-gold/40 hover:bg-gold/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-base font-bold text-gold ring-1 ring-gold/30">
                          {userName.slice(0, 1).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
                          <p className="truncate text-xs text-slate-400">{roleLabel || userEmail || workspaceLabel}</p>
                        </div>
                      </div>

                      {roleLabel ? (
                          <p className="mt-3 rounded-xl bg-gold/10 px-3 py-2 text-xs text-gold">
                            {roleLabel}
                          </p>
                      ) : null}
                    </Link>
                ) : null}

                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  {user ? <NotificationBell userId={user.id} /> : null}
                  <LanguageSwitcher />
                </div>

                <nav className="flex flex-col gap-1" aria-label={t("nav.mobileNavigation")}>
                  {canSeeDashboardMenu ? (
                      <NavLink
                          to="/dashboard"
                          onClick={() => setIsOpen(false)}
                          className={({ isActive }) =>
                            `flex min-h-11 items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                              isActive
                                ? "bg-gold/15 text-gold ring-1 ring-gold/30 drop-shadow-[0_0_8px_rgba(212,166,58,0.5)]"
                                : "text-slate-300 hover:bg-white/[0.04] hover:text-gold-light"
                            }`
                          }
                      >
                        <span>{t("nav.dashboard")}</span>
                        <ChevronRight className={`h-4 w-4 opacity-60 ${isRtl ? "rotate-180" : ""}`} />
                      </NavLink>
                  ) : null}

                  {publicLinks.map((link) => (
                      <NavLink
                          key={`${link.to}-${link.label}`}
                          to={link.to}
                          onClick={() => setIsOpen(false)}
                          className={({ isActive }) =>
                            `flex min-h-11 items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                              isActive
                                ? "bg-gold/15 text-gold ring-1 ring-gold/30 drop-shadow-[0_0_8px_rgba(212,166,58,0.5)]"
                                : "text-slate-300 hover:bg-white/[0.04] hover:text-gold-light"
                            }`
                          }
                      >
                        <span>{link.label}</span>
                        <ChevronRight className={`h-4 w-4 opacity-60 ${isRtl ? "rotate-180" : ""}`} />
                      </NavLink>
                  ))}

                  {isAuthenticated ? (
                      <>
                        {profile?.role === "owner" ? (
                            <NavLink
                                to="/admin"
                                onClick={() => setIsOpen(false)}
                                className={({ isActive }) =>
                                  `flex min-h-11 items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                                    isActive
                                      ? "bg-gold/15 text-gold ring-1 ring-gold/30 drop-shadow-[0_0_8px_rgba(212,166,58,0.5)]"
                                      : "text-slate-300 hover:bg-white/[0.04] hover:text-gold-light"
                                  }`
                                }
                            >
                              <span>{t("nav.admin")}</span>
                              <Shield className="h-4 w-4 opacity-70" />
                            </NavLink>
                        ) : null}

                        <button
                            type="button"
                            onClick={() => void handleLogout()}
                            className="flex min-h-11 items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.04] hover:text-white"
                        >
                          <span>{signOutLabel}</span>
                          <LogOut className="h-4 w-4 opacity-70" />
                        </button>
                      </>
                  ) : (
                      <Button variant="default" asChild className="mt-2 h-11 rounded-xl bg-gold font-semibold text-background shadow-[0_0_15px_rgba(212,166,58,0.25)] hover:bg-gold-light hover:shadow-[0_0_20px_rgba(212,166,58,0.4)] transition-all">
                        <Link to="/auth" onClick={() => setIsOpen(false)}>
                          ابدأ الآن
                        </Link>
                      </Button>
                  )}
                </nav>
              </div>
            </div>
        ) : null}
      </header>
  );
};

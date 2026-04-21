import { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, Shield, UserCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { getDefaultRouteForRole, isInternalRole, roleLabels } from "@/features/auth/rbac";
import { useI18n } from "@/lib/i18n";

export const SiteHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { lang } = useI18n();
  const { user, profile, signOut } = useAuthSession();
  const navigate = useNavigate();

  const publicLinks = useMemo(
    () => [
      { to: "/", label: lang === "ar" ? "الرئيسية" : "Home" },
      { to: "/request", label: lang === "ar" ? "طلب شراء" : "Purchase Request" },
      { to: "/track", label: lang === "ar" ? "تتبع الشحنة" : "Track Shipment" },
      { to: "/about", label: lang === "ar" ? "عن Lourex" : "About Lourex" },
      { to: "/contact", label: lang === "ar" ? "تواصل معنا" : "Contact" },
    ],
    [lang],
  );

  const workspaceLink = profile ? getDefaultRouteForRole(profile.role) : "/auth";
  const workspaceLabel = profile
    ? isInternalRole(profile.role)
      ? lang === "ar"
        ? "غرفة التشغيل"
        : "Operations Room"
      : lang === "ar"
        ? "بوابة العميل"
        : "Customer Portal"
    : lang === "ar"
      ? "دخول"
      : "Sign in";

  const handleLogout = async () => {
    await signOut();
    toast.success(lang === "ar" ? "تم تسجيل الخروج" : "Signed out successfully");
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

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <ThemeToggle />
          <LanguageSwitcher />
          {user ? <NotificationBell userId={user.id} /> : null}

          {profile?.role === "owner" ? (
            <Button variant="outline" asChild>
              <Link to="/admin">
                <Shield className="me-2 h-4 w-4" />
                {lang === "ar" ? "الإدارة" : "Admin"}
              </Link>
            </Button>
          ) : null}

          {user && profile ? (
            <>
              <div className="rounded-full border border-border/60 bg-card px-4 py-2 text-xs text-muted-foreground">
                {lang === "ar" ? roleLabels[profile.role].ar : roleLabels[profile.role].en}
              </div>

              <Button variant="outline" asChild>
                <Link to={workspaceLink}>
                  <UserCircle2 className="me-2 h-4 w-4" />
                  {workspaceLabel}
                </Link>
              </Button>

              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="me-2 h-4 w-4" />
                {lang === "ar" ? "خروج" : "Sign out"}
              </Button>
            </>
          ) : (
            <Button variant="gold" asChild>
              <Link to="/auth">{lang === "ar" ? "دخول" : "Sign in"}</Link>
            </Button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          {user ? <NotificationBell userId={user.id} /> : null}
          <ThemeToggle />
          <LanguageSwitcher />
          <button className="rounded-lg p-2 text-foreground" onClick={() => setIsOpen((value) => !value)}>
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
                  {lang === "ar" ? roleLabels[profile.role].ar : roleLabels[profile.role].en}
                </div>

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
                  {lang === "ar" ? "تسجيل الخروج" : "Sign out"}
                </button>
              </>
            ) : (
              <Button variant="gold" asChild className="mt-2">
                <Link to="/auth" onClick={() => setIsOpen(false)}>
                  {lang === "ar" ? "دخول" : "Sign in"}
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
};

import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, Shield, UserCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";

const publicLinks = [
  { to: "/", label: "الرئيسية" },
  { to: "/request", label: "طلب شراء" },
  { to: "/track", label: "تتبع الشحنة" },
  { to: "/about", label: "عن Lourex" },
  { to: "/contact", label: "تواصل معنا" },
];

export const SiteHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const syncUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser);

      if (!currentUser) {
        setIsAdmin(false);
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id);

      setIsAdmin(Boolean(roles?.some((item) => item.role === "admin")));
    };

    syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      syncUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج");
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <span className="font-serif text-lg font-bold">L</span>
          </div>
          <div>
            <p className="font-serif text-xl font-bold tracking-wide">LOUREX</p>
            <p className="text-xs text-muted-foreground">Operations Platform</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {publicLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          {user ? (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              لوحة التحكم
            </NavLink>
          ) : null}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <LanguageSwitcher />
          {isAdmin ? (
            <Button variant="outline" asChild>
              <Link to="/admin">
                <Shield className="me-2 h-4 w-4" />
                الإدارة
              </Link>
            </Button>
          ) : null}
          {user ? (
            <>
              <Button variant="outline" asChild>
                <Link to="/dashboard">
                  <UserCircle2 className="me-2 h-4 w-4" />
                  لوحة التحكم
                </Link>
              </Button>
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="me-2 h-4 w-4" />
                خروج
              </Button>
            </>
          ) : (
            <Button variant="gold" asChild>
              <Link to="/auth">دخول</Link>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
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
            {user ? (
              <>
                <NavLink
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  لوحة التحكم
                </NavLink>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="rounded-lg px-3 py-2 text-start text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <Button variant="gold" asChild className="mt-2">
                <Link to="/auth" onClick={() => setIsOpen(false)}>
                  دخول
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
};

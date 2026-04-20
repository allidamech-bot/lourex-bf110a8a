import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, Shield, ChevronDown, ShoppingBag, Settings, Package, Handshake, Store, Briefcase, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import CommandPalette from "@/components/CommandPalette";
import InquiryModal from "@/components/InquiryModal";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";
import CartIcon from "@/components/CartIcon";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showInquiry, setShowInquiry] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBroker, setIsBroker] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        setIsAdmin(!!roles?.some((r) => r.role === "admin"));
        setIsBroker(!!roles?.some((r) => r.role === "broker"));
        setIsSeller(!!roles?.some((r) => ["seller", "manufacturer", "factory"].includes(r.role)));
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", u.id);
        setIsAdmin(!!roles?.some((r) => r.role === "admin"));
        setIsBroker(!!roles?.some((r) => r.role === "broker"));
        setIsSeller(!!roles?.some((r) => ["seller", "manufacturer", "factory"].includes(r.role)));
      } else {
        setIsAdmin(false); setIsBroker(false); setIsSeller(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowUserMenu(false);
    toast.success(t("nav.logout"));
    navigate("/");
  };

  const OWNER_EMAIL = "allidamech@gmail.com";
  const canSeeAdmin = isAdmin || user?.email === OWNER_EMAIL;

  const navLinks = [
    { label: t("nav.home"), href: "/" },
    { label: lang === "ar" ? "كيف يعمل" : lang === "tr" ? "Nasıl Çalışır" : "How It Works", href: "/#how-it-works" },
    { label: lang === "ar" ? "الموردون" : lang === "tr" ? "Tedarikçiler" : "Suppliers", href: "/catalog" },
    { label: t("nav.about"), href: "/about" },
    { label: lang === "ar" ? "تواصل معنا" : lang === "tr" ? "İletişim" : "Contact", href: "/contact" },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-border/50 bg-background/95 backdrop-blur-xl shadow-lg" : "bg-transparent"}`}>
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-8">
          {/* Logo — larger */}
          <Link to="/" className="flex items-center gap-3">
            <img src="/lovable-uploads/0A083D01-A01E-4952-8E64-7A1DCA89D726.png" alt="LOUREX" className="h-12 md:h-14 w-auto" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="hidden lg:flex items-center gap-3">
            {canSeeAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-md"
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}

            {isBroker && (
              <Link
                to="/broker"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                <Briefcase className="w-4 h-4" />
                Broker
              </Link>
            )}

            <CommandPalette />
            {user && <NotificationBell userId={user.id} />}
            {user && <CartIcon userId={user.id} />}
            <ThemeToggle />
            <LanguageSwitcher />

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute end-0 top-full mt-2 w-56 rounded-xl bg-card border border-border shadow-xl py-2 z-50"
                    >
                      <div className="px-4 py-2 border-b border-border/50">
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <Link to="/profile" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                        <User className="w-4 h-4" /> {t("nav.profile")}
                      </Link>
                      <Link to="/dashboard" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                        <Package className="w-4 h-4" /> {t("nav.dashboard")}
                      </Link>
                      <Link to="/orders" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                        <ShoppingBag className="w-4 h-4" /> {t("nav.orders")}
                      </Link>
                      <Link to="/deals" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                        <Handshake className="w-4 h-4" /> Deals
                      </Link>
                      <Link to="/wishlist" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                        <Heart className="w-4 h-4" /> {lang === "ar" ? "المفضلة" : "Wishlist"}
                      </Link>
                      <Link to="/cart" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                        <ShoppingCart className="w-4 h-4" /> {lang === "ar" ? "السلة" : "Cart"}
                      </Link>
                      <Link to="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                        <Settings className="w-4 h-4" /> {lang === "ar" ? "الإعدادات" : "Settings"}
                      </Link>
                      {isSeller && (
                        <Link to="/seller" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                          <Store className="w-4 h-4" /> {lang === "ar" ? "إدارة المنتجات" : "Seller Dashboard"}
                        </Link>
                      )}
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-secondary/50 transition-colors">
                          <Shield className="w-4 h-4" /> {t("nav.admin")}
                        </Link>
                      )}
                      <div className="border-t border-border/50 mt-1 pt-1">
                        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-destructive hover:bg-secondary/50 transition-colors w-full">
                          <LogOut className="w-4 h-4" /> {t("nav.logout")}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth">{t("nav.login")}</Link>
                </Button>
                <Button variant="gold-outline" size="sm" className="font-semibold" asChild>
                  <Link to="/factory-signup">
                    {lang === "ar" ? "كن موردًا" : lang === "tr" ? "Tedarikçi Ol" : "Become a Supplier"}
                  </Link>
                </Button>
                <Button variant="gold" size="sm" className="font-semibold" asChild>
                  <Link to="/auth">
                    {lang === "ar" ? "ابدأ الآن" : lang === "tr" ? "Başlayın" : "Get Started"}
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="lg:hidden flex items-center gap-1">
            {user && <CartIcon userId={user.id} />}
            <ThemeToggle />
            <LanguageSwitcher />
            <button className="text-foreground p-2" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-border/50 bg-background"
            >
              <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary py-2.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}

                {user ? (
                  <>
                    <div className="border-t border-border/50 my-2" />
                    <div className="px-3 py-1.5">
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    {canSeeAdmin && (
                      <Link to="/admin" className="flex items-center gap-3 text-sm font-medium text-primary py-2.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors" onClick={() => setIsOpen(false)}>
                        <Shield className="w-4 h-4" /> Admin Dashboard
                      </Link>
                    )}
                    <Link to="/dashboard" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary py-2.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors" onClick={() => setIsOpen(false)}>
                      <User className="w-4 h-4" /> {t("nav.dashboard")}
                    </Link>
                    <Link to="/orders" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary py-2.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors" onClick={() => setIsOpen(false)}>
                      <ShoppingBag className="w-4 h-4" /> {t("nav.orders")}
                    </Link>
                    <button onClick={() => { handleLogout(); setIsOpen(false); }} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-destructive py-2.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors w-full">
                      <LogOut className="w-4 h-4" /> {t("nav.logout")}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="border-t border-border/50 my-2" />
                    <Button variant="ghost" size="sm" className="justify-start" asChild>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>{t("nav.login")}</Link>
                    </Button>
                    <Button variant="gold-outline" size="sm" className="w-full mt-1" asChild>
                      <Link to="/factory-signup" onClick={() => setIsOpen(false)}>
                        {lang === "ar" ? "كن موردًا" : lang === "tr" ? "Tedarikçi Ol" : "Become a Supplier"}
                      </Link>
                    </Button>
                    <Button variant="gold" size="sm" className="w-full mt-1" asChild>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        {lang === "ar" ? "ابدأ الآن" : lang === "tr" ? "Başlayın" : "Get Started"}
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      )}

      <InquiryModal open={showInquiry} onClose={() => setShowInquiry(false)} inquiryType="quote" />
    </>
  );
};

export default Navbar;

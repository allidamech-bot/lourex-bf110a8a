import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, Factory, ShoppingBag, Truck, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";

interface QuickAction {
  label: string;
  icon: any;
  href: string;
  category: string;
}

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { t } = useI18n();

  const actions: QuickAction[] = [
    { label: t("nav.orders"), icon: ShoppingBag, href: "/orders", category: "nav" },
    { label: t("nav.catalog"), icon: Factory, href: "/catalog", category: "nav" },
    { label: t("nav.track"), icon: Truck, href: "/track", category: "nav" },
    { label: t("nav.dashboard"), icon: Package, href: "/dashboard", category: "nav" },
    { label: t("nav.admin"), icon: Package, href: "/admin", category: "nav" },
  ];

  const filtered = query
    ? actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : actions;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const go = (href: string) => {
    navigate(href);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg bg-secondary/50 border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
      >
        <Search className="w-3.5 h-3.5" />
        <span>{t("search.placeholder") || "Search..."}</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border/50 bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[90vw] max-w-lg z-[101] rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 border-b border-border">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("search.placeholder") || "Search orders, products, factories..."}
                  className="flex-1 h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No results found</p>
                )}
                {filtered.map((action) => (
                  <button
                    key={action.href}
                    onClick={() => go(action.href)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <action.icon className="w-4 h-4 text-primary" />
                    {action.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default CommandPalette;

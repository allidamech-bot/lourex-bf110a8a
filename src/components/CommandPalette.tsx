import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Factory, Package, Search, ShoppingBag, Truck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";

interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
}

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { t } = useI18n();

  const actions: QuickAction[] = useMemo(
    () => [
      { label: t("nav.orders"), icon: ShoppingBag, href: "/orders" },
      { label: t("nav.catalog"), icon: Factory, href: "/catalog" },
      { label: t("nav.track"), icon: Truck, href: "/track" },
      { label: t("nav.dashboard"), icon: Package, href: "/dashboard" },
      { label: t("nav.admin"), icon: Package, href: "/admin" },
    ],
    [t],
  );

  const filtered = query
    ? actions.filter((action) => action.label.toLowerCase().includes(query.toLowerCase()))
    : actions;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
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
      <button
        onClick={() => setOpen(true)}
        className="hidden h-9 items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground md:flex"
      >
        <Search className="h-3.5 w-3.5" />
        <span>{t("search.placeholder")}</span>
        <kbd className="hidden items-center gap-0.5 rounded border border-border/50 bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground lg:inline-flex">
          {t("search.shortcut")}
        </kbd>
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed left-1/2 top-[20%] z-[101] w-[90vw] max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("search.placeholder")}
                  className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>
                ) : (
                  filtered.map((action) => (
                    <button
                      key={action.href}
                      onClick={() => go(action.href)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/50"
                    >
                      <action.icon className="h-4 w-4 text-primary" />
                      {action.label}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default CommandPalette;

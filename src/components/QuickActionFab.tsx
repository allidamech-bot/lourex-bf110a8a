import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ShoppingBag, Package, Truck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";

const QuickActionFab = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();

  const actions = [
    { label: t("admin.addShipment") || "New Shipment", icon: Truck, href: "/admin" },
    { label: t("nav.orders") || "Orders", icon: ShoppingBag, href: "/orders" },
    { label: t("nav.catalog") || "Products", icon: Package, href: "/catalog" },
  ];

  return (
    <div className="fixed bottom-20 end-4 z-40 flex flex-col-reverse items-end gap-2">
      <AnimatePresence>
        {open &&
          actions.map((action, i) => (
            <motion.button
              key={action.href}
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                navigate(action.href);
                setOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border shadow-lg text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <action.icon className="w-4 h-4 text-primary" />
              {action.label}
            </motion.button>
          ))}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:opacity-90 transition-all"
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.15 }}>
          <Plus className="w-5 h-5" />
        </motion.div>
      </button>
    </div>
  );
};

export default QuickActionFab;

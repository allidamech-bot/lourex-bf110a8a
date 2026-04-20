import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const routeLabels: Record<string, { en: string; ar: string }> = {
  marketplace: { en: "Marketplace", ar: "السوق" },
  product: { en: "Product", ar: "المنتج" },
  supplier: { en: "Supplier", ar: "المورد" },
  cart: { en: "Cart", ar: "السلة" },
  checkout: { en: "Checkout", ar: "إتمام الطلب" },
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  orders: { en: "Orders", ar: "الطلبات" },
  deals: { en: "Deals", ar: "الصفقات" },
  profile: { en: "Profile", ar: "الملف الشخصي" },
  settings: { en: "Settings", ar: "الإعدادات" },
  about: { en: "About", ar: "من نحن" },
  contact: { en: "Contact", ar: "تواصل معنا" },
  messages: { en: "Messages", ar: "الرسائل" },
  wishlist: { en: "Wishlist", ar: "المفضلة" },
  track: { en: "Track", ar: "تتبع" },
  catalog: { en: "Catalog", ar: "الكتالوج" },
};

const Breadcrumbs = () => {
  const { lang } = useI18n();
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 flex-wrap">
      <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
        <Home className="w-3 h-3" />
        <span>{lang === "ar" ? "الرئيسية" : "Home"}</span>
      </Link>
      {segments.map((seg, i) => {
        const path = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        const label = routeLabels[seg]?.[lang === "ar" ? "ar" : "en"] || seg;

        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-primary transition-colors">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;

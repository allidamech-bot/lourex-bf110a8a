import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { Mail, MapPin, Globe } from "lucide-react";

const Footer = forwardRef<HTMLElement>((_props, ref) => {
  const { t, lang } = useI18n();

  const navLinks = [
    { label: t("nav.about"), href: "/about" },
    { label: t("nav.whyLourex"), href: "/why-lourex" },
    { label: lang === "ar" ? "تواصل معنا" : "Contact", href: "/contact" },
  ];

  const legalLinks = [
    { label: t("consent.privacyTitle"), href: "/privacy" },
    { label: t("consent.tosTitle"), href: "/terms" },
  ];

  const platformLinks = [
    { label: lang === "ar" ? "السوق" : "Marketplace", href: "/marketplace" },
    { label: lang === "ar" ? "الموردون" : "Suppliers", href: "/catalog" },
    { label: lang === "ar" ? "تتبع الشحن" : "Track Shipment", href: "/track" },
  ];

  return (
    <footer ref={ref} className="border-t border-border/50 bg-surface-overlay">
      <div className="container mx-auto px-4 md:px-8">
        {/* Main footer */}
        <div className="py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <img src="/lourex-logo.png" alt="LOUREX" className="h-8 w-auto" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {lang === "ar"
                ? "سوق B2B عالمي موثوق يربط المشترين والموردين والمصنعين."
                : "Verified global B2B marketplace connecting buyers, suppliers, and manufacturers."}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>{lang === "ar" ? "متاح عالمياً" : "Available Worldwide"}</span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-sm font-semibold mb-4">{lang === "ar" ? "المنصة" : "Platform"}</h4>
            <ul className="space-y-2.5">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold mb-4">{lang === "ar" ? "الشركة" : "Company"}</h4>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold mb-4">{lang === "ar" ? "قانوني" : "Legal"}</h4>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/50 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} LOUREX. {t("footer.tagline")}
          </p>
          <p className="text-xs text-muted-foreground/60 uppercase tracking-wider">
            Verified Global B2B Marketplace
          </p>
        </div>
      </div>
    </footer>
  );
});
Footer.displayName = "Footer";

export default Footer;

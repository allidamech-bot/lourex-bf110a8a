import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";

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
    { label: lang === "ar" ? "طلب شراء" : "Purchase Request", href: "/request" },
    { label: lang === "ar" ? "تتبع الشحن" : "Track Shipment", href: "/track" },
  ];

  return (
    <footer ref={ref} className="border-t border-border/50 bg-surface-overlay">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <img src="/logo.png" alt="LOUREX" className="h-8 w-auto" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              {lang === "ar"
                ? "منصة وساطة وتشغيل ذكية تربط العميل بصفقات شراء وتتبع ومحاسبة منضبطة."
                : "Smart operations platform connecting customers with purchase deals, tracking, and disciplined accounting."}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span>{lang === "ar" ? "متاح عالمياً" : "Available Worldwide"}</span>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">{lang === "ar" ? "المنصة" : "Platform"}</h4>
            <ul className="space-y-2.5">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">{lang === "ar" ? "الشركة" : "Company"}</h4>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">{lang === "ar" ? "قانوني" : "Legal"}</h4>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/50 py-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            {"\u00A9"} {new Date().getFullYear()} LOUREX. {t("footer.tagline")}
          </p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground/60">
            Private Smart Operations Platform
          </p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;

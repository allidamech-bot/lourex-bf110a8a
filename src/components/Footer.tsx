import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { FileBadge, Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { publicContactInfo, getWhatsAppUrl } from "@/lib/contactInfo";

const Footer = forwardRef<HTMLElement>((_props, ref) => {
  const { t, lang } = useI18n();
  const isArabic = lang === "ar";

  const navLinks = [
    { label: t("nav.about"), href: "/about" },
    { label: isArabic ? "من هي لوريكس؟" : "About LOUREX", href: "/about-lourex" },
    { label: t("nav.whyLourex"), href: "/why-lourex" },
    { label: isArabic ? "الأسئلة الشائعة" : "FAQ", href: "/faq" },
    { label: t("nav.contact"), href: "/contact" },
  ];

  const sourcingLinks = [
    { label: isArabic ? "توريد الشوكولاتة" : "Chocolate Sourcing", href: "/chocolate-sourcing" },
    { label: isArabic ? "توريد البسكويت" : "Biscuits Sourcing", href: "/biscuits-sourcing" },
    { label: isArabic ? "توريد المواد الغذائية" : "Food Products Sourcing", href: "/food-products-sourcing" },
    { label: isArabic ? "المنتجات التركية" : "Turkish Products", href: "/turkish-products" },
    { label: isArabic ? "المنتجات السورية" : "Syrian Products", href: "/syrian-products" },
  ];

  const legalLinks = [
    { label: t("consent.privacyTitle"), href: "/privacy" },
    { label: t("consent.tosTitle"), href: "/terms" },
  ];

  const platformLinks = [
    { label: t("nav.purchaseRequest"), href: "/request" },
    { label: t("nav.trackShipment"), href: "/track" },
    { label: isArabic ? "المنتجات" : "Products", href: "/products" },
  ];

  const contactLinks = [
    { label: publicContactInfo.email, href: `mailto:${publicContactInfo.email}`, icon: Mail },
    { label: publicContactInfo.phone, href: `tel:${publicContactInfo.phoneTel}`, icon: Phone, ltr: true },
    {
      label: isArabic ? "واتساب" : "WhatsApp",
      href: getWhatsAppUrl(isArabic ? "مرحباً لوريكس، أحتاج إلى المساعدة." : "Hello LOUREX, I need support."),
      icon: MessageCircle,
    },
    { label: publicContactInfo.website, href: publicContactInfo.websiteUrl, icon: Globe },
  ];

  const socialLinks = [
    { label: "Instagram", href: publicContactInfo.social.instagram },
    { label: "TikTok", href: publicContactInfo.social.tiktok },
  ];

  const isExternal = (href: string) => href.startsWith("http");

  return (
    <footer ref={ref} className="relative overflow-hidden bg-footer text-footer-foreground">
      <div className="meridian-line absolute inset-x-0 top-0" aria-hidden="true" />
      <svg
        className="pointer-events-none absolute -top-24 end-[-10%] h-[420px] w-[720px] text-footer-accent/10"
        viewBox="0 0 720 420"
        fill="none"
        aria-hidden="true"
      >
        <path d="M0 360 C 180 120, 420 80, 720 140" stroke="currentColor" strokeWidth="1" />
        <path d="M40 420 C 240 200, 460 160, 720 230" stroke="currentColor" strokeWidth="1" />
        <path d="M120 420 C 300 270, 500 250, 720 320" stroke="currentColor" strokeWidth="1" />
      </svg>

      <div className="container relative mx-auto px-4 md:px-8">
        <div className="grid gap-10 py-14 lg:grid-cols-[1.3fr_2fr] lg:gap-16">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-3 rounded-2xl bg-footer-foreground/[0.06] p-2 pe-4 ring-1 ring-footer-foreground/10">
              <img src="/logo.png" alt="LOUREX official logo" className="h-10 w-10 object-contain" />
              <span className="font-heading text-lg font-extrabold tracking-[0.08em]">LOUREX</span>
            </div>
            <p className="max-w-sm text-sm leading-7 text-footer-muted">
              {isArabic
                ? "وساطة وتنسيق توريد للمواد الغذائية والحلويات بين المشترين التجاريين والموردين."
                : "Trade intermediary and sourcing coordination for food and sweets products."}
            </p>
            <ul className="space-y-2.5">
              {contactLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target={isExternal(link.href) ? "_blank" : undefined}
                    rel={isExternal(link.href) ? "noreferrer" : undefined}
                    className="group inline-flex items-center gap-2.5 text-sm text-footer-foreground/90 transition-colors hover:text-footer-accent"
                  >
                    <link.icon className="h-4 w-4 text-footer-accent" />
                    <span dir={link.ltr ? "ltr" : undefined}>{link.label}</span>
                  </a>
                </li>
              ))}
              <li className="inline-flex items-center gap-2.5 text-sm text-footer-foreground/90">
                <MapPin className="h-4 w-4 text-footer-accent" />
                {isArabic ? publicContactInfo.location.ar : publicContactInfo.location.en}
              </li>
              <li className="flex items-center gap-2.5 text-sm text-footer-muted">
                <FileBadge className="h-4 w-4 text-footer-accent" />
                {isArabic ? publicContactInfo.commercialRegistration.ar : publicContactInfo.commercialRegistration.en}
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <FooterColumn title={isArabic ? "المنصة" : "Platform"} links={platformLinks} />
            <FooterColumn title={isArabic ? "التوريد" : "Sourcing"} links={sourcingLinks} />
            <FooterColumn title={isArabic ? "لوريكس" : "LOUREX"} links={navLinks} />
            <div>
              <FooterColumn title={isArabic ? "قانوني" : "Legal"} links={legalLinks} />
              <h4 className="mb-3 mt-6 text-xs font-semibold text-footer-muted">
                {isArabic ? "القنوات الرسمية" : "Official channels"}
              </h4>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="me noreferrer"
                    className="rounded-full px-3 py-1 text-xs ring-1 ring-footer-foreground/15 transition hover:text-footer-accent hover:ring-footer-accent/50"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-footer-foreground/10 py-6 text-xs text-footer-muted sm:flex-row">
          <p>
            {"\u00A9"} {new Date().getFullYear()} {isArabic ? "لوريكس LOUREX. جميع الحقوق محفوظة." : "LOUREX. All rights reserved."}
          </p>
          <a href={publicContactInfo.websiteUrl} className="transition-colors hover:text-footer-accent">
            {publicContactInfo.website}
          </a>
        </div>
      </div>
    </footer>
  );
});

const FooterColumn = ({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) => (
  <div>
    <h4 className="mb-4 text-xs font-semibold text-footer-muted">{title}</h4>
    <ul className="space-y-2.5">
      {links.map((link) => (
        <li key={link.href}>
          <Link to={link.href} className="text-sm text-footer-foreground/85 transition-colors hover:text-footer-accent">
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

Footer.displayName = "Footer";

export default Footer;

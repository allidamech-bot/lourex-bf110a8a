import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
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
    { label: publicContactInfo.phone, href: `tel:${publicContactInfo.phoneTel}` },
    { label: publicContactInfo.email, href: `mailto:${publicContactInfo.email}` },
    {
      label: `WhatsApp TR ${publicContactInfo.whatsappNumbers.turkey.display}`,
      href: getWhatsAppUrl("Hello LOUREX, I need support.", publicContactInfo.whatsappNumbers.turkey.number),
    },
    {
      label: `WhatsApp KSA ${publicContactInfo.whatsappNumbers.saudi.display}`,
      href: getWhatsAppUrl("Hello LOUREX, I need support.", publicContactInfo.whatsappNumbers.saudi.number),
    },
  ];

  const socialLinks = [
    { label: "Instagram", href: publicContactInfo.social.instagram },
    { label: "TikTok", href: publicContactInfo.social.tiktok },
  ];

  return (
    <footer ref={ref} className="border-t border-amber-200/10 bg-stone-950 text-stone-300">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-4">
            <img src="/logo.png" alt="LOUREX official logo" className="h-8 w-auto brightness-110" />
            <p className="text-sm leading-relaxed text-stone-400">
              {isArabic
                ? "شركة وساطة وتنسيق توريد وتصدير للمواد الغذائية والحلويات، تربط المشترين التجاريين بالموردين."
                : "Trade intermediary and sourcing coordination for food and sweets products, connecting business buyers with suppliers."}
            </p>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Globe className="h-3.5 w-3.5 text-amber-500" />
              <span>{isArabic ? "للمشترين التجاريين حول العالم" : "For global business buyers"}</span>
            </div>
          </div>

          <FooterColumn title={isArabic ? "المنصة" : "Platform"} links={platformLinks} />
          <FooterColumn title={isArabic ? "الوساطة والتوريد" : "Products & Sourcing"} links={sourcingLinks} />
          <FooterColumn title={isArabic ? "المؤسسة" : "LOUREX"} links={navLinks} />

          <div>
            <h4 className="mb-4 text-sm font-semibold text-stone-100">{isArabic ? "تواصل" : "Contact"}</h4>
            <ul className="space-y-2.5">
              {contactLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-stone-400 transition-colors hover:text-amber-500"
                    target={link.href.startsWith("https://wa.me") ? "_blank" : undefined}
                    rel={link.href.startsWith("https://wa.me") ? "noreferrer" : undefined}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <h4 className="mb-3 mt-5 text-sm font-semibold text-stone-100">{isArabic ? "القنوات الرسمية" : "Official Channels"}</h4>
            <ul className="space-y-2.5">
              {socialLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-stone-400 transition-colors hover:text-amber-500"
                    target="_blank"
                    rel="me noreferrer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <h4 className="mb-3 mt-5 text-sm font-semibold text-stone-100">{isArabic ? "قانوني" : "Legal"}</h4>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-stone-400 transition-colors hover:text-amber-500">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-amber-200/10 py-6 sm:flex-row">
          <p className="text-xs text-stone-500">
            {"\u00A9"} {new Date().getFullYear()}{" "}
            {isArabic ? "لوريكس LOUREX" : "LOUREX"}.
            {" "}{t("footer.tagline")}
          </p>
          <p className="text-xs uppercase tracking-wider text-stone-600">
            Trade Intermediary & Sourcing Coordination
          </p>
        </div>
      </div>
    </footer>
  );
});

const FooterColumn = ({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) => (
  <div>
    <h4 className="mb-4 text-sm font-semibold text-stone-100">{title}</h4>
    <ul className="space-y-2.5">
      {links.map((link) => (
        <li key={link.href}>
          <Link to={link.href} className="text-sm text-stone-400 transition-colors hover:text-amber-500">
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

Footer.displayName = "Footer";

export default Footer;

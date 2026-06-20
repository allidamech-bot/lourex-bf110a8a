import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { publicContactInfo, getWhatsAppUrl } from "@/lib/contactInfo";

const Footer = forwardRef<HTMLElement>((_props, ref) => {
  const { t, lang } = useI18n();

  const navLinks = [
    { label: t("nav.about"), href: "/about" },
    { label: t("nav.whyLourex"), href: "/why-lourex" },
    { label: t("nav.contact"), href: "/contact" },
  ];

  const legalLinks = [
    { label: t("consent.privacyTitle"), href: "/privacy" },
    { label: t("consent.tosTitle"), href: "/terms" },
  ];

  const platformLinks = [
    { label: t("nav.purchaseRequest"), href: "/request" },
    { label: t("nav.trackShipment"), href: "/track" },
  ];

  const contactLinks = [
    { label: publicContactInfo.phone, href: `tel:${publicContactInfo.phoneTel}` },
    { label: publicContactInfo.email, href: `mailto:${publicContactInfo.email}` },
    { label: `WhatsApp ${publicContactInfo.whatsappDisplay}`, href: getWhatsAppUrl("Hello LOUREX, I need support.") },
  ];

  const socialLinks = [
    { label: "Instagram", href: publicContactInfo.social.instagram },
    { label: "TikTok", href: publicContactInfo.social.tiktok },
  ];

  return (
    <footer ref={ref} className="border-t border-amber-200/10 bg-stone-950 text-stone-300">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <img src="/logo.png" alt="LOUREX official logo" className="h-8 w-auto brightness-110" />
            <p className="text-sm leading-relaxed text-stone-400">
              {lang === "ar"
                ? "شركة توريد وتصدير B2B متخصصة في الشوكولاتة والبسكويت والمواد الغذائية للمشترين التجاريين حول العالم."
                : "B2B food sourcing and trade operations for chocolate, biscuits, and food products for global business buyers."}
            </p>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Globe className="h-3.5 w-3.5 text-amber-500" />
              <span>{lang === "ar" ? "متاح عالمياً" : "Available Worldwide"}</span>
            </div>
          </div>

          <FooterColumn title={lang === "ar" ? "المنصة" : "Platform"} links={platformLinks} />
          <FooterColumn title={lang === "ar" ? "المؤسسة" : "LOUREX"} links={navLinks} />

          <div>
            <h4 className="mb-4 text-sm font-semibold text-stone-100">{lang === "ar" ? "تواصل" : "Contact"}</h4>
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
            <h4 className="mb-3 mt-5 text-sm font-semibold text-stone-100">{lang === "ar" ? "القنوات الرسمية" : "Official Channels"}</h4>
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
            <h4 className="mb-3 mt-5 text-sm font-semibold text-stone-100">{lang === "ar" ? "قانوني" : "Legal"}</h4>
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
            {lang === "ar" ? "لوركس LOUREX" : "LOUREX"}.
            {" "}{t("footer.tagline")}
          </p>
          <p className="text-xs uppercase tracking-wider text-stone-600">
            B2B Food Sourcing & Trade Operations
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

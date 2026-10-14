import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, FileBadge, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { publicContactInfo, getWhatsAppUrl } from "@/lib/contactInfo";

type FooterNavLink = { label: string; href: string };

const FooterColumn = ({ title, links }: { title: string; links: FooterNavLink[] }) => (
  <div className="lrx-footer-column">
    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.13em] text-footer-accent">
      {title}
    </h3>
    <ul className="space-y-1">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            to={link.href}
            className="inline-flex min-h-10 items-center text-[13px] font-medium text-footer-foreground/75 transition-colors hover:text-footer-foreground focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-footer-accent"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const Footer = forwardRef<HTMLElement>((_props, ref) => {
  const { t, lang } = useI18n();
  const ar = lang === "ar";

  const platformLinks: FooterNavLink[] = [
    { label: ar ? "المنتجات" : "Products", href: "/products" },
    { label: t("nav.purchaseRequest"), href: "/request" },
    { label: t("nav.trackShipment"), href: "/track" },
  ];

  const sourcingLinks: FooterNavLink[] = [
    { label: ar ? "توريد الشوكولاتة" : "Chocolate sourcing", href: "/chocolate-sourcing" },
    { label: ar ? "توريد البسكويت" : "Biscuit sourcing", href: "/biscuits-sourcing" },
    { label: ar ? "توريد المواد الغذائية" : "Food products", href: "/food-products-sourcing" },
    { label: ar ? "المنتجات التركية" : "Turkish products", href: "/turkish-products" },
    { label: ar ? "المنتجات السورية" : "Syrian products", href: "/syrian-products" },
  ];

  const companyLinks: FooterNavLink[] = [
    { label: t("nav.about"), href: "/about" },
    { label: ar ? "من هي لوريكس؟" : "About LOUREX", href: "/about-lourex" },
    { label: t("nav.whyLourex"), href: "/why-lourex" },
    { label: ar ? "الأسئلة الشائعة" : "FAQ", href: "/faq" },
    { label: t("nav.contact"), href: "/contact" },
  ];

  const whatsapp = getWhatsAppUrl(ar ? "مرحباً لوريكس، أحتاج إلى المساعدة." : "Hello LOUREX, I need support.");

  return (
    <footer ref={ref} className="lrx-footer relative isolate overflow-hidden bg-footer text-footer-foreground">
      <div className="meridian-line absolute inset-x-0 top-0" aria-hidden="true" />
      <div className="lrx-footer-inner">
        <div className="lrx-footer-intro">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 font-extrabold text-xl tracking-wider">
              <img src="/lourex-official.jpeg" alt="LOUREX official logo" width="40" height="40" loading="lazy" className="h-10 w-10 object-contain" />
              LOUREX
            </Link>
            <p className="mt-2 max-w-md text-sm leading-6 text-footer-muted">
              {ar ? "تنسيق التوريد والتجارة الدولية، من طلب الشراء حتى التسليم." : "International sourcing and trade coordination, from request to delivery."}
            </p>
          </div>
          <Link to="/request" className="lrx-footer-cta">
            {ar ? "ابدأ طلب شراء" : "Start a sourcing request"}
            <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
        <nav className="lrx-footer-platform" aria-label={ar ? "الروابط الرئيسية" : "Key links"}>
          {platformLinks.map(link => <Link key={link.href} to={link.href}>{link.label}<ArrowUpRight className="h-3 w-3 rtl:-scale-x-100" aria-hidden="true" /></Link>)}
        </nav>
        <div className="lrx-footer-content">
          <section className="lrx-footer-contact" aria-label={ar ? "تواصل معنا" : "Get in touch"}>
            <h3 className="text-xs font-bold text-footer-accent">{ar ? "تواصل معنا" : "Get in touch"}</h3>
            <address className="lrx-footer-address not-italic">
              <a href={"tel:" + publicContactInfo.phoneTel}><Phone aria-hidden="true" /><bdi dir="ltr">{publicContactInfo.phone}</bdi></a>
              <a href={"mailto:" + publicContactInfo.email}><Mail aria-hidden="true" /><bdi dir="ltr">{publicContactInfo.email}</bdi></a>
            </address>
            <div className="lrx-footer-social">
              <a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" aria-hidden="true" />WhatsApp</a>
              <a href={publicContactInfo.social.instagram} target="_blank" rel="me noreferrer">Instagram</a>
              <a href={publicContactInfo.social.tiktok} target="_blank" rel="me noreferrer">TikTok</a>
            </div>
          </section>
          <nav className="lrx-footer-links" aria-label={ar ? "التوريد والشركة" : "Sourcing and company"}>
            <FooterColumn title={ar ? "الشركة" : "Company"} links={companyLinks} />
            <FooterColumn title={ar ? "التوريد" : "Sourcing"} links={sourcingLinks} />
          </nav>
        </div>
        <div className="lrx-footer-details text-footer-muted">
          <span><MapPin aria-hidden="true" />{ar ? publicContactInfo.location.ar : publicContactInfo.location.en}</span>
          <span><FileBadge aria-hidden="true" />{ar ? publicContactInfo.commercialRegistration.ar : publicContactInfo.commercialRegistration.en}</span>
          <a href={publicContactInfo.websiteUrl} target="_blank" rel="noreferrer" dir="ltr">{publicContactInfo.website}</a>
        </div>
        <div className="lrx-footer-bottom text-footer-muted">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/privacy">{t("consent.privacyTitle")}</Link>
            <Link to="/terms">{t("consent.tosTitle")}</Link>
          </div>
          <span>{"© " + new Date().getFullYear() + " LOUREX. " + (ar ? "جميع الحقوق محفوظة." : "All rights reserved.")}</span>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;

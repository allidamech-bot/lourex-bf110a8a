import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, FileBadge2, Globe2, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { publicContactInfo, getWhatsAppUrl } from "@/lib/contactInfo";

type FooterNavLink = { label: string; href: string };

const FooterColumn = ({ title, links }: { title: string; links: FooterNavLink[] }) => (
  <div>
    <h3 className="mb-5 text-[11px] font-bold uppercase tracking-[0.13em] text-footer-accent">
      {title}
    </h3>
    <ul className="space-y-3">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            to={link.href}
            className="inline-flex min-h-7 items-center text-[13px] font-medium text-footer-foreground/75 transition-colors hover:text-footer-foreground focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-footer-accent"
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
    <footer ref={ref} className="relative isolate overflow-hidden bg-footer text-footer-foreground">
      <div className="meridian-line absolute inset-x-0 top-0" aria-hidden="true" />
      <div aria-hidden="true" className="pointer-events-none absolute -end-48 -top-72 h-[46rem] w-[46rem] rounded-full border border-footer-accent/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -end-20 -top-40 h-[31rem] w-[31rem] rounded-full border border-footer-accent/10" />
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-7 border-b border-footer-foreground/15 py-12 sm:py-16 lg:flex-row lg:items-center">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-footer-accent">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-footer-foreground/15 bg-footer-foreground/5">
                <img src="/logo.png" alt="LOUREX official logo" className="h-9 w-9 object-contain" />
              </span>
              <span className="text-2xl font-extrabold tracking-[0.06em]">LOUREX</span>
            </Link>
            <p className="mt-4 max-w-[27rem] text-sm leading-7 text-footer-muted">
              {ar
                ? "تنسيق التوريد والتجارة الدولية، من طلب الشراء حتى التسليم."
                : "International sourcing and trade coordination, from request to delivery."}
            </p>
          </div>
          <Link
            to="/request"
            className="group inline-flex min-h-12 w-fit items-center justify-center gap-3 rounded-2xl bg-footer-accent px-6 py-3 text-sm font-bold text-[#072D2B] transition-colors hover:bg-[#A7EFE6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-footer-accent/30"
          >
            {ar ? "ابدأ طلب شراء" : "Start a sourcing request"}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-x-10 gap-y-11 border-b border-footer-foreground/15 py-12 sm:grid-cols-2 sm:py-14 lg:grid-cols-[1.1fr_1fr_1fr_1.4fr]">
          <FooterColumn title={ar ? "المنصة" : "Platform"} links={platformLinks} />
          <FooterColumn title={ar ? "التوريد" : "Sourcing"} links={sourcingLinks} />
          <FooterColumn title={ar ? "الشركة" : "Company"} links={companyLinks} />

          <div>
            <h3 className="mb-5 text-[11px] font-bold uppercase tracking-[0.13em] text-footer-accent">
              {ar ? "تواصل معنا" : "Get in touch"}
            </h3>
            <address className="space-y-3 not-italic">
              <a href={"mailto:" + publicContactInfo.email} className="flex items-start gap-3 text-[13px] text-footer-foreground/85 transition-colors hover:text-footer-accent">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-footer-accent" aria-hidden="true" />
                <span dir="ltr" className="break-all">{publicContactInfo.email}</span>
              </a>
              <a href={"tel:" + publicContactInfo.phoneTel} className="flex items-start gap-3 text-[13px] text-footer-foreground/85 transition-colors hover:text-footer-accent">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-footer-accent" aria-hidden="true" />
                <span dir="ltr">{publicContactInfo.phone}</span>
              </a>
              <div className="flex items-start gap-3 text-[13px] text-footer-foreground/85">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-footer-accent" aria-hidden="true" />
                <span>{ar ? publicContactInfo.location.ar : publicContactInfo.location.en}</span>
              </div>
              <div className="flex items-start gap-3 text-[12px] text-footer-muted">
                <FileBadge2 className="mt-0.5 h-4 w-4 shrink-0 text-footer-accent" aria-hidden="true" />
                <span>{ar ? publicContactInfo.commercialRegistration.ar : publicContactInfo.commercialRegistration.en}</span>
              </div>
              <a href={publicContactInfo.websiteUrl} target="_blank" rel="noreferrer" className="flex items-start gap-3 text-[13px] text-footer-foreground/85 transition-colors hover:text-footer-accent">
                <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-footer-accent" aria-hidden="true" />
                {publicContactInfo.website}
              </a>
            </address>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <a href={whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-footer-foreground/20 px-3.5 py-2 text-xs font-semibold transition-colors hover:border-footer-accent/60 hover:text-footer-accent">
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
              </a>
              <a href={publicContactInfo.social.instagram} target="_blank" rel="me noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-footer-foreground/20 px-3.5 py-2 text-xs transition-colors hover:border-footer-accent/60 hover:text-footer-accent">Instagram</a>
              <a href={publicContactInfo.social.tiktok} target="_blank" rel="me noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-footer-foreground/20 px-3.5 py-2 text-xs transition-colors hover:border-footer-accent/60 hover:text-footer-accent">TikTok</a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 py-6 text-xs text-footer-muted sm:flex-row sm:items-center">
          <span>{"© " + new Date().getFullYear() + " LOUREX. " + (ar ? "جميع الحقوق محفوظة." : "All rights reserved.")}</span>
          <div className="flex flex-wrap items-center gap-6">
            <Link to="/privacy" className="transition-colors hover:text-footer-accent">{t("consent.privacyTitle")}</Link>
            <Link to="/terms" className="transition-colors hover:text-footer-accent">{t("consent.tosTitle")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;

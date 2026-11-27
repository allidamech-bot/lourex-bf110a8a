import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import Footer from "@/components/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useI18n } from "@/lib/i18n";
import aeoContent from "@/lib/aeo-content.json";

type AeoPageKind = keyof typeof aeoContent.pages;
type SearchLanguage = "en" | "ar" | "tr";
const languages = ["en","ar","tr"] as const;
const localizedPath = (path:string, language:SearchLanguage) => language === "en" ? path : "/" + language + path;
const languageLabels = { en:"English", ar:"العربية", tr:"Türkçe" };
const labels = {
  en:{ brand:"LOUREX / TRADE & RESOURCES",works:"How LOUREX works",focus:"Sourcing focus",related:"Related public pages",home:"Home",catalog:"Catalog",contact:"Contact"},
  ar:{ brand:"لوريكس / التجارة والمصادر",works:"كيف تعمل لوريكس",focus:"نطاق التركيز",related:"صفحات مرتبطة",home:"الرئيسية",catalog:"الكتالوج",contact:"التواصل"},
  tr:{ brand:"LOUREX / TİCARET VE TEDARİK",works:"LOUREX nasıl çalışır",focus:"Tedarik kapsamı",related:"İlgili sayfalar",home:"Ana sayfa",catalog:"Katalog",contact:"İletişim"}
};
const localPaths = new Set(Object.values(aeoContent.pages).map(page => page.path));

export default function AeoPage({kind, locale}: {kind:AeoPageKind; locale?:SearchLanguage}) {
  const {lang:preferred,setLang} = useI18n();
  // Existing English URLs are the default; localized routes are deterministic.
  const lang = locale ?? "en";
  const content = aeoContent.pages[kind];
  const suffix = lang === "en" ? "En" : lang === "ar" ? "Ar" : "Tr";
  const title = content[`h1${suffix}`];
  const description = content[`intro${suffix}`];
  const l = labels[lang];
  const alternates = [...languages.map(language=>({lang:language,href:"https://www.lou-rex.com"+localizedPath(content.path,language)})),{lang:"x-default",href:"https://www.lou-rex.com"+content.path}];
  useEffect(()=>{
    const html=document.documentElement;
    if(lang!=="tr" && preferred!==lang) setLang(lang);
    html.lang=lang; html.dir=lang==="ar"?"rtl":"ltr";
    html.style.fontFamily=lang==="ar"?"\'Tajawal\', sans-serif":"";
    return ()=>{html.lang=preferred;html.dir=preferred==="ar"?"rtl":"ltr";html.style.fontFamily=preferred==="ar"?"\'Tajawal\', sans-serif":"";};
  },[lang,preferred,setLang]);
  return (
    <div className="lourex-public lourex-aeo min-h-screen bg-background text-foreground" lang={lang} dir={lang==="ar"?"rtl":"ltr"}>
      <SEO title={title} description={description} url={"https://www.lou-rex.com"+localizedPath(content.path,lang)} alternates={alternates} />
      {lang !== "tr" ? <SiteHeader /> : <header className="container mx-auto flex flex-wrap items-center justify-between gap-4 border-b border-border px-4 py-4"><Link to="/" className="flex items-center gap-3"><img src="/lourex-official.jpeg" alt="LOUREX" width="48" height="48" /><span>LOUREX</span></Link><nav className="flex flex-wrap gap-4 text-sm"><Link to="/">{l.home}</Link><Link to="/products">{l.catalog}</Link><Link to="/contact">{l.contact}</Link></nav></header>}
      <main className="container mx-auto px-4 py-14 md:px-8 md:py-20">
        <nav aria-label="Language" className="mb-8 flex flex-wrap gap-3">{languages.map(language=><a key={language} href={localizedPath(content.path,language)} hrefLang={language} lang={language} aria-current={lang===language?"page":undefined} className="rounded-full border border-border px-4 py-2 text-sm">{languageLabels[language]}</a>)}</nav>
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/90">{l.brand}</p>
          <h1 className="mt-5 font-serif text-4xl font-bold text-foreground md:text-6xl">{title}</h1>
          <p className="mt-6 text-lg leading-9 text-foreground">{description}</p>
          {kind!=="about" && <p className="mt-5 text-base leading-8 text-muted-foreground">{aeoContent[`${lang}Definition`]}</p>}
        </div>
        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-primary/20 bg-card p-6"><h2 className="font-serif text-2xl font-semibold text-foreground">{l.works}</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">{content[`focus${suffix}`]}</p></div>
          <div className="rounded-[1.5rem] border border-primary/20 bg-card p-6"><h2 className="font-serif text-2xl font-semibold text-foreground">{l.focus}</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">{aeoContent[`${lang}Focus`]}</p></div>
        </section>
        <section className="mt-10 rounded-[1.5rem] border border-border/70 bg-secondary/65 p-6"><h2 className="font-serif text-2xl font-semibold text-foreground">{l.related}</h2><div className="mt-5 flex flex-wrap gap-2">{aeoContent.relatedLinks.map(link=><Link key={link.to} to={localPaths.has(link.to)?localizedPath(link.to,lang):link.to} className="rounded-full border border-primary/20 bg-background/70 px-4 py-2 text-sm text-foreground transition hover:text-primary">{link[lang]}</Link>)}</div></section>
      </main>
      {lang!=="tr"?<Footer/>:<footer className="container mx-auto border-t border-border px-4 py-8"><Link to="/contact">LOUREX · {l.contact}</Link></footer>}
    </div>
  );
}

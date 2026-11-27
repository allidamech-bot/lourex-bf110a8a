import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
}

export function SEO({ 
  title, 
  description, 
  image = "/lourex-official.jpeg", 
  url = window.location.href, 
  type = "website",
  noindex = false 
}: SEOProps) {
  const { t } = useI18n();
  const canonicalUrl = new URL(url, "https://www.lou-rex.com/");
  const canonicalPath = canonicalUrl.pathname.replace(/\/+$/, "") || "/";
  const canonicalHref = `https://www.lou-rex.com${canonicalPath}`;
  const imageHref = new URL(image, "https://www.lou-rex.com/").href;
  const siteName = "LOUREX";
  const fullTitle = title
    ? title.toLowerCase().includes(siteName.toLowerCase())
      ? title
      : `${title} | ${siteName}`
    : siteName;
  const defaultDesc =
    t("common.appDescription") ||
    "LOUREX is a trade intermediary and sourcing coordination company for food and sweets products, connecting business buyers with suppliers and managing purchase requests, supplier coordination, deal follow-up, and delivery tracking.";
  const finalDesc = description || defaultDesc;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Update meta tags
    const updateMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalHref);

    const preventIndex = noindex || ["/track", "/auth"].includes(canonicalPath);
    const robots = document.querySelector('meta[name="robots"]');
    if (preventIndex) updateMeta("robots", "noindex, follow");
    else if (robots?.getAttribute("content") === "noindex, follow") robots.remove();

    updateMeta("description", finalDesc);
    updateMeta("og:title", fullTitle, "property");
    updateMeta("og:description", finalDesc, "property");
    updateMeta("og:image", imageHref, "property");
    updateMeta("og:url", canonicalHref, "property");
    updateMeta("og:type", type, "property");
    updateMeta("twitter:title", fullTitle);
    updateMeta("twitter:description", finalDesc);
    updateMeta("twitter:image", imageHref);
  }, [fullTitle, finalDesc, imageHref, canonicalHref, canonicalPath, type, noindex]);

  return null;
}

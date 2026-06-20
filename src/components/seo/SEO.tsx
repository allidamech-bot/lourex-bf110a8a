import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SEO({ 
  title, 
  description, 
  image = "/logo.png", 
  url = window.location.href, 
  type = "website" 
}: SEOProps) {
  const { t } = useI18n();
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
    canonical.setAttribute("href", url);

    updateMeta("description", finalDesc);
    updateMeta("og:title", fullTitle, "property");
    updateMeta("og:description", finalDesc, "property");
    updateMeta("og:image", image, "property");
    updateMeta("og:url", url, "property");
    updateMeta("og:type", type, "property");
    updateMeta("twitter:title", fullTitle);
    updateMeta("twitter:description", finalDesc);
    updateMeta("twitter:image", image);
  }, [fullTitle, finalDesc, image, url, type]);

  return null;
}

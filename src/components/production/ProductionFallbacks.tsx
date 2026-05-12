import { AlertTriangle, CloudOff, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { resolveProductionFallback, type ProductionFallbackKind } from "./productionFallbackResolver";

export function ProductionFallbackCard({
  kind,
  title,
  body,
  children,
}: {
  kind: ProductionFallbackKind;
  title?: string;
  body?: string;
  children?: ReactNode;
}) {
  const { lang } = useI18n();
  const language = lang === "ar" ? "ar" : "en";
  const copy = resolveProductionFallback(kind, language);
  const Icon = kind === "loading" ? Loader2 : kind === "backend" ? CloudOff : AlertTriangle;

  return (
    <div dir={language === "ar" ? "rtl" : "ltr"} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-start">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-400/10 text-amber-100">
          <Icon className={`h-5 w-5 ${kind === "loading" ? "animate-spin" : ""}`} />
        </div>
        <div className="min-w-0">
          <h3 className="whitespace-normal break-words font-serif text-xl font-semibold text-white">{title || copy.title}</h3>
          <p className="mt-1 whitespace-normal break-words text-sm leading-6 text-slate-400">{body || copy.body}</p>
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

export const ProductionSectionSkeleton = () => <ProductionFallbackCard kind="loading" />;

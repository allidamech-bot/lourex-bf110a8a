import { useMemo, useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpDrawer } from "@/features/help-center/components/HelpDrawer";
import { resolveHelpContent } from "@/features/help-center/services/helpContentResolver";
import type { LourexRole } from "@/features/auth/rbac";
import type { HelpPageKey } from "@/features/help-center/types/helpTypes";
import { useI18n } from "@/lib/i18n";

export function PageHelpBox({
  pageKey,
  role,
  className = "",
}: {
  pageKey: HelpPageKey;
  role?: LourexRole | null;
  className?: string;
}) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const content = useMemo(() => resolveHelpContent({ pageKey, language: lang === "ar" ? "ar" : "en", role }), [lang, pageKey, role]);
  const isArabic = lang === "ar";

  return (
    <>
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className={`rounded-2xl border border-gold/25 bg-card p-4 text-start shadow-sm ${className}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className={`whitespace-normal text-xs font-semibold text-gold ${isArabic ? "tracking-normal" : "uppercase tracking-[0.16em]"}`}>{content.eyebrow}</p>
              <h2 className="mt-1 whitespace-normal break-normal text-lg font-semibold leading-7 text-foreground">{content.title}</h2>
              <p className="mt-1 whitespace-normal text-sm leading-6 text-muted-foreground">{content.summary}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full shrink-0 rounded-xl border-gold/25 bg-gold/10 text-gold hover:bg-gold/15 sm:w-auto"
            onClick={() => setOpen(true)}
          >
            {isArabic ? "افتح الشرح" : "Open guide"}
          </Button>
        </div>
      </div>
      <HelpDrawer open={open} onOpenChange={setOpen} content={content} language={lang === "ar" ? "ar" : "en"} />
    </>
  );
}

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
        className={`rounded-2xl border border-sky-300/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(15,23,42,0.92))] p-4 text-start shadow-[0_14px_38px_rgba(14,165,233,0.08)] ${className}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-300/25 bg-sky-400/10 text-sky-100">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="whitespace-normal text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">{content.eyebrow}</p>
              <h2 className="mt-1 whitespace-normal break-normal text-lg font-semibold leading-7 text-white">{content.title}</h2>
              <p className="mt-1 whitespace-normal text-sm leading-6 text-slate-300">{content.summary}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full shrink-0 rounded-xl border-sky-300/25 bg-sky-400/10 text-sky-100 hover:bg-sky-400/15 sm:w-auto"
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

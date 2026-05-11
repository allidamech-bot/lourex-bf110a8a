import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { HelpStepList } from "@/features/help-center/components/HelpStepList";
import type { HelpLanguage, PageHelpContent } from "@/features/help-center/types/helpTypes";

export function HelpDrawer({
  open,
  onOpenChange,
  content,
  language,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: PageHelpContent;
  language: HelpLanguage;
}) {
  const isArabic = language === "ar";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        dir={isArabic ? "rtl" : "ltr"}
        className="mx-auto max-h-[88vh] max-w-4xl rounded-t-2xl border-white/10 bg-slate-950 text-start"
      >
        <DrawerHeader className={isArabic ? "text-right" : "text-left"}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={`text-xs font-semibold text-sky-200 ${isArabic ? "tracking-normal" : "uppercase tracking-[0.18em]"}`}>{content.eyebrow}</p>
              <DrawerTitle className="mt-2 whitespace-normal text-2xl leading-8 text-white">{content.title}</DrawerTitle>
              <p className="mt-2 whitespace-normal text-sm leading-7 text-slate-400">{content.summary}</p>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="shrink-0 text-slate-300 hover:text-white" aria-label={isArabic ? "إغلاق" : "Close"}>
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        <div className="grid max-h-[68vh] gap-3 overflow-y-auto px-4 pb-6 md:grid-cols-2">
          {content.topics.map((topic) => (
            <section key={topic.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="whitespace-normal text-base font-semibold leading-7 text-white">{topic.title}</h3>
              <p className="mt-2 whitespace-normal text-sm leading-7 text-slate-400">{topic.body}</p>
              <HelpStepList topic={topic} />
            </section>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

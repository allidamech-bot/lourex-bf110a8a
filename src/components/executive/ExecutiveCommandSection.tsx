import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Maximize2, Minimize2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface ExecutiveCommandSectionProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  secondaryWidgets?: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export const ExecutiveCommandSection: React.FC<ExecutiveCommandSectionProps> = ({
  title,
  description,
  icon,
  children,
  secondaryWidgets,
  defaultExpanded = true,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showSecondary, setShowSecondary] = useState(false);
  const { t } = useI18n();

  return (
    <div
      className={cn(
        "w-full rounded-[2.5rem] border border-amber-200/10 bg-stone-900/40 backdrop-blur-xl overflow-hidden transition-all duration-500",
        isExpanded ? "p-6 sm:p-8" : "p-4 sm:p-6",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-100 tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5 line-clamp-1">
                {description}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-xl border-amber-200/10 bg-stone-950/40 text-stone-400 hover:text-amber-200 transition-all hover:bg-stone-900"
        >
          {isExpanded ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-tighter">Collapse</span>
              <ChevronUp className="h-4 w-4" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-tighter">Expand View</span>
              <ChevronDown className="h-4 w-4" />
            </div>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="mt-8 space-y-8">
              <div className="w-full">
                {children}
              </div>

              {secondaryWidgets && (
                <div className="pt-6 border-t border-amber-200/5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSecondary(!showSecondary)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl text-stone-500 hover:text-amber-400 transition-all group"
                  >
                    {showSecondary ? (
                      <>
                        <Minimize2 className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t("commandCenter.hideAdvancedNodes")}</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t("commandCenter.revealAdvancedNodes")}</span>
                      </>
                    )}
                  </Button>

                  <AnimatePresence>
                    {showSecondary && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.4 }}
                        className="mt-6 w-full"
                      >
                        {secondaryWidgets}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

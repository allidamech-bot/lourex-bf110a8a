import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { cn } from "@/lib/utils";

interface ExecutiveCommandSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  secondaryWidgets?: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export const ExecutiveCommandSection: React.FC<ExecutiveCommandSectionProps> = ({
  title,
  icon,
  children,
  secondaryWidgets,
  defaultExpanded = true,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showSecondary, setShowSecondary] = useState(false);

  return (
    <section className={cn("w-full space-y-4", className)}>
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            {icon}
          </div>
          <h2 className="font-serif text-2xl font-semibold text-stone-100 uppercase tracking-wider">
            {title}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-stone-500 hover:text-amber-200 transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </Button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-6 pb-4">
              <div className="space-y-6">
                {children}
              </div>

              {secondaryWidgets && (
                <div className="space-y-4 pt-4 border-t border-amber-200/5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSecondary(!showSecondary)}
                    className="mx-auto flex items-center gap-2 rounded-xl border-amber-200/15 bg-stone-50/5 text-stone-400 hover:bg-stone-50/10 hover:text-stone-100"
                  >
                    {showSecondary ? (
                      <>
                        <Minimize2 className="h-3.5 w-3.5" />
                        Hide Advanced Intelligence
                      </>
                    ) : (
                      <>
                        <Maximize2 className="h-3.5 w-3.5" />
                        Explore Advanced Intelligence
                      </>
                    )}
                  </Button>

                  <AnimatePresence>
                    {showSecondary && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="grid grid-cols-1 gap-6 pt-4"
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
    </section>
  );
};

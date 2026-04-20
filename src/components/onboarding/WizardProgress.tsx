import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardProgressProps {
  currentStep: number;
  steps: { label: string }[];
}

export const WizardProgress = ({ currentStep, steps }: WizardProgressProps) => {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          return (
            <div key={i} className="flex-1 flex flex-col items-center min-w-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all border",
                  isDone && "bg-primary text-primary-foreground border-primary",
                  isActive && "bg-primary/15 text-primary border-primary ring-4 ring-primary/10",
                  !isDone && !isActive && "bg-secondary text-muted-foreground border-border"
                )}
              >
                {isDone ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span
                className={cn(
                  "text-[10px] md:text-xs mt-2 text-center truncate max-w-[80px]",
                  (isActive || isDone) ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 h-1 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
};

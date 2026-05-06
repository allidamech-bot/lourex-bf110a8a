import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) => (
  <div className="w-full max-w-full min-w-0 rounded-[1.5rem] border border-dashed border-primary/20 bg-gradient-to-br from-card via-card to-secondary/20 p-5 text-center shadow-[0_20px_50px_-30px_rgba(0,0,0,0.45)] sm:rounded-[2rem] sm:p-10">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="mt-5 break-words font-serif text-xl font-semibold sm:text-2xl">{title}</h3>
    <p className="mx-auto mt-3 max-w-xl break-words text-sm leading-7 text-muted-foreground">{description}</p>
    {actionLabel && onAction ? (
      <Button variant="gold" className="mt-6" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null}
  </div>
);

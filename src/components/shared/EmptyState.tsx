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
  <div className="rounded-[2rem] border border-dashed border-primary/20 bg-gradient-to-br from-card via-card to-secondary/20 p-10 text-center shadow-[0_20px_50px_-30px_rgba(0,0,0,0.45)]">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="mt-5 font-serif text-2xl font-semibold">{title}</h3>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">{description}</p>
    {actionLabel && onAction ? (
      <Button variant="gold" className="mt-6" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null}
  </div>
);

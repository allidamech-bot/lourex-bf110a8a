import { Link } from "react-router-dom";
import { AlertTriangle, Lock, ShieldAlert, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";

const iconMap = {
  forbidden: ShieldAlert,
  inactive: Lock,
  missing: UserX,
  error: AlertTriangle,
} as const;

type AuthStateScreenProps = {
  variant: keyof typeof iconMap;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    to: string;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
};

export const AuthStateScreen = ({
  variant,
  title,
  description,
  primaryAction,
  secondaryAction,
}: AuthStateScreenProps) => {
  const Icon = iconMap[variant];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl rounded-[2rem] border border-border/60 bg-card/95 p-8 text-center shadow-[0_28px_60px_-38px_rgba(0,0,0,0.68)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="mt-6 font-serif text-3xl font-semibold">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{description}</p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {primaryAction ? (
            <Button variant="gold" asChild>
              <Link to={primaryAction.to}>{primaryAction.label}</Link>
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { translate, type Lang } from "@/lib/i18n";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const getActiveLang = (): Lang => {
  if (typeof window === "undefined") return "en";

  const saved = window.localStorage.getItem("lourex-lang");
  if (saved === "ar" || saved === "en") return saved;

  return document.documentElement.lang === "ar" ? "ar" : "en";
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const lang = getActiveLang();
      const dir = lang === "ar" ? "rtl" : "ltr";

      return (
        <div className="flex min-h-[420px] items-center justify-center p-8" dir={dir}>
          <div className="max-w-lg rounded-[2rem] border border-border/60 bg-card/95 p-8 text-center shadow-[0_24px_60px_-38px_rgba(0,0,0,0.55)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">LOUREX Runtime Guard</p>
            <h3 className="mb-2 mt-3 font-serif text-2xl font-bold">
              {translate(lang, "errorBoundary.title")}
            </h3>
            <p className="mb-6 text-sm leading-7 text-muted-foreground">
              {translate(lang, "errorBoundary.description")}
            </p>
            <Button variant="outline" onClick={this.handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {translate(lang, "errorBoundary.retry")}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

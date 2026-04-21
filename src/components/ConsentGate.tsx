import { forwardRef, useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Lock, ScrollText, Shield } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getCurrentUser } from "@/domain/auth/session";
import { CONSENT_VERSION, getConsentState, saveConsents } from "@/domain/legal/consent";

interface ConsentGateProps {
  children: ReactNode;
}

type IpLookupResponse = {
  ip?: string;
};

const getClientIp = async () => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const payload = (await response.json()) as IpLookupResponse;
    return payload.ip?.trim() || "unknown";
  } catch {
    return "unknown";
  }
};

export const ConsentGate = forwardRef<HTMLDivElement, ConsentGateProps>(({ children }, _ref) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [hasConsented, setHasConsented] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tosChecked, setTosChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    const checkConsent = async () => {
      const userResult = await getCurrentUser();
      if (!isActive) {
        return;
      }

      if (userResult.error) {
        toast.error(t("consent.loadFailed"));
        setLoading(false);
        return;
      }

      const user = userResult.data;
      if (!user) {
        setHasConsented(true);
        setLoading(false);
        return;
      }

      setUserId(user.id);
      const consentResult = await getConsentState(user.id);
      if (!isActive) {
        return;
      }

      if (consentResult.error) {
        toast.error(t("consent.loadFailed"));
      } else {
        setHasConsented(consentResult.data ?? false);
      }

      setLoading(false);
    };

    void checkConsent();

    return () => {
      isActive = false;
    };
  }, [t]);

  const handleAccept = async () => {
    if (!userId || !tosChecked || !privacyChecked || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      const ipAddress = await getClientIp();
      const deviceInfo = `${navigator.userAgent} | ${navigator.language} | ${window.screen.width}x${window.screen.height}`;
      const consentResult = await saveConsents([
        {
          user_id: userId,
          consent_type: "terms_of_service",
          ip_address: ipAddress,
          device_info: deviceInfo,
          version: CONSENT_VERSION,
        },
        {
          user_id: userId,
          consent_type: "privacy_policy",
          ip_address: ipAddress,
          device_info: deviceInfo,
          version: CONSENT_VERSION,
        },
      ]);

      if (consentResult.error) {
        throw new Error(consentResult.error.message);
      }

      setHasConsented(true);
      toast.success(t("consent.accepted"));
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message ? error.message : t("consent.saveFailed");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (hasConsented) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{
          background: "radial-gradient(ellipse at center, hsl(var(--background)) 0%, hsl(0 0% 0% / 0.95) 100%)",
        }}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg"
        >
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/40 via-primary/10 to-transparent blur-sm" />

          <div className="relative space-y-6 rounded-2xl border border-primary/30 bg-card/95 p-8 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/30">
                  <Shield className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold tracking-wide">
                  <span className="text-primary">LOUREX</span> {t("consent.title")}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {t("consent.description")}
                </p>
              </div>
            </div>

            <div className="max-h-52 space-y-4 overflow-y-auto rounded-xl border border-border/50 bg-background/80 p-5 text-xs leading-relaxed">
              <div className="mb-2 flex items-center gap-2">
                <ScrollText className="h-4 w-4 shrink-0 text-primary" />
                <a
                  href="/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-foreground underline underline-offset-2 transition-colors hover:text-primary"
                >
                  {t("consent.tosTitle")}
                </a>
              </div>
              <p className="text-muted-foreground">{t("consent.tosContent")}</p>

              <div className="mt-4 border-t border-border/50 pt-4">
                <div className="mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4 shrink-0 text-primary" />
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-foreground underline underline-offset-2 transition-colors hover:text-primary"
                  >
                    {t("consent.privacyTitle")}
                  </a>
                </div>
                <p className="text-muted-foreground">{t("consent.privacyContent")}</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="group flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={tosChecked}
                  onCheckedChange={(checked) => setTosChecked(Boolean(checked))}
                  className="mt-0.5 border-primary/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <span className="text-sm transition-colors group-hover:text-foreground">{t("consent.agreeTerms")}</span>
              </label>
              <label className="group flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={privacyChecked}
                  onCheckedChange={(checked) => setPrivacyChecked(Boolean(checked))}
                  className="mt-0.5 border-primary/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <span className="text-sm transition-colors group-hover:text-foreground">{t("consent.agreePrivacy")}</span>
              </label>
            </div>

            <Button
              className="h-12 w-full bg-gradient-to-r from-primary to-primary/80 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:from-primary/90 hover:to-primary/70 disabled:opacity-40"
              disabled={!tosChecked || !privacyChecked || submitting}
              onClick={() => void handleAccept()}
            >
              {submitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  <CheckCircle2 className="me-2 h-5 w-5" />
                  {t("consent.accept")}
                </>
              )}
            </Button>

            <p className="text-center text-[10px] leading-relaxed text-muted-foreground/70">
              {t("consent.legalNote")}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

ConsentGate.displayName = "ConsentGate";

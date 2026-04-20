import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentNotificationBannerProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    balance_paid: boolean;
    balance_amount: number | null;
    currency: string | null;
  };
  onPaymentConfirmed: () => void;
}

export const PaymentNotificationBanner = ({ order, onPaymentConfirmed }: PaymentNotificationBannerProps) => {
  const { t } = useI18n();

  const shouldShow = ["customs", "delivered"].includes(order.status) && !order.balance_paid;

  if (!shouldShow) return null;

  const handleRelease = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from("audit_logs").insert({
      table_name: "orders",
      record_id: order.id,
      action: "payment_release",
      changed_by: user?.id || "",
      new_values: { 
        balance_amount: order.balance_amount,
        status: order.status,
        method: "authenticated_release" 
      },
    });

    toast.success(t("payment.released"));
    onPaymentConfirmed();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-primary">{t("payment.releaseTitle")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("payment.releaseDesc")} — {order.currency} {order.balance_amount?.toLocaleString()}
          </p>
        </div>
      </div>
      <Button variant="gold" size="sm" className="w-full" onClick={handleRelease}>
        {t("payment.confirmRelease")}
      </Button>
    </motion.div>
  );
};

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Calendar, FileText, Package, Loader2, CheckCircle2, X,
  AlertTriangle, ShieldCheck
} from "lucide-react";

interface RequestOrderFormProps {
  product: {
    id: string;
    name: string;
    price_per_unit: number | null;
    currency: string | null;
    factory_id: string;
    image_url: string | null;
    moq?: string | null;
  };
  factoryName?: string;
  onClose?: () => void;
}

const RequestOrderForm = ({ product, factoryName, onClose }: RequestOrderFormProps) => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const unitPrice = product.price_per_unit ?? 0;
  const total = unitPrice * quantity;
  const deposit = Math.round(total * 0.3);
  const balance = total - deposit;
  const currency = product.currency ?? "USD";

  // Parse MOQ value
  const moqNum = product.moq ? parseInt(product.moq.replace(/[^\d]/g, "")) : 0;
  const belowMoq = moqNum > 0 && quantity < moqNum;

  const handleSubmit = async () => {
    if (submitting || submitted) return; // prevent double-click

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    if (quantity < 1) {
      toast.error(lang === "ar" ? "الكمية مطلوبة" : "Quantity is required");
      return;
    }

    if (belowMoq) {
      toast.error(
        lang === "ar"
          ? `الحد الأدنى للطلب هو ${moqNum} وحدة`
          : `Minimum order quantity is ${moqNum} units`
      );
      return;
    }

    setSubmitting(true);
    try {
      const orderNumber = `LRX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const { data: order, error } = await supabase.from("orders").insert({
        order_number: orderNumber,
        buyer_id: user.id,
        factory_id: product.factory_id,
        product_id: product.id,
        quantity,
        total_amount: total,
        deposit_amount: deposit,
        balance_amount: balance,
        currency,
        notes: [
          details,
          deliveryDate ? `Preferred delivery: ${deliveryDate}` : "",
        ].filter(Boolean).join("\n") || null,
        status: "pending",
        payment_status: "awaiting_deposit",
      }).select("id, order_number").single();

      if (error) throw error;

      setSubmitted(true);
      toast.success(
        lang === "ar"
          ? `تم إنشاء الطلب ${order.order_number} بنجاح!`
          : `Order ${order.order_number} created successfully!`
      );

      // Navigate to orders after a brief success display
      setTimeout(() => navigate("/orders"), 1500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-primary/20 rounded-xl p-6 text-center space-y-3"
      >
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
        <h3 className="font-semibold text-lg">
          {lang === "ar" ? "تم تقديم الطلب بنجاح!" : "Order Submitted Successfully!"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {lang === "ar" ? "جاري التحويل إلى صفحة الطلبات..." : "Redirecting to orders..."}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-card border border-primary/20 rounded-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          {lang === "ar" ? "طلب شراء" : "Request Order"}
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Product summary */}
      <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
        <div className="w-12 h-12 rounded border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt="" className="w-full h-full object-cover" />
          ) : <Package className="w-5 h-5 text-muted-foreground/40" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{product.name}</p>
          <p className="text-xs text-muted-foreground">
            {unitPrice.toLocaleString()} {currency} / {lang === "ar" ? "وحدة" : "unit"}
          </p>
          {factoryName && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {lang === "ar" ? "المورد:" : "Supplier:"} {factoryName}
            </p>
          )}
        </div>
      </div>

      {/* MOQ warning */}
      {moqNum > 0 && (
        <div className={`flex items-center gap-2 text-xs p-2 rounded-lg ${belowMoq ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"}`}>
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>
            {lang === "ar" ? `الحد الأدنى للطلب: ${product.moq}` : `Minimum Order Quantity: ${product.moq}`}
          </span>
        </div>
      )}

      {/* Quantity */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          {lang === "ar" ? "الكمية" : "Quantity"}
        </label>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-lg">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-3 py-2 text-muted-foreground hover:text-foreground">−</button>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 text-center py-2 bg-transparent border-x border-border font-medium"
            />
            <button onClick={() => setQuantity(quantity + 1)}
              className="px-3 py-2 text-muted-foreground hover:text-foreground">+</button>
          </div>
        </div>
      </div>

      {/* Pricing Summary */}
      <div className="bg-secondary/30 rounded-lg p-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{lang === "ar" ? "سعر الوحدة" : "Unit Price"}</span>
          <span>{unitPrice.toLocaleString()} {currency}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{lang === "ar" ? "الكمية" : "Quantity"}</span>
          <span>× {quantity}</span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between font-semibold">
          <span>{lang === "ar" ? "الإجمالي" : "Total"}</span>
          <span className="text-primary">{total.toLocaleString()} {currency}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{lang === "ar" ? "دفعة مقدمة (30%)" : "Deposit (30%)"}</span>
          <span>{deposit.toLocaleString()} {currency}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{lang === "ar" ? "المتبقي (70%)" : "Balance (70%)"}</span>
          <span>{balance.toLocaleString()} {currency}</span>
        </div>
      </div>

      {/* Delivery Date */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {lang === "ar" ? "تاريخ التسليم المطلوب" : "Preferred Delivery Date"}
        </label>
        <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
          className="bg-secondary" />
      </div>

      {/* Additional Details */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {lang === "ar" ? "تفاصيل إضافية" : "Additional Details / Specifications"}
        </label>
        <Textarea
          value={details}
          onChange={e => setDetails(e.target.value)}
          placeholder={lang === "ar" ? "أي مواصفات خاصة أو متطلبات..." : "Custom specifications, packaging requirements, etc..."}
          className="bg-secondary"
          rows={3}
        />
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={submitting || belowMoq}
        className="w-full bg-gradient-gold text-primary-foreground font-semibold h-11"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <CheckCircle2 className="w-4 h-4 mr-2" />
        )}
        {lang === "ar" ? "تأكيد وإنشاء الطلب" : "Confirm & Create Order"}
      </Button>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
        <span>{lang === "ar" ? "طلبك محمي ومؤمن بالكامل" : "Your order is fully secure and protected"}</span>
      </div>
    </motion.div>
  );
};

export default RequestOrderForm;

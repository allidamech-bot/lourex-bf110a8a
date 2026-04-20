import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { Clock, XCircle, Building2, ArrowRight, Loader2 } from "lucide-react";

type Status = "none" | "pending" | "rejected" | "loading";

export const FactoryAccessGate = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data } = await supabase
        .from("factory_applications")
        .select("status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) setStatus("none");
      else if (data.status === "rejected") setStatus("rejected");
      else setStatus("pending");
    })();
  }, [navigate]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const config = {
    none: {
      icon: Building2,
      iconBg: "bg-primary/15 text-primary",
      title: "Become a Verified Supplier",
      desc: "Your account isn't linked to a factory yet. Submit a supplier application to access the dashboard, list products, and receive orders from global buyers.",
      cta: "Start Application",
      action: () => navigate("/factory-signup"),
    },
    pending: {
      icon: Clock,
      iconBg: "bg-yellow-500/15 text-yellow-500",
      title: "Application Under Review",
      desc: "Your supplier application is being reviewed by our verification team. This typically takes 24–48 hours. You'll get full dashboard access once approved.",
      cta: "Return Home",
      action: () => navigate("/"),
    },
    rejected: {
      icon: XCircle,
      iconBg: "bg-destructive/15 text-destructive",
      title: "Application Not Approved",
      desc: "Your supplier application did not meet our verification standards. Please contact our team to discuss next steps before reapplying.",
      cta: "Contact Support",
      action: () => navigate("/contact"),
    },
  }[status];

  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-32 pb-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-10 max-w-lg w-full text-center space-y-6"
        >
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${config.iconBg}`}>
            <Icon className="w-8 h-8" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-gradient-gold">{config.title}</h1>
          <p className="text-muted-foreground leading-relaxed">{config.desc}</p>
          <Button variant="gold" size="lg" onClick={config.action} className="w-full">
            {config.cta} <ArrowRight className="ms-2 w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

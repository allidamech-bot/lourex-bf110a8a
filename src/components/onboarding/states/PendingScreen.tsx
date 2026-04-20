import { motion } from "framer-motion";
import { Clock, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";

export const PendingScreen = ({ companyName }: { companyName?: string }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-32 pb-16 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-8 md:p-10 max-w-xl w-full">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-yellow-500/15 flex items-center justify-center">
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-gradient-gold">Application under review</h1>
            <p className="text-muted-foreground">
              {companyName ? <>Your application for <strong className="text-foreground">{companyName}</strong> has been received.</> : "Your supplier application has been received."}
              {" "}Our verification team typically responds within 24–48 hours.
            </p>
          </div>

          <div className="mt-8 space-y-3 text-sm">
            <Step done label="Application submitted" />
            <Step active label="Verification in progress" />
            <Step label="Approval & dashboard access" />
          </div>

          <div className="mt-8 p-4 rounded-lg bg-secondary/40 border border-border/50 flex items-start gap-3 text-sm">
            <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              We'll email you the moment a decision is made. You can safely close this page.
            </p>
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>Return home</Button>
            <Button variant="gold-outline" className="flex-1" onClick={() => navigate("/contact")}>Contact support</Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const Step = ({ label, done, active }: { label: string; done?: boolean; active?: boolean }) => (
  <div className="flex items-center gap-3">
    <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${done ? "bg-primary border-primary text-primary-foreground" : active ? "border-primary bg-primary/10" : "border-border bg-secondary"}`}>
      {done ? <CheckCircle2 className="w-4 h-4" /> : active ? <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> : null}
    </div>
    <span className={done || active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
  </div>
);

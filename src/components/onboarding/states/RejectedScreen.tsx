import { motion } from "framer-motion";
import { XCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";

export const RejectedScreen = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-32 pb-16 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-8 md:p-10 max-w-xl w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold">Application not approved</h1>
          <p className="text-muted-foreground">
            Your supplier application did not meet our current verification standards. Our team can guide you on what's needed before you reapply.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>Return home</Button>
            <Button variant="gold" className="flex-1" onClick={() => navigate("/contact")}>
              <MessageCircle className="w-4 h-4 me-2" /> Contact our team
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

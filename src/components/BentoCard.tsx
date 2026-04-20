import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  span?: "1" | "2" | "full";
}

const BentoCard = ({ children, className, delay = 0, span = "1" }: BentoCardProps) => {
  const spanClasses = {
    "1": "",
    "2": "md:col-span-2",
    full: "col-span-full",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border border-primary/20 bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300",
        spanClasses[span],
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export default BentoCard;

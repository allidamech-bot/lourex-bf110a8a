import { motion } from "framer-motion";
import { CheckCircle2, Circle, Sparkles, ArrowRight, Image as ImageIcon, Tags, Package, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { ActivationChecklist as ChecklistData } from "@/lib/supplierState";

interface Props {
  checklist: ChecklistData;
  onDismissable?: boolean;
}

export const ActivationChecklist = ({ checklist }: Props) => {
  const navigate = useNavigate();
  if (checklist.allComplete) return null;

  const items = [
    {
      key: "description",
      done: checklist.hasDescription,
      icon: FileText,
      label: "Complete your company description",
      hint: "Add at least 80 characters about your business",
      cta: "Edit profile",
      action: () => navigate("/profile"),
    },
    {
      key: "logo",
      done: checklist.hasLogo,
      icon: ImageIcon,
      label: "Upload your company logo",
      hint: "Builds trust with buyers at first glance",
      cta: "Upload logo",
      action: () => navigate("/profile"),
    },
    {
      key: "categories",
      done: checklist.hasCategories,
      icon: Tags,
      label: "Add product categories",
      hint: "So buyers can find you in search",
      cta: "Add categories",
      action: () => navigate("/profile"),
    },
    {
      key: "product",
      done: checklist.hasFirstProduct,
      icon: Package,
      label: "List your first product",
      hint: "Start receiving inquiries from buyers",
      cta: "Add product",
      action: () => navigate("/seller"),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-5 md:p-6 mb-6 border-primary/30"
    >
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold">Activate your supplier account</h3>
            <p className="text-xs text-muted-foreground">
              {checklist.completedCount} of {checklist.totalCount} steps complete · {checklist.percent}%
            </p>
          </div>
        </div>
        <div className="w-32 h-2 rounded-full bg-secondary overflow-hidden mt-2">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${checklist.percent}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                item.done ? "bg-primary/5 border-primary/30" : "bg-secondary/40 border-border hover:border-primary/40"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {item.done ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <p className={`text-sm font-medium truncate ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {item.label}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{item.hint}</p>
                {!item.done && (
                  <Button variant="ghost" size="sm" onClick={item.action} className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10">
                    {item.cta} <ArrowRight className="w-3 h-3 ms-1" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

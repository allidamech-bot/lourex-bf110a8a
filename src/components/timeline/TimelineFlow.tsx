import React from "react";
import { TimelineNode } from "./TimelineNode";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

export interface TimelineItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon: LucideIcon;
  status?: "default" | "active" | "success" | "warning";
}

interface TimelineFlowProps {
  items: TimelineItem[];
  className?: string;
}

export const TimelineFlow = ({ items, className }: TimelineFlowProps) => {
  return (
    <div className={`w-full max-w-full min-w-0 space-y-0 ${className || ""}`}>
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
        >
          <TimelineNode
            icon={item.icon}
            title={item.title}
            description={item.description}
            timestamp={item.timestamp}
            status={item.status}
            isLast={index === items.length - 1}
          />
        </motion.div>
      ))}
    </div>
  );
};

import React, { ReactNode } from "react";
import TimelineNode from "./TimelineNode";

export interface TimelineItem {
  id: string;
  title: string;
  subtitle?: string;
  time?: string;
  status?: string;
  type: "request" | "deal" | "shipment";
  icon: ReactNode;
}

interface TimelineFlowProps {
  items: TimelineItem[];
}

const TimelineFlow: React.FC<TimelineFlowProps> = ({ items }) => {
  return (
    <div className="flex flex-col">
      {items.map((item, index) => (
        <TimelineNode
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          time={item.time}
          status={item.status}
          type={item.type}
          icon={item.icon}
          isLast={index === items.length - 1}
        />
      ))}
    </div>
  );
};

export default TimelineFlow;

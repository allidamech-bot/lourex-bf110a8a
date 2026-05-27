import React from "react";
import { Card } from "../ui/card";

export const ProductionQualityPanel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Card className="p-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-md">
    <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">{title}</h3>
    {children}
  </Card>
);

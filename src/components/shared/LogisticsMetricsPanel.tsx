import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LogisticsMetrics, ContainerType } from "@/types/lourex";
import { Scale, Box, Truck, Package } from "lucide-react";

interface LogisticsMetricsPanelProps {
  metrics?: LogisticsMetrics | null;
  isEditable?: boolean;
  onChange?: (metrics: LogisticsMetrics) => void;
}

export const LogisticsMetricsPanel = ({
  metrics,
  isEditable = false,
  onChange,
}: LogisticsMetricsPanelProps) => {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const defaultMetrics: LogisticsMetrics = {
    weightKg: null,
    volumetricCbm: null,
    containerType: null,
    containerCount: null,
    palletsCount: null,
  };

  const currentMetrics = metrics || defaultMetrics;

  const handleChange = (field: keyof LogisticsMetrics, value: string | null) => {
    if (!onChange || !isEditable) return;

    let parsedValue: number | ContainerType | null = null;
    
    if (field === "containerType") {
      parsedValue = value as ContainerType;
    } else if (value !== null && value.trim() !== "") {
      parsedValue = Number(value);
      if (isNaN(parsedValue)) parsedValue = null;
    }

    onChange({
      ...currentMetrics,
      [field]: parsedValue,
    });
  };

  const labels = {
    title: isAr ? "القياسات اللوجستية" : "Logistics Metrics",
    subtitle: isAr 
      ? "تستخدم في الإقرارات الجمركية وحسابات الشحن" 
      : "Used for customs declarations and freight calculations",
    weight: isAr ? "الوزن الإجمالي (كغ)" : "Gross Weight (kg)",
    cbm: isAr ? "الحجم التقديري (CBM)" : "Volumetric (CBM)",
    containerType: isAr ? "نوع الحاوية / الشحن" : "Container / Freight Type",
    containerCount: isAr ? "عدد الحاويات" : "Container Count",
    palletsCount: isAr ? "عدد المنصات (Pallets)" : "Pallets Count",
    empty: isAr ? "غير محدد" : "Not specified",
    placeholders: {
      weight: "مثال: 1250",
      cbm: "مثال: 14.5",
      count: "العدد",
    }
  };

  const readOnlyItem = (icon: React.ReactNode, label: string, value: string | number | null) => (
    <div className="flex flex-col p-4 glass-card rounded-lg border border-border/50">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <span className="font-medium text-foreground text-lg">
        {value !== null ? value : <span className="text-muted-foreground text-sm">{labels.empty}</span>}
      </span>
    </div>
  );

  if (!isEditable) {
    return (
      <div className="space-y-4">
        <h3 className="font-medium text-gold flex items-center gap-2">
          <Truck className="w-4 h-4" />
          {labels.title}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {readOnlyItem(<Scale className="w-4 h-4" />, labels.weight, currentMetrics.weightKg)}
          {readOnlyItem(<Box className="w-4 h-4" />, labels.cbm, currentMetrics.volumetricCbm)}
          {readOnlyItem(<Truck className="w-4 h-4" />, labels.containerType, currentMetrics.containerType)}
          {readOnlyItem(<Package className="w-4 h-4" />, labels.palletsCount, currentMetrics.palletsCount)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5 glass-card rounded-xl border border-border">
      <div className="mb-2">
        <h3 className="font-medium text-gold flex items-center gap-2">
          <Truck className="w-5 h-5" />
          {labels.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{labels.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-muted-foreground">
            <Scale className="w-4 h-4" /> {labels.weight}
          </Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder={labels.placeholders.weight}
            value={currentMetrics.weightKg ?? ""}
            onChange={(e) => handleChange("weightKg", e.target.value)}
            className="border-border focus:ring-gold/50 focus:border-gold/50"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-muted-foreground">
            <Box className="w-4 h-4" /> {labels.cbm}
          </Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder={labels.placeholders.cbm}
            value={currentMetrics.volumetricCbm ?? ""}
            onChange={(e) => handleChange("volumetricCbm", e.target.value)}
            className="border-border focus:ring-gold/50 focus:border-gold/50"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-muted-foreground">
            <Package className="w-4 h-4" /> {labels.palletsCount}
          </Label>
          <Input
            type="number"
            min="0"
            step="1"
            placeholder={labels.placeholders.count}
            value={currentMetrics.palletsCount ?? ""}
            onChange={(e) => handleChange("palletsCount", e.target.value)}
            className="border-border focus:ring-gold/50 focus:border-gold/50"
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label className="flex items-center gap-2 text-muted-foreground">
            <Truck className="w-4 h-4" /> {labels.containerType}
          </Label>
          <div className="flex gap-2">
            <Select
              value={currentMetrics.containerType ?? ""}
              onValueChange={(val) => handleChange("containerType", val === "none" ? null : val)}
            >
              <SelectTrigger className="flex-1 border-border focus:ring-gold/50 focus:border-gold/50">
                <SelectValue placeholder={isAr ? "اختر نوع الحاوية..." : "Select container type..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{isAr ? "بدون تحديد" : "None"}</SelectItem>
                <SelectItem value="LCL">LCL (Shared / جزئي)</SelectItem>
                <SelectItem value="20ft">20-ft Container</SelectItem>
                <SelectItem value="40ft">40-ft Container</SelectItem>
                <SelectItem value="40ft_hc">40-ft High Cube</SelectItem>
              </SelectContent>
            </Select>

            {(currentMetrics.containerType && currentMetrics.containerType !== "LCL") && (
              <Input
                type="number"
                min="1"
                step="1"
                placeholder={labels.containerCount}
                value={currentMetrics.containerCount ?? ""}
                onChange={(e) => handleChange("containerCount", e.target.value)}
                className="w-24 border-border focus:ring-gold/50 focus:border-gold/50"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

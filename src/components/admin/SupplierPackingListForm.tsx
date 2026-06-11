import { useState } from "react";
import { Plus, Trash2, Box, Save, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { calculateTotalCBM, PackingItem } from "@/lib/logisticsUtils";
import { PackingListItem } from "@/types/lourex";
import { useI18n } from "@/lib/i18n";

interface SupplierPackingListFormProps {
  shipmentId: string;
  onSync: (cbm: number, totalWeight: number) => Promise<void>;
}

const ORIGIN_PACKING_ROLES = new Set(["owner", "operations_employee", "turkish_partner"]);

export const SupplierPackingListForm = ({ shipmentId, onSync }: SupplierPackingListFormProps) => {
  const { lang } = useI18n();
  const { profile } = useAuthSession();
  
  const [items, setItems] = useState<PackingListItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAr = lang === "ar";
  const canPreparePackingList = Boolean(profile?.role && ORIGIN_PACKING_ROLES.has(profile.role));

  if (!canPreparePackingList) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6">
        <p className="font-mono text-sm text-red-400">
          {isAr
            ? "صلاحيات غير كافية: قوائم التعبئة مخصصة للمالك، العمليات، أو الشريك التركي."
            : "Unauthorized access: packing lists are restricted to owner, operations, or Turkish partner roles."}
        </p>
      </div>
    );
  }

  const handleAddItem = () => {
    setItems([
      ...items,
      { itemName: "", lengthCm: 0, widthCm: 0, heightCm: 0, weightKg: 0, quantity: 1 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleUpdateItem = (index: number, field: keyof PackingListItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const packingItemsForCbm: PackingItem[] = items.map(item => ({
    length: item.lengthCm,
    width: item.widthCm,
    height: item.heightCm,
    quantity: item.quantity
  }));
  const totalCBM = calculateTotalCBM(packingItemsForCbm);
  const totalWeight = items.reduce((sum, item) => sum + (item.weightKg * item.quantity), 0);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSync(totalCBM, totalWeight);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-900/30 bg-stone-950 shadow-2xl">
      <div className="flex flex-col gap-4 border-b border-emerald-900/20 bg-black/60 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Box className="h-5 w-5 text-emerald-500" />
          <div>
            <h3 className="font-mono text-sm font-semibold tracking-wider text-emerald-400">
              {isAr ? "بوابة قوائم التعبئة للمصانع" : "SUPPLIER PACKING LIST INGRESS"}
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              {isAr ? `مرجع الشحنة: ${shipmentId || "غير محدد"}` : `Shipment reference: ${shipmentId || "not specified"}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-stone-500">Total Volume</p>
            <p className="font-mono text-sm text-emerald-400">{totalCBM.toFixed(2)} CBM</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-stone-500">Gross Weight</p>
            <p className="font-mono text-sm text-amber-400">{totalWeight.toFixed(2)} KG</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="flex flex-col items-end gap-3 rounded-lg border border-stone-800/50 bg-black/40 p-3 transition-colors hover:border-emerald-900/50 md:flex-row">
              <div className="grid w-full flex-1 grid-cols-2 gap-3 md:grid-cols-6">
                <div className="col-span-2 md:col-span-1">
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-stone-500">Item</label>
                  <input
                    type="text"
                    className="w-full rounded border border-stone-800 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 transition-colors focus:border-emerald-500/50 focus:outline-none"
                    placeholder="Product Name"
                    value={item.itemName}
                    onChange={(e) => handleUpdateItem(index, "itemName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-stone-500">L (cm)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded border border-stone-800 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 transition-colors focus:border-emerald-500/50 focus:outline-none"
                    value={item.lengthCm || ""}
                    onChange={(e) => handleUpdateItem(index, "lengthCm", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-stone-500">W (cm)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded border border-stone-800 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 transition-colors focus:border-emerald-500/50 focus:outline-none"
                    value={item.widthCm || ""}
                    onChange={(e) => handleUpdateItem(index, "widthCm", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-stone-500">H (cm)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded border border-stone-800 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 transition-colors focus:border-emerald-500/50 focus:outline-none"
                    value={item.heightCm || ""}
                    onChange={(e) => handleUpdateItem(index, "heightCm", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-stone-500">Weight/U (kg)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded border border-stone-800 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 transition-colors focus:border-emerald-500/50 focus:outline-none"
                    value={item.weightKg || ""}
                    onChange={(e) => handleUpdateItem(index, "weightKg", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-stone-500">Qty</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded border border-stone-800 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 transition-colors focus:border-emerald-500/50 focus:outline-none"
                    value={item.quantity || ""}
                    onChange={(e) => handleUpdateItem(index, "quantity", parseInt(e.target.value, 10) || 1)}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mb-0.5 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                onClick={() => handleRemoveItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-stone-800/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="border-emerald-500/20 text-emerald-500 transition-colors hover:bg-emerald-500/10"
          >
            <Plus className="me-2 h-4 w-4" />
            {isAr ? "إضافة عنصر للإنتاج" : "Add Production Item"}
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={items.length === 0 || isSubmitting || !shipmentId.trim()}
            onClick={handleSubmit}
            className="bg-emerald-600 font-mono text-xs uppercase tracking-wider text-white hover:bg-emerald-500"
          >
            {isSubmitting ? (
              <Activity className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            {isAr ? "تحضير القياسات اللوجستية" : "Prepare Volumetrics"}
          </Button>
        </div>
      </div>
    </div>
  );
};

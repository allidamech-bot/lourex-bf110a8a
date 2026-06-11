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

export const SupplierPackingListForm = ({ shipmentId, onSync }: SupplierPackingListFormProps) => {
  const { lang } = useI18n();
  const { profile } = useAuthSession();
  
  const [items, setItems] = useState<PackingListItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Security enforcement
  if (profile?.role !== "supplier") {
    return (
      <div className="p-6 bg-red-950/20 border border-red-900/50 rounded-xl">
        <p className="text-red-500 font-mono text-sm">
          UNAUTHORIZED ACCESS: This endpoint is restricted to authenticated Suppliers only.
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

  // Derive sync metrics
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

  const isAr = lang === "ar";

  return (
    <div className="bg-stone-950 border border-emerald-900/30 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-emerald-900/20 bg-black/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Box className="w-5 h-5 text-emerald-500" />
          <h3 className="font-mono text-sm font-semibold text-emerald-400 tracking-wider">
            {isAr ? "بوابة قوائم التعبئة للمصانع" : "SUPPLIER PACKING LIST INGRESS"}
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-stone-500 uppercase tracking-wider">Total Volume</p>
            <p className="text-sm font-mono text-emerald-400">{totalCBM.toFixed(2)} CBM</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-stone-500 uppercase tracking-wider">Gross Weight</p>
            <p className="text-sm font-mono text-amber-400">{totalWeight.toFixed(2)} KG</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-3 items-end bg-black/40 p-3 rounded-lg border border-stone-800/50 hover:border-emerald-900/50 transition-colors">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 flex-1 w-full">
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] text-stone-500 uppercase tracking-wider mb-1 block">Item</label>
                  <input
                    type="text"
                    className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-1.5 text-sm text-stone-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="Product Name"
                    value={item.itemName}
                    onChange={(e) => handleUpdateItem(index, "itemName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500 uppercase tracking-wider mb-1 block">L (cm)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-1.5 text-sm text-stone-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    value={item.lengthCm || ""}
                    onChange={(e) => handleUpdateItem(index, "lengthCm", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500 uppercase tracking-wider mb-1 block">W (cm)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-1.5 text-sm text-stone-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    value={item.widthCm || ""}
                    onChange={(e) => handleUpdateItem(index, "widthCm", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500 uppercase tracking-wider mb-1 block">H (cm)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-1.5 text-sm text-stone-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    value={item.heightCm || ""}
                    onChange={(e) => handleUpdateItem(index, "heightCm", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500 uppercase tracking-wider mb-1 block">Weight/U (kg)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-1.5 text-sm text-stone-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    value={item.weightKg || ""}
                    onChange={(e) => handleUpdateItem(index, "weightKg", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500 uppercase tracking-wider mb-1 block">Qty</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-1.5 text-sm text-stone-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    value={item.quantity || ""}
                    onChange={(e) => handleUpdateItem(index, "quantity", parseInt(e.target.value, 10) || 1)}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:bg-red-500/10 hover:text-red-400 mb-0.5"
                onClick={() => handleRemoveItem(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-stone-800/50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
          >
            <Plus className="w-4 h-4 me-2" />
            {isAr ? "إضافة عنصر للإنتاج" : "Add Production Item"}
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={items.length === 0 || isSubmitting}
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono uppercase tracking-wider text-xs"
          >
            {isSubmitting ? (
              <Activity className="w-4 h-4 me-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 me-2" />
            )}
            {isAr ? "تزامن البيانات اللوجستية" : "Synchronize Volumetrics"}
          </Button>
        </div>
      </div>
    </div>
  );
};

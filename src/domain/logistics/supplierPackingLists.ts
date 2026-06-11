import { supabase } from "@/integrations/supabase/client";
import { createDomainError, normalizeText, success } from "@/domain/shared/utils";
import type { DomainResult } from "@/domain/operations/types";
import type { PackingListItem } from "@/types/lourex";
import { logOperationalError } from "@/lib/monitoring";

export interface SubmitSupplierPackingListInput {
  shipmentReference: string;
  items: PackingListItem[];
  totalCbm: number;
  totalWeightKg: number;
}

const normalizePackingItems = (items: PackingListItem[]): PackingListItem[] =>
  items
    .map((item) => ({
      itemName: normalizeText(item.itemName),
      lengthCm: Number.isFinite(Number(item.lengthCm)) ? Math.max(Number(item.lengthCm), 0) : 0,
      widthCm: Number.isFinite(Number(item.widthCm)) ? Math.max(Number(item.widthCm), 0) : 0,
      heightCm: Number.isFinite(Number(item.heightCm)) ? Math.max(Number(item.heightCm), 0) : 0,
      weightKg: Number.isFinite(Number(item.weightKg)) ? Math.max(Number(item.weightKg), 0) : 0,
      quantity: Number.isFinite(Number(item.quantity)) ? Math.max(Math.trunc(Number(item.quantity)), 1) : 1,
    }))
    .filter((item) => item.itemName || item.lengthCm > 0 || item.widthCm > 0 || item.heightCm > 0 || item.weightKg > 0);

export const submitSupplierPackingList = async (
  input: SubmitSupplierPackingListInput,
): Promise<DomainResult<{ id: string }>> => {
  const shipmentReference = normalizeText(input.shipmentReference);
  const items = normalizePackingItems(input.items);

  if (!shipmentReference) {
    return {
      data: null,
      error: createDomainError(new Error("Shipment reference is required."), "Shipment reference is required."),
    };
  }

  if (items.length === 0) {
    return {
      data: null,
      error: createDomainError(new Error("At least one packing item is required."), "At least one packing item is required."),
    };
  }

  try {
    const rpcClient = supabase as unknown as {
      rpc: (
        fn: "submit_supplier_packing_list",
        args: {
          p_shipment_reference: string;
          p_items: PackingListItem[];
          p_total_cbm: number;
          p_total_weight_kg: number;
        },
      ) => Promise<{ data: string | null; error: { message: string } | null }>;
    };

    const { data, error } = await rpcClient.rpc("submit_supplier_packing_list", {
      p_shipment_reference: shipmentReference,
      p_items: items,
      p_total_cbm: Number.isFinite(input.totalCbm) ? Math.max(input.totalCbm, 0) : 0,
      p_total_weight_kg: Number.isFinite(input.totalWeightKg) ? Math.max(input.totalWeightKg, 0) : 0,
    });

    if (error || !data) {
      throw error || new Error("Supplier packing list submission returned no id.");
    }

    return success({ id: data });
  } catch (error) {
    logOperationalError("supplier_packing_list_submit", error, {
      shipmentReference,
      items: items.length,
    });

    return {
      data: null,
      error: createDomainError(error, "Unable to submit the supplier packing list."),
    };
  }
};

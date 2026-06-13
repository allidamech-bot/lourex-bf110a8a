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

export interface SupplierPackingListSummary {
  id: string;
  shipmentReference: string;
  submittedByRole: string;
  totalCbm: number;
  totalWeightKg: number;
  status: string;
  createdAt: string;
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

export const loadRecentSupplierPackingLists = async (
  limit = 8,
): Promise<DomainResult<SupplierPackingListSummary[]>> => {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.trunc(limit), 25) : 8;

  try {
    const { data, error } = await (supabase as any)
      .from("supplier_packing_lists")
      .select("id, shipment_reference, submitted_by_role, total_cbm, total_weight_kg, status, created_at")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      throw error;
    }

    const rows = (data ?? []).map((row: any) => ({
      id: String(row.id),
      shipmentReference: normalizeText(row.shipment_reference),
      submittedByRole: normalizeText(row.submitted_by_role),
      totalCbm: Number(row.total_cbm || 0),
      totalWeightKg: Number(row.total_weight_kg || 0),
      status: normalizeText(row.status) || "submitted",
      createdAt: normalizeText(row.created_at),
    }));

    return success(rows);
  } catch (error) {
    logOperationalError("supplier_packing_list_history_load", error);

    return {
      data: null,
      error: createDomainError(error, "Unable to load supplier packing lists."),
    };
  }
};

export const loadSupplierPackingListForDeal = async (
  dealId: string,
): Promise<DomainResult<SupplierPackingListSummary | null>> => {
  if (!dealId) {
    return success(null);
  }

  try {
    const { data, error } = await (supabase as any)
      .from("supplier_packing_lists")
      .select("id, shipment_reference, submitted_by_role, total_cbm, total_weight_kg, status, created_at")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return success(null);
    }

    return success({
      id: String(data.id),
      shipmentReference: normalizeText(data.shipment_reference),
      submittedByRole: normalizeText(data.submitted_by_role),
      totalCbm: Number(data.total_cbm || 0),
      totalWeightKg: Number(data.total_weight_kg || 0),
      status: normalizeText(data.status) || "submitted",
      createdAt: normalizeText(data.created_at),
    });
  } catch (error) {
    logOperationalError("supplier_packing_list_for_deal_load", error, { dealId });

    return {
      data: null,
      error: createDomainError(error, "Unable to load supplier packing list for deal."),
    };
  }
};

export const loadSupplierPackingListForShipment = async (
  shipmentId: string,
): Promise<DomainResult<SupplierPackingListSummary | null>> => {
  if (!shipmentId) {
    return success(null);
  }

  try {
    const { data, error } = await (supabase as any)
      .from("supplier_packing_lists")
      .select("id, shipment_reference, submitted_by_role, total_cbm, total_weight_kg, status, created_at")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return success(null);
    }

    return success({
      id: String(data.id),
      shipmentReference: normalizeText(data.shipment_reference),
      submittedByRole: normalizeText(data.submitted_by_role),
      totalCbm: Number(data.total_cbm || 0),
      totalWeightKg: Number(data.total_weight_kg || 0),
      status: normalizeText(data.status) || "submitted",
      createdAt: normalizeText(data.created_at),
    });
  } catch (error) {
    logOperationalError("supplier_packing_list_for_shipment_load", error, { shipmentId });

    return {
      data: null,
      error: createDomainError(error, "Unable to load supplier packing list for shipment."),
    };
  }
};

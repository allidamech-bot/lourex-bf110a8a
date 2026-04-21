import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { DomainResult } from "@/domain/operations/types";
import {
  createDomainError,
  normalizeText,
  success,
} from "@/domain/shared/utils";

type ShipmentRow = Pick<Tables<"shipments">, "status" | "created_at">;
type OrderRow = Pick<Tables<"orders">, "status" | "created_at">;
type StaffRow = Pick<Tables<"organization_staff">, "id" | "status">;

export type AdminAnalyticsDatum = {
  name: string;
  value: number;
};

export type AdminAnalyticsMonthlyPoint = {
  month: string;
  shipments: number;
  orders: number;
};

export type AdminAnalyticsData = {
  totalShipments: number;
  pendingOrders: number;
  activeStaff: number;
  totalFactories: number;
  statusBreakdown: AdminAnalyticsDatum[];
  monthlyGrowth: AdminAnalyticsMonthlyPoint[];
};

const normalizeStatusBreakdown = (shipments: ShipmentRow[]) => {
  const statusMap = shipments.reduce<Record<string, number>>((accumulator, shipment) => {
    const key = normalizeText(shipment.status) || "unknown";
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(statusMap)
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);
};

const buildMonthlyGrowth = (shipments: ShipmentRow[], orders: OrderRow[]): AdminAnalyticsMonthlyPoint[] => {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const end = new Date(now.getFullYear(), now.getMonth() - (4 - index), 1);

    return {
      month: start.toLocaleString("default", { month: "short" }),
      shipments: shipments.filter((shipment) => {
        const createdAt = new Date(shipment.created_at);
        return createdAt >= start && createdAt < end;
      }).length,
      orders: orders.filter((order) => {
        const createdAt = new Date(order.created_at);
        return createdAt >= start && createdAt < end;
      }).length,
    };
  });
};

export const fetchAdminAnalytics = async (): Promise<DomainResult<AdminAnalyticsData>> => {
  try {
    const [shipmentsRes, ordersRes, staffRes, factoriesRes] = await Promise.all([
      supabase.from("shipments").select("status, created_at"),
      supabase.from("orders").select("status, created_at"),
      supabase.from("organization_staff").select("id, status"),
      supabase.from("factories").select("id", { count: "exact", head: true }),
    ]);

    if (shipmentsRes.error || ordersRes.error || staffRes.error || factoriesRes.error) {
      throw shipmentsRes.error ?? ordersRes.error ?? staffRes.error ?? factoriesRes.error;
    }

    const shipments = (shipmentsRes.data ?? []) as ShipmentRow[];
    const orders = (ordersRes.data ?? []) as OrderRow[];
    const staff = (staffRes.data ?? []) as StaffRow[];

    return success({
      totalShipments: shipments.length,
      pendingOrders: orders.filter((order) => normalizeText(order.status) === "pending").length,
      activeStaff: staff.filter((member) => normalizeText(member.status) === "active").length,
      totalFactories: factoriesRes.count ?? 0,
      statusBreakdown: normalizeStatusBreakdown(shipments),
      monthlyGrowth: buildMonthlyGrowth(shipments, orders),
    });
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to load admin analytics."),
    };
  }
};

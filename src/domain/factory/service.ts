import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { DomainResult } from "@/domain/operations/types";
import {
  createDomainError,
  failure,
  normalizeBoolean,
  normalizeNumber,
  normalizeOptionalText,
  normalizeText,
  success,
} from "@/domain/shared/utils";

type FactoryRow = Tables<"factories">;
type OrderRow = Tables<"orders">;
type ProductRow = Tables<"products">;
type StaffRow = { id: string; email: string; full_name: string; role: string; status: string; created_at: string };
type UserRoleRow = Pick<Tables<"user_roles">, "role">;

const ADVANCEABLE_STATUSES = ["confirmed", "in_production", "quality_check", "shipped", "delivered"] as const;

export type FactoryCommandCenterFactory = {
  id: string;
  name: string;
  ownerUserId: string | null;
};

export type FactoryCommandCenterOrder = {
  id: string;
  orderNumber: string;
  quantity: number;
  weightKg: number;
  status: string;
  createdAt: string;
};

export type FactoryCommandCenterProduct = {
  id: string;
  name: string;
  category: string;
  pricePerUnit: number | null;
  imageUrl: string | null;
  isActive: boolean;
};

export type FactoryAnalyticsPoint = {
  month: string;
  orders: number;
  ready: number;
};

export type FactoryStatusDatum = {
  name: string;
  value: number;
};

export type FactoryCommandCenterData = {
  profileName: string;
  factory: FactoryCommandCenterFactory | null;
  products: FactoryCommandCenterProduct[];
  orders: FactoryCommandCenterOrder[];
  staffCount: number;
  isVerified: boolean;
  analytics: {
    monthlyActivity: FactoryAnalyticsPoint[];
    statusBreakdown: FactoryStatusDatum[];
    readyShipments: number;
  };
};

export type StaffMember = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  createdAt: string;
};

const normalizeFactory = (factory: FactoryRow): FactoryCommandCenterFactory => ({
  id: factory.id,
  name: normalizeText(factory.name),
  ownerUserId: factory.owner_user_id,
});

const normalizeOrder = (order: OrderRow): FactoryCommandCenterOrder => ({
  id: order.id,
  orderNumber: normalizeText(order.order_number),
  quantity: normalizeNumber(order.quantity),
  weightKg: normalizeNumber(order.weight_kg),
  status: normalizeText(order.status) || "pending",
  createdAt: order.created_at,
});

const normalizeProduct = (product: ProductRow): FactoryCommandCenterProduct => ({
  id: product.id,
  name: normalizeText(product.name),
  category: normalizeText(product.category),
  pricePerUnit: product.price_per_unit,
  imageUrl: normalizeOptionalText(product.image_url),
  isActive: normalizeBoolean(product.is_active),
});

const normalizeStaffMember = (member: StaffRow): StaffMember => ({
  id: String(member.id),
  email: normalizeText(member.email).toLowerCase(),
  fullName: normalizeText(member.full_name),
  role: normalizeText(member.role),
  status: normalizeText(member.status),
  createdAt: String(member.created_at),
});

const buildAnalytics = (orders: FactoryCommandCenterOrder[]) => {
  const readyShipments = orders.filter((order) => ["quality_check", "shipped", "delivered"].includes(order.status)).length;
  const statusBreakdown = Object.entries(
    orders.reduce<Record<string, number>>((accumulator, order) => {
      accumulator[order.status] = (accumulator[order.status] ?? 0) + 1;
      return accumulator;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const now = new Date();
  const monthlyActivity = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const end = new Date(now.getFullYear(), now.getMonth() - (4 - index), 1);
    const periodOrders = orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= start && createdAt < end;
    });

    return {
      month: start.toLocaleString("default", { month: "short" }),
      orders: periodOrders.length,
      ready: periodOrders.filter((order) => ["quality_check", "shipped", "delivered"].includes(order.status)).length,
    };
  });

  return {
    monthlyActivity,
    statusBreakdown,
    readyShipments,
  };
};

const findOwnedOrAssignedFactory = async (userId: string, email: string | null) => {
  const { data: ownedFactory, error: ownedError } = await supabase
    .from("factories")
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (ownedError) {
    throw ownedError;
  }

  if (ownedFactory) {
    return ownedFactory;
  }

  const normalizedEmail = normalizeOptionalText(email);
  if (!normalizedEmail) {
    return null;
  }

  const { data: staffRow, error: staffError } = await supabase
    .from("organization_staff")
    .select("owner_id")
    .eq("email", normalizedEmail)
    .eq("status", "active")
    .maybeSingle();

  if (staffError) {
    throw staffError;
  }

  if (!staffRow?.owner_id) {
    return null;
  }

  const { data: teamFactory, error: teamFactoryError } = await supabase
    .from("factories")
    .select("*")
    .eq("owner_user_id", staffRow.owner_id)
    .maybeSingle();

  if (teamFactoryError) {
    throw teamFactoryError;
  }

  return teamFactory;
};

export const fetchFactoryCommandCenter = async (
  userId: string,
  email: string | null,
): Promise<DomainResult<FactoryCommandCenterData>> => {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) {
    return failure("A valid user id is required.");
  }

  try {
    const [profileRes, roleRes, factory] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("profiles").select("*").eq("id", normalizedUserId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", normalizedUserId),
      findOwnedOrAssignedFactory(normalizedUserId, email),
    ]);

    if (profileRes.error || roleRes.error) {
      throw profileRes.error ?? roleRes.error;
    }

    const roles = (roleRes.data ?? []) as Pick<UserRoleRow, "role">[];
    const verificationStatus = normalizeText(profileRes.data?.verification_status);
    const isVerified =
      roles.some((row) => normalizeText(row.role) === "owner") ||
      verificationStatus === "verified" ||
      verificationStatus === "approved";

    if (!factory) {
      return success({
        profileName: normalizeText(profileRes.data?.full_name),
        factory: null,
        products: [],
        orders: [],
        staffCount: 0,
        isVerified,
        analytics: {
          monthlyActivity: [],
          statusBreakdown: [],
          readyShipments: 0,
        },
      });
    }

    const [{ data: orders, error: ordersError }, { data: products, error: productsError }, staffCountRes] =
      await Promise.all([
        supabase.from("orders").select("*").eq("factory_id", factory.id).order("created_at", { ascending: false }),
        supabase.from("products").select("*").eq("factory_id", factory.id).order("created_at", { ascending: false }),
        supabase
          .from("organization_staff")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", factory.owner_user_id ?? "")
          .eq("status", "active"),
      ]);

    if (ordersError || productsError || staffCountRes.error) {
      throw ordersError ?? productsError ?? staffCountRes.error;
    }

    const normalizedOrders = (orders ?? []).map(normalizeOrder);
    const normalizedProducts = (products ?? []).map(normalizeProduct);

    return success({
      profileName: normalizeText(profileRes.data?.full_name),
      factory: normalizeFactory(factory),
      products: normalizedProducts,
      orders: normalizedOrders,
      staffCount: staffCountRes.count ?? 0,
      isVerified,
      analytics: buildAnalytics(normalizedOrders),
    });
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to load the factory command center."),
    };
  }
};

export const uploadInspectionMedia = async (
  payload: Omit<TablesInsert<"inspection_media">, "file_url"> & { file: File },
): Promise<DomainResult<string>> => {
  const orderId = normalizeText(payload.order_id);
  const uploadedBy = normalizeText(payload.uploaded_by);
  if (!orderId || !uploadedBy) {
    return failure("A valid order and uploader are required.");
  }

  if (!payload.file.type.startsWith("image/") && !payload.file.type.startsWith("video/")) {
    return failure("Only image or video inspection files are supported.");
  }

  try {
    const safeFileName = payload.file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${orderId}/${Date.now()}_${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("inspection-media")
      .upload(filePath, payload.file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: urlData } = supabase.storage.from("inspection-media").getPublicUrl(filePath);

    const { error } = await supabase.from("inspection_media").insert({
      order_id: orderId,
      uploaded_by: uploadedBy,
      file_url: urlData.publicUrl,
      file_name: normalizeText(payload.file_name || payload.file.name),
      media_type: normalizeText(payload.media_type),
      caption: normalizeOptionalText(payload.caption ?? null),
    });

    if (error) {
      throw error;
    }

    return success(urlData.publicUrl);
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to upload the inspection media."),
    };
  }
};

export const advanceFactoryOrderStatus = async (
  orderId: string,
  status: string,
): Promise<DomainResult<null>> => {
  const normalizedOrderId = normalizeText(orderId);
  const normalizedStatus = normalizeText(status);

  if (!normalizedOrderId) {
    return failure("A valid order id is required.");
  }

  if (!ADVANCEABLE_STATUSES.includes(normalizedStatus as (typeof ADVANCEABLE_STATUSES)[number])) {
    return failure("The requested order status transition is invalid.");
  }

  try {
    const { error } = await supabase.rpc("update_order_status", {
      p_order_id: normalizedOrderId,
      p_status: normalizedStatus,
      p_message: "",
    });

    if (error) {
      throw error;
    }

    return success(null);
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to update the order status."),
    };
  }
};

import { LourexRole, INTERNAL_ROLES } from "@/features/auth/rbac";

export const fetchOrganizationStaff = async (): Promise<DomainResult<StaffMember[]>> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("id, email, full_name, role, status, created_at")
      .in("role", INTERNAL_ROLES)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return success((data ?? []).map((row: any) => normalizeStaffMember(row)));
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to load the team members."),
    };
  }
};

export const addOrganizationStaff = async (
  payload: { email: string; full_name: string; role: LourexRole },
): Promise<DomainResult<null>> => {
  const email = normalizeText(payload.email).toLowerCase();
  const fullName = normalizeOptionalText(payload.full_name ?? null);
  const role = normalizeText(payload.role);

  if (!email || !role) {
    return failure("Email and role are required.");
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("profiles").upsert({
      email,
      full_name: fullName,
      role: role as never,
      status: "active",
    }, { onConflict: "email" });

    if (error) {
      throw error;
    }

    return success(null);
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to add the team member."),
    };
  }
};

export const removeOrganizationStaff = async (id: string): Promise<DomainResult<null>> => {
  const normalizedId = normalizeText(id);
  if (!normalizedId) {
    return failure("A valid team member id is required.");
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("profiles").update({ role: "customer" }).eq("id", normalizedId);

    if (error) {
      throw error;
    }

    return success(null);
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to remove the team member."),
    };
  }
};

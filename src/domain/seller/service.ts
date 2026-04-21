import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
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

type UserRole = Pick<Tables<"user_roles">, "role">;
type SellerProfileRow = Tables<"profiles">;
type SellerFactoryRow = Tables<"factories">;
type SellerProductRow = Tables<"products">;

const SELLER_STATUSES = ["approved", "pending", "draft", "rejected"] as const;

export type SellerProfile = {
  id: string;
  fullName: string;
  verificationStatus: string;
};

export type SellerFactory = {
  id: string;
  name: string;
  ownerUserId: string | null;
};

export type SellerProductStatus = (typeof SELLER_STATUSES)[number];

export type SellerProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  moq: string;
  pricePerUnit: number | null;
  currency: string;
  stockCapacity: string;
  leadTime: string;
  shippingOrigin: string;
  dimensions: string;
  weightPerUnit: number | null;
  unitsPerCarton: number | null;
  imageUrl: string | null;
  isActive: boolean;
  status: SellerProductStatus;
  createdAt: string;
};

export type SellerDashboardData = {
  profile: SellerProfile | null;
  factory: SellerFactory | null;
  products: SellerProduct[];
  isVerified: boolean;
};

export type SellerProductInput = {
  id?: string;
  userId: string;
  factoryId: string;
  name: string;
  category: string;
  description: string;
  moq: string;
  pricePerUnit: number | null;
  currency: string;
  stockCapacity: string;
  leadTime: string;
  shippingOrigin: string;
  dimensions: string;
  weightPerUnit: number | null;
  unitsPerCarton: number | null;
  imageUrl?: string | null;
};

const normalizeProductStatus = (status: string | null | undefined): SellerProductStatus => {
  const normalized = normalizeText(status);
  return SELLER_STATUSES.includes(normalized as SellerProductStatus)
    ? (normalized as SellerProductStatus)
    : "approved";
};

const normalizeProduct = (product: SellerProductRow): SellerProduct => ({
  id: product.id,
  name: normalizeText(product.name),
  category: normalizeText(product.category),
  description: normalizeText(product.description),
  moq: normalizeText(product.moq),
  pricePerUnit: product.price_per_unit,
  currency: normalizeText(product.currency) || "USD",
  stockCapacity: normalizeText(product.stock_capacity),
  leadTime: normalizeText(product.lead_time),
  shippingOrigin: normalizeText(product.shipping_origin),
  dimensions: normalizeText(product.dimensions),
  weightPerUnit: product.weight_per_unit,
  unitsPerCarton: product.units_per_carton,
  imageUrl: normalizeOptionalText(product.image_url),
  isActive: normalizeBoolean(product.is_active),
  status: normalizeProductStatus(product.status),
  createdAt: product.created_at,
});

const normalizeProfile = (profile: SellerProfileRow | null): SellerProfile | null =>
  profile
    ? {
        id: profile.id,
        fullName: normalizeText(profile.full_name),
        verificationStatus: normalizeText(profile.verification_status),
      }
    : null;

const normalizeFactory = (factory: SellerFactoryRow | null): SellerFactory | null =>
  factory
    ? {
        id: factory.id,
        name: normalizeText(factory.name),
        ownerUserId: factory.owner_user_id,
      }
    : null;

const normalizeProductInput = (input: SellerProductInput): DomainResult<SellerProductInput> => {
  const normalized: SellerProductInput = {
    ...input,
    id: normalizeOptionalText(input.id),
    userId: normalizeText(input.userId),
    factoryId: normalizeText(input.factoryId),
    name: normalizeText(input.name),
    category: normalizeText(input.category),
    description: normalizeText(input.description),
    moq: normalizeText(input.moq),
    pricePerUnit: input.pricePerUnit !== null ? normalizeNumber(input.pricePerUnit, NaN) : null,
    currency: normalizeText(input.currency) || "USD",
    stockCapacity: normalizeText(input.stockCapacity),
    leadTime: normalizeText(input.leadTime),
    shippingOrigin: normalizeText(input.shippingOrigin),
    dimensions: normalizeText(input.dimensions),
    weightPerUnit: input.weightPerUnit !== null ? normalizeNumber(input.weightPerUnit, NaN) : null,
    unitsPerCarton: input.unitsPerCarton !== null ? normalizeNumber(input.unitsPerCarton, NaN) : null,
    imageUrl: normalizeOptionalText(input.imageUrl ?? null),
  };

  if (!normalized.userId || !normalized.factoryId) {
    return failure("A valid seller and factory are required.");
  }

  if (!normalized.name || !normalized.category) {
    return failure("Product name and category are required.");
  }

  if (normalized.pricePerUnit !== null && (!Number.isFinite(normalized.pricePerUnit) || normalized.pricePerUnit < 0)) {
    return failure("The product unit price must be a valid positive number.");
  }

  if (normalized.weightPerUnit !== null && (!Number.isFinite(normalized.weightPerUnit) || normalized.weightPerUnit < 0)) {
    return failure("The product weight must be a valid positive number.");
  }

  if (normalized.unitsPerCarton !== null && (!Number.isFinite(normalized.unitsPerCarton) || normalized.unitsPerCarton < 0)) {
    return failure("Units per carton must be a valid positive number.");
  }

  return success(normalized);
};

const toProductInsert = (input: SellerProductInput): TablesInsert<"products"> => ({
  factory_id: input.factoryId,
  seller_id: input.userId,
  name: input.name,
  category: input.category,
  description: normalizeOptionalText(input.description),
  moq: normalizeOptionalText(input.moq),
  price_per_unit: input.pricePerUnit,
  currency: input.currency,
  stock_capacity: normalizeOptionalText(input.stockCapacity),
  lead_time: normalizeOptionalText(input.leadTime),
  shipping_origin: normalizeOptionalText(input.shippingOrigin),
  dimensions: normalizeOptionalText(input.dimensions),
  weight_per_unit: input.weightPerUnit,
  units_per_carton: input.unitsPerCarton,
  image_url: input.imageUrl ?? null,
  is_active: true,
});

const toProductUpdate = (input: SellerProductInput): TablesUpdate<"products"> => ({
  name: input.name,
  category: input.category,
  description: normalizeOptionalText(input.description),
  moq: normalizeOptionalText(input.moq),
  price_per_unit: input.pricePerUnit,
  currency: input.currency,
  stock_capacity: normalizeOptionalText(input.stockCapacity),
  lead_time: normalizeOptionalText(input.leadTime),
  shipping_origin: normalizeOptionalText(input.shippingOrigin),
  dimensions: normalizeOptionalText(input.dimensions),
  weight_per_unit: input.weightPerUnit,
  units_per_carton: input.unitsPerCarton,
  ...(input.imageUrl ? { image_url: input.imageUrl } : {}),
});

export const uploadSellerProductImage = async (
  userId: string,
  file: File,
): Promise<DomainResult<string>> => {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) {
    return failure("A valid user is required.");
  }

  if (!file.type.startsWith("image/")) {
    return failure("Only image files are supported for products.");
  }

  try {
    const filePath = `${normalizedUserId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return success(data.publicUrl);
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to upload the product image."),
    };
  }
};

export const fetchSellerDashboard = async (userId: string): Promise<DomainResult<SellerDashboardData>> => {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) {
    return failure("A valid user id is required.");
  }

  try {
    const [profileRes, factoryRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", normalizedUserId).maybeSingle(),
      supabase.from("factories").select("*").eq("owner_user_id", normalizedUserId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", normalizedUserId),
    ]);

    if (profileRes.error || factoryRes.error || rolesRes.error) {
      throw profileRes.error ?? factoryRes.error ?? rolesRes.error;
    }

    const roles = (rolesRes.data ?? []) as UserRole[];
    const verificationStatus = normalizeText(profileRes.data?.verification_status);
    const isVerified =
      roles.some((role) => normalizeText(role.role) === "admin") ||
      verificationStatus === "verified" ||
      verificationStatus === "approved";

    let products: SellerProduct[] = [];

    if (factoryRes.data) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("factory_id", factoryRes.data.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      products = (data ?? []).map(normalizeProduct);
    }

    return success({
      profile: normalizeProfile(profileRes.data),
      factory: normalizeFactory(factoryRes.data),
      products,
      isVerified,
    });
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to load the seller dashboard."),
    };
  }
};

export const saveSellerProduct = async (
  input: SellerProductInput,
): Promise<DomainResult<SellerProduct>> => {
  const normalized = normalizeProductInput(input);
  if (normalized.error || !normalized.data) {
    return { data: null, error: normalized.error };
  }

  try {
    if (normalized.data.id) {
      const { data, error } = await supabase
        .from("products")
        .update(toProductUpdate(normalized.data))
        .eq("id", normalized.data.id)
        .select("*")
        .single();

      if (error || !data) {
        throw error;
      }

      return success(normalizeProduct(data));
    }

    const { data, error } = await supabase
      .from("products")
      .insert(toProductInsert(normalized.data))
      .select("*")
      .single();

    if (error || !data) {
      throw error;
    }

    return success(normalizeProduct(data));
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to save the product."),
    };
  }
};

export const deleteSellerProduct = async (id: string): Promise<DomainResult<string>> => {
  const normalizedId = normalizeText(id);
  if (!normalizedId) {
    return failure("A valid product id is required.");
  }

  try {
    const { error } = await supabase.from("products").delete().eq("id", normalizedId);

    if (error) {
      throw error;
    }

    return success(normalizedId);
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to delete the product."),
    };
  }
};

export const toggleSellerProductActive = async (
  id: string,
  current: boolean,
): Promise<DomainResult<SellerProduct>> => {
  const normalizedId = normalizeText(id);
  if (!normalizedId) {
    return failure("A valid product id is required.");
  }

  try {
    const nextValue = !current;
    const { data, error } = await supabase
      .from("products")
      .update({ is_active: nextValue })
      .eq("id", normalizedId)
      .select("*")
      .single();

    if (error || !data) {
      throw error;
    }

    return success(normalizeProduct(data));
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to update the product visibility."),
    };
  }
};

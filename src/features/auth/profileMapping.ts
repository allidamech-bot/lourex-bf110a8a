import type { User } from "@supabase/supabase-js";
import {
  type LourexProfile,
  type LourexRole,
  type LourexAccountStatus,
  type LourexPartnerType,
  isValidRole,
  getPartnerTypeForRole,
} from "@/features/auth/rbac";

const safeString = (value: unknown, fallback = "") => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return fallback;
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

export const mapProfileRow = (rawRow: unknown, user: User): LourexProfile | null => {
  const row = toRecord(rawRow);
  const createdAt = safeString(row.created_at, new Date().toISOString());

  const rawRole = safeString(row.role) || safeString(row.role_name);
  if (!isValidRole(rawRole)) {
    return null;
  }
  const role: LourexRole = rawRole;

  // An invalid/missing account status must never become active by default.
  const rawStatus = safeString(row.status);
  if (rawStatus !== "active" && rawStatus !== "inactive" && rawStatus !== "pending") {
    return null;
  }
  const status: LourexAccountStatus = rawStatus;

  const profileId = safeString(row.id);
  if (!profileId || profileId !== user.id) return null;

  const rawPartnerType = safeString(row.partner_type) || safeString(row.partnerType);
  const canonicalPartnerType = rawPartnerType === "turkey" ? "turkish" : rawPartnerType;
  const enforcedPartnerType = getPartnerTypeForRole(role);
  const partnerType: LourexPartnerType = enforcedPartnerType ||
    (canonicalPartnerType === "turkish" || canonicalPartnerType === "saudi"
      ? canonicalPartnerType
      : null);

  return {
    id: profileId,
    email: user.email || "",
    fullName:
      safeString(row.full_name) ||
      safeString(row.fullName) ||
      safeString(row.name) ||
      safeString(user.user_metadata?.full_name) ||
      safeString(user.user_metadata?.name) ||
      safeString(user.email?.split("@")[0]),
    role,
    partnerType,
    status,
    phone: safeString(row.phone) || undefined,
    country: safeString(row.country) || undefined,
    city: safeString(row.city) || undefined,
    createdAt,
    updatedAt: safeString(row.updated_at, createdAt),
  };
};


import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { DomainResult } from "@/domain/operations/types";
import {
  createDomainError,
  failure,
  normalizeOptionalText,
  normalizeText,
  success,
  uniqueStrings,
} from "@/domain/shared/utils";

export const CONSENT_VERSION = "1.0";

export type LegalConsentRow = Tables<"legal_consents">;
type ConsentInsert = Pick<
  TablesInsert<"legal_consents">,
  "user_id" | "consent_type" | "ip_address" | "device_info"
> & {
  version?: string;
};

const ALLOWED_CONSENT_TYPES = ["terms_of_service", "privacy_policy"] as const;

const normalizeConsentPayload = (
  payload: ConsentInsert[],
): DomainResult<TablesInsert<"legal_consents">[]> => {
  if (payload.length === 0) {
    return failure("At least one consent record is required.");
  }

  const normalized = payload.map((item) => ({
    user_id: normalizeText(item.user_id),
    consent_type: normalizeText(item.consent_type),
    ip_address: normalizeOptionalText(item.ip_address ?? null),
    device_info: normalizeOptionalText(item.device_info ?? null),
    version: normalizeText(item.version ?? CONSENT_VERSION) || CONSENT_VERSION,
  }));

  if (normalized.some((item) => item.user_id.length === 0)) {
    return failure("A valid user id is required for each consent record.");
  }

  if (
    normalized.some(
      (item) => !ALLOWED_CONSENT_TYPES.includes(item.consent_type as (typeof ALLOWED_CONSENT_TYPES)[number]),
    )
  ) {
    return failure("One or more consent types are invalid.");
  }

  const uniqueConsentTypes = uniqueStrings(normalized.map((item) => item.consent_type));
  if (uniqueConsentTypes.length !== normalized.length) {
    return failure("Duplicate consent types are not allowed in a single request.");
  }

  return success(normalized);
};

export const getConsentState = async (userId: string): Promise<DomainResult<boolean>> => {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) {
    return failure("A valid user id is required.");
  }

  try {
    const { data, error } = await supabase
      .from("legal_consents")
      .select("id")
      .eq("user_id", normalizedUserId)
      .eq("consent_type", "terms_of_service")
      .eq("version", CONSENT_VERSION)
      .maybeSingle();

    if (error) {
      return { data: null, error: createDomainError(error, "Unable to load the consent state.") };
    }

    return success(Boolean(data));
  } catch (error) {
    return { data: null, error: createDomainError(error, "Unable to load the consent state.") };
  }
};

export const saveConsents = async (
  payload: ConsentInsert[],
): Promise<DomainResult<LegalConsentRow[]>> => {
  const normalized = normalizeConsentPayload(payload);
  if (normalized.error || !normalized.data) {
    return { data: null, error: normalized.error };
  }

  try {
    const { data, error } = await supabase.from("legal_consents").insert(normalized.data).select("*");

    if (error || !data) {
      return { data: null, error: createDomainError(error, "Unable to save consent records.") };
    }

    return success(data);
  } catch (error) {
    return { data: null, error: createDomainError(error, "Unable to save consent records.") };
  }
};

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { DomainResult } from "@/domain/operations/types";
import {
  createDomainError,
  failure,
  isValidEmail,
  isValidPhone,
  normalizeOptionalText,
  normalizeText,
  success,
} from "@/domain/shared/utils";

type InquiryInsert = Database["public"]["Tables"]["inquiries"]["Insert"];
type InquiryRow = Database["public"]["Tables"]["inquiries"]["Row"];

type ContactInquiryInput = Pick<InquiryInsert, "name" | "email" | "phone" | "company" | "message">;
type PurchaseRequestInquiryInput = Pick<
  InquiryInsert,
  "name" | "email" | "phone" | "company" | "message" | "factory_name"
>;

const normalizeInquiryPayload = (
  payload: ContactInquiryInput | PurchaseRequestInquiryInput,
): DomainResult<ContactInquiryInput | PurchaseRequestInquiryInput> => {
  const name = normalizeText(payload.name);
  const email = normalizeText(payload.email).toLowerCase();
  const phone = normalizeOptionalText(payload.phone ?? null);
  const company = normalizeOptionalText(payload.company ?? null);
  const message = normalizeText(payload.message);
  const factoryName =
    "factory_name" in payload ? normalizeOptionalText(payload.factory_name ?? null) : null;

  if (name.length < 2) {
    return failure("A valid contact name is required.");
  }

  if (!isValidEmail(email)) {
    return failure("A valid email address is required.");
  }

  if (phone && !isValidPhone(phone)) {
    return failure("The phone number format is invalid.");
  }

  if (message.length < 10) {
    return failure("A clear message is required.");
  }

  return success({
    name,
    email,
    phone,
    company,
    message,
    ...("factory_name" in payload ? { factory_name: factoryName } : {}),
  });
};

const insertInquiry = async (
  payload: InquiryInsert,
  fallbackMessage: string,
): Promise<DomainResult<InquiryRow>> => {
  try {
    const { data, error } = await supabase.from("inquiries").insert(payload).select("*").single();

    if (error || !data) {
      return {
        data: null,
        error: createDomainError(error, fallbackMessage),
      };
    }

    return success(data);
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, fallbackMessage),
    };
  }
};

export const submitContactInquiry = async (
  payload: ContactInquiryInput,
): Promise<DomainResult<InquiryRow>> => {
  const normalized = normalizeInquiryPayload(payload);
  if (normalized.error || !normalized.data) {
    return { data: null, error: normalized.error };
  }

  return insertInquiry(
    {
      ...normalized.data,
      inquiry_type: "contact",
    },
    "Unable to submit the contact inquiry.",
  );
};

export const submitPurchaseRequestInquiry = async (
  payload: PurchaseRequestInquiryInput,
): Promise<DomainResult<InquiryRow>> => {
  const normalized = normalizeInquiryPayload(payload);
  if (normalized.error || !normalized.data) {
    return { data: null, error: normalized.error };
  }

  return insertInquiry(
    {
      ...normalized.data,
      inquiry_type: "purchase_request",
    },
    "Unable to submit the purchase request inquiry.",
  );
};

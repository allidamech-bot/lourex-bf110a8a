import { supabase } from "@/integrations/supabase/client";
import { canManageAccounting, isValidRole } from "@/features/auth/rbac";
import { STORAGE_BUCKETS, getSignedUrl } from "@/lib/storage";
import { logOperationalError } from "@/lib/monitoring";

type TransferProofAccessContext = {
  requestId: string;
  storagePath: string;
  expiresInSeconds?: number;
};

type TransferProofRequestRow = {
  id: string;
  customer_id: string | null;
  email: string | null;
  transfer_proof_url: string | null;
};

type ProfileRow = {
  id: string;
  role: string | null;
  email?: string | null;
};

const normalizeEmail = (value: string | null | undefined) => value?.trim().toLowerCase() || "";

const normalizeStoragePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    const bucketMarker = `/${STORAGE_BUCKETS.TRANSFER_PROOFS}/`;
    const markerIndex = parsed.pathname.indexOf(bucketMarker);
    if (markerIndex >= 0) {
      return decodeURIComponent(parsed.pathname.slice(markerIndex + bucketMarker.length));
    }
  } catch {
    // Stored value is already expected to be a storage path.
  }

  return trimmed.replace(/^\/+/, "");
};

const assertSafeTransferProofPath = (storagePath: string, requestId: string) => {
  const normalized = normalizeStoragePath(storagePath);
  if (!normalized) {
    throw new Error("Transfer proof storage path is required.");
  }

  const expectedPrefix = `customer-portal/requests/${requestId}/transfer-proof/`;
  if (!normalized.startsWith(expectedPrefix)) {
    throw new Error("Transfer proof storage path does not match the request scope.");
  }

  return normalized;
};

export const createTransferProofSignedUrl = async ({
  requestId,
  storagePath,
  expiresInSeconds = 300,
}: TransferProofAccessContext) => {
  const safeRequestId = requestId.trim();
  if (!safeRequestId) {
    throw new Error("A valid request id is required.");
  }

  const safeStoragePath = assertSafeTransferProofPath(storagePath, safeRequestId);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, email")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError || !profile || !isValidRole(profile.role)) {
    throw new Error("A valid LOUREX profile is required before opening transfer proof files.");
  }

  const { data: request, error: requestError } = await supabase
    .from("purchase_requests")
    .select("id, customer_id, email, transfer_proof_url")
    .eq("id", safeRequestId)
    .maybeSingle<TransferProofRequestRow>();

  if (requestError || !request) {
    throw requestError || new Error("Transfer proof request was not found.");
  }

  const userEmail = normalizeEmail(user.email);
  const requestEmail = normalizeEmail(request.email);
  const canReviewProof = canManageAccounting(profile.role);
  const isRequestCustomer = request.customer_id === user.id || (Boolean(userEmail) && userEmail === requestEmail);

  if (!canReviewProof && !isRequestCustomer) {
    throw new Error("You do not have permission to open this transfer proof file.");
  }

  const storedProofPath = normalizeStoragePath(request.transfer_proof_url || "");
  if (storedProofPath && storedProofPath !== safeStoragePath) {
    throw new Error("Transfer proof file does not match the active proof for this request.");
  }

  try {
    return await getSignedUrl("TRANSFER_PROOFS", safeStoragePath, expiresInSeconds);
  } catch (error) {
    logOperationalError("transfer_proof_signed_url", error, {
      requestId: safeRequestId,
      role: profile.role,
    });
    throw error;
  }
};

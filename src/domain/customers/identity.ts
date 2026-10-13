/**
 * The customer record's primary key is not the Supabase authentication user ID.
 * Never infer ownership from a matching customer ID or email address.
 */
export const isCustomerLinkedToUser = (
  customer: { auth_user_id?: string | null } | null | undefined,
  authUserId: string | null | undefined,
): boolean => Boolean(authUserId && customer?.auth_user_id === authUserId);

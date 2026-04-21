import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { DomainResult } from "@/domain/operations/types";
import { createDomainError, success } from "@/domain/shared/utils";

export const getCurrentUser = async (): Promise<DomainResult<User | null>> => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return {
        data: null,
        error: createDomainError(error, "Unable to resolve the current user."),
      };
    }

    return success(user);
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to resolve the current user."),
    };
  }
};

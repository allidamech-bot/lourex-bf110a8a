/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import {
  type LourexProfile,
  type LourexRole,
  type LourexAccountStatus,
  type LourexPartnerType,
  isValidRole,
  getPartnerTypeForRole,
} from "@/features/auth/rbac";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: LourexProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthContextValue | undefined>(undefined);

const safeString = (value: unknown, fallback = "") => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return fallback;
};

const getFallbackName = (user: User) =>
    safeString(user.user_metadata?.full_name) ||
    safeString(user.user_metadata?.name) ||
    safeString(user.email?.split("@")[0]) ||
    "Customer";

const buildFallbackProfile = (user: User): LourexProfile => {
  const now = new Date().toISOString();

  return {
    id: user.id,
    email: user.email || "",
    fullName: getFallbackName(user),
    role: "customer",
    partnerType: null,
    status: "active",
    phone: undefined,
    country: undefined,
    city: undefined,
    createdAt: now,
    updatedAt: now,
  };
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

const mapProfileRow = (rawRow: unknown, user: User): LourexProfile => {
  const row = toRecord(rawRow);
  const fallback = buildFallbackProfile(user);
  const createdAt = safeString(row.created_at, fallback.createdAt);

  const rawRole = safeString(row.role) || safeString(row.role_name);
  const role: LourexRole = isValidRole(rawRole) ? rawRole : "customer";

  const rawStatus = safeString(row.status);
  const status: LourexAccountStatus =
    rawStatus === "active" || rawStatus === "inactive" || rawStatus === "pending"
      ? rawStatus
      : "active";

  const rawPartnerType = safeString(row.partner_type) || safeString(row.partnerType);
  const partnerType: LourexPartnerType =
    rawPartnerType === "turkish" || rawPartnerType === "saudi"
      ? rawPartnerType
      : getPartnerTypeForRole(role);

  return {
    id: safeString(row.id, user.id),
    email: user.email || "",
    fullName:
      safeString(row.full_name) ||
      safeString(row.fullName) ||
      safeString(row.name) ||
      fallback.fullName,
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

export const AuthSessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<LourexProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSessionState = useCallback(async (nextSession: Session | null) => {
    setLoading(true);
    setSession(nextSession);

    if (!nextSession?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const user = nextSession.user;

    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
      console.warn("Profile fetch error:", error);
      setProfile(buildFallbackProfile(user));
      setLoading(false);
      return;
    }

    if (data) {
      setProfile(mapProfileRow(data, user));
      setLoading(false);
      return;
    }

    setProfile(buildFallbackProfile(user));
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (mounted) {
        await loadSessionState(currentSession);
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void loadSessionState(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadSessionState]);

  const refreshProfile = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    await loadSessionState(currentSession);
  }, [loadSessionState]);

  const signOut = useCallback(async () => {
    setSession(null);
    setProfile(null);
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
      () => ({
        session,
        user: session?.user ?? null,
        profile,
        loading,
        refreshProfile,
        signOut,
      }),
      [session, profile, loading, refreshProfile, signOut],
  );

  return (
      <AuthSessionContext.Provider value={value}>
        {children}
      </AuthSessionContext.Provider>
  );
};

export const useAuthSession = () => {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }

  return context;
};
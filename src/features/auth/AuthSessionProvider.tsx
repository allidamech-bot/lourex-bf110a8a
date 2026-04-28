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
  profileError: boolean;
  profileMissing: boolean;
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

const toRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

const mapProfileRow = (rawRow: unknown, user: User): LourexProfile | null => {
  const row = toRecord(rawRow);
  const createdAt = safeString(row.created_at, new Date().toISOString());

  const rawRole = safeString(row.role) || safeString(row.role_name);
  if (!isValidRole(rawRole)) {
    return null;
  }
  const role: LourexRole = rawRole;

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

export const AuthSessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<LourexProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [profileMissing, setProfileMissing] = useState(false);

  const loadSessionState = useCallback(async (nextSession: Session | null) => {
    setLoading(true);
    setSession(nextSession);
    setProfile(null);
    setProfileError(false);
    setProfileMissing(false);

    if (!nextSession?.user) {
      setLoading(false);
      return;
    }

    const user = nextSession.user;

    const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, partner_type, status, phone, country, created_at")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
      console.warn("Profile fetch error:", error);
      setProfileError(true);
      setLoading(false);
      return;
    }

    if (data) {
      const nextProfile = mapProfileRow(data, user);
      if (!nextProfile) {
        console.warn("Profile row has an invalid or missing role.");
        setProfileError(true);
        setLoading(false);
        return;
      }
      setProfile(nextProfile);
      setLoading(false);
      return;
    }

    setProfileMissing(true);
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
    setProfileError(false);
    setProfileMissing(false);
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
      () => ({
        session,
        user: session?.user ?? null,
        profile,
        loading,
        profileError,
        profileMissing,
        refreshProfile,
        signOut,
      }),
      [session, profile, loading, profileError, profileMissing, refreshProfile, signOut],
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

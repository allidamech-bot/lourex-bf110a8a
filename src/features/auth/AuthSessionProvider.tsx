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
import { isValidRole, type LourexProfile } from "@/features/auth/rbac";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: LourexProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthContextValue | undefined>(undefined);

const mapProfileRow = (row: Record<string, unknown>): LourexProfile | null => {
  if (typeof row?.role !== "string" || !isValidRole(row.role)) {
    return null;
  }

  return {
    id: String(row.id),
    email: String(row.email || ""),
    fullName: String(row.full_name || ""),
    role: row.role as LourexProfile["role"],
    partnerType: (row.partner_type as LourexProfile["partnerType"]) || null,
    status: row.status as LourexProfile["status"],
    phone: typeof row.phone === "string" ? row.phone : undefined,
    country: typeof row.country === "string" ? row.country : undefined,
    city: undefined,
    createdAt: String(row.created_at),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : String(row.created_at),
  };
};

export const AuthSessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<LourexProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const clearInvalidSession = useCallback(async () => {
    setSession(null);
    setProfile(null);
    await supabase.auth.signOut();
  }, []);

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
      .select("id, email, full_name, role, partner_type, status, phone, country, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setProfile(null);
      setLoading(false);
      return;
    }

    if (data) {
      const mappedProfile = mapProfileRow(data);

      if (!mappedProfile) {
        await clearInvalidSession();
        setLoading(false);
        return;
      }

      setProfile(mappedProfile);
      setLoading(false);
      return;
    }

    setProfile(null);
    setLoading(false);
  }, [clearInvalidSession]);

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

    bootstrap();

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

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
};

export const useAuthSession = () => {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }

  return context;
};

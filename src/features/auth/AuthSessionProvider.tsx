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

const mapProfileRow = (row: any): LourexProfile | null => {
  if (!row?.role || !isValidRole(row.role)) {
    return null;
  }

  return {
    id: row.id,
    email: row.email || "",
    fullName: row.full_name || "",
    role: row.role as any,
    partnerType: row.partner_type as any || null,
    status: row.status as any,
    phone: row.phone || undefined,
    country: row.country || undefined,
    city: row.city || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
      .select("id, email, full_name, role, partner_type, status, phone, country, city, created_at, updated_at")
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

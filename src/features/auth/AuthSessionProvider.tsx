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
import type { LourexProfile } from "@/features/auth/rbac";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: LourexProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthContextValue | undefined>(undefined);

const mapProfileRow = (row: any): LourexProfile => ({
  id: row.id,
  email: row.email || "",
  fullName: row.full_name || "",
  role: row.role,
  partnerType: row.partner_type || null,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const ensureOwnProfile = async (user: User) => {
  const payload = {
    id: user.id,
    email: user.email || "",
    full_name: user.user_metadata?.full_name || "",
    role: "customer",
    partner_type: null,
    status: "active",
  };

  const { data, error } = await (supabase as any)
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id, email, full_name, role, partner_type, status, created_at, updated_at")
    .single();

  if (error) throw error;
  return data;
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

    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("id, email, full_name, role, partner_type, status, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setProfile(null);
      setLoading(false);
      return;
    }

    if (data) {
      setProfile(mapProfileRow(data));
      setLoading(false);
      return;
    }

    try {
      const created = await ensureOwnProfile(user);
      setProfile(mapProfileRow(created));
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
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

/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import type { LourexProfile } from "@/features/auth/rbac";
import { mapProfileRow } from "@/features/auth/profileMapping";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: LourexProfile | null;
  loading: boolean;
  profileError: boolean;
  profileMissing: boolean;
  /** True when Supabase is configured and reachable. False in unconfigured/dev environments. */
  isSupabaseReady: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthSessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<LourexProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [profileMissing, setProfileMissing] = useState(false);
  const profileRequestSequence = useRef(0);

  const loadSessionState = useCallback(async (nextSession: Session | null) => {
    // Only the most recent login/logout/profile request may commit results.
    const requestNumber = ++profileRequestSequence.current;
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

    if (requestNumber !== profileRequestSequence.current) return;

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
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      const initialSequence = profileRequestSequence.current;
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (mounted && initialSequence === profileRequestSequence.current) {
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
    if (!isSupabaseConfigured) {
      setSession(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    const beforeRefresh = profileRequestSequence.current;
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (beforeRefresh === profileRequestSequence.current) {
      await loadSessionState(currentSession);
    }
  }, [loadSessionState]);

  const signOut = useCallback(async () => {
    ++profileRequestSequence.current;
    setSession(null);
    setProfile(null);
    setProfileError(false);
    setProfileMissing(false);
    // A sign-out must leave no pending spinner, even when a profile fetch is in flight.
    setLoading(false);
    if (!isSupabaseConfigured) return;
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
        isSupabaseReady: isSupabaseConfigured,
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

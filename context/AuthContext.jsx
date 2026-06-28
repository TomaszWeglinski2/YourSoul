"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { applyPendingDisplayNameIfAny } from "@/lib/userData";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshDisplayName = useCallback(async (userId) => {
    if (!userId) {
      setDisplayName(null);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    setDisplayName(data?.display_name ?? null);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      void refreshDisplayName(nextUser?.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      void refreshDisplayName(nextUser?.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [refreshDisplayName]);

  const signUp = useCallback(async (email, password) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    // Profil tworzy trigger w bazie; upsert tylko gdy od razu mamy sesję.
    if (data.session && data.user) {
      await supabase.from("profiles").upsert(
        { id: data.user.id },
        { onConflict: "id", ignoreDuplicates: true }
      );
    }

    return {
      ok: true,
      needsConfirmation: !data.session,
      user: data.user,
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    await applyPendingDisplayNameIfAny();
    await refreshDisplayName((await supabase.auth.getUser()).data.user?.id);

    return { ok: true };
  }, [refreshDisplayName]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setDisplayName(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      displayName,
      loading,
      signUp,
      signIn,
      signOut,
      refreshDisplayName,
      isAuthenticated: Boolean(user),
    }),
    [user, displayName, loading, signUp, signIn, signOut, refreshDisplayName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth musi być użyty wewnątrz AuthProvider.");
  }
  return context;
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useJourney } from "@/context/JourneyContext";
import { hasValidOdcisk } from "@/lib/profileAccess";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

/**
 * Przy zalogowanym użytkowniku z odciskiem w profiles — odblokowuje panele
 * bez ponownego przechodzenia Wrót w tej sesji.
 */
export function usePanelAccess() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { wrotaComplete, hydrateFromProfile } = useJourney();
  const [ready, setReady] = useState(false);
  const [profileOdcisk, setProfileOdcisk] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;

    async function sync() {
      if (!isAuthenticated) {
        if (!cancelled) {
          setProfileOdcisk(false);
          setReady(true);
        }
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        if (!cancelled) {
          setProfileOdcisk(false);
          setReady(true);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("worlds, odcisk, wrota_completed_at")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      const valid = hasValidOdcisk(profile?.odcisk);
      if (valid && profile) {
        hydrateFromProfile(profile);
      }
      setProfileOdcisk(valid);
      setReady(true);
    }

    void sync();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, hydrateFromProfile]);

  const canAccessPanels = profileOdcisk || wrotaComplete;
  const requiresWrota = isAuthenticated && ready && !canAccessPanels;

  return {
    ready: ready && !authLoading,
    canAccessPanels,
    requiresWrota,
    profileOdcisk,
  };
}

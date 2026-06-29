"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { computeOdcisk } from "@/lib/journeyMath";
import { INITIAL_JOURNEY_STATE } from "@/lib/journeyConstants";
import { hasValidOdcisk } from "@/lib/profileAccess";

const JourneyContext = createContext(null);

export function JourneyProvider({ children }) {
  const [state, setState] = useState(INITIAL_JOURNEY_STATE);

  const toggleWorld = useCallback((world) => {
    setState((prev) => {
      const index = prev.worlds.indexOf(world);
      const worlds =
        index >= 0
          ? prev.worlds.filter((w) => w !== world)
          : [...prev.worlds, world];
      return { ...prev, worlds };
    });
  }, []);

  const setHonesty = useCallback((honesty) => {
    setState((prev) => ({ ...prev, honesty }));
  }, []);

  const selectSonda = useCallback((sondaIndex) => {
    setState((prev) => ({ ...prev, sonda: sondaIndex }));
  }, []);

  const completeWrota = useCallback((sondaIndex, honesty) => {
    setState((prev) => ({
      ...prev,
      sonda: sondaIndex,
      honesty,
      odcisk: computeOdcisk(sondaIndex, honesty),
      mood: [0, 0, 0, 0, 0],
      di: 0,
      wrotaComplete: true,
    }));
  }, []);

  const answerDicho = useCallback((axis, direction) => {
    setState((prev) => {
      const mood = [...prev.mood];
      mood[axis] = direction === "pos" ? 0.85 : -0.85;
      return { ...prev, mood, di: prev.di + 1 };
    });
  }, []);

  const setCurrentQuote = useCallback((quote) => {
    setState((prev) => ({ ...prev, current: quote }));
  }, []);

  const addToShown = useCallback((quoteId) => {
    setState((prev) => {
      if (prev.shown.includes(quoteId)) return prev;
      return { ...prev, shown: [...prev.shown, quoteId] };
    });
  }, []);

  const saveMargin = useCallback((quoteId, text, isPublic) => {
    setState((prev) => ({
      ...prev,
      marg: { ...prev.marg, [quoteId]: text },
      pub: { ...prev.pub, [quoteId]: isPublic },
    }));
  }, []);

  const setFlagged = useCallback((quoteId) => {
    setState((prev) => ({
      ...prev,
      flagged: { ...prev.flagged, [quoteId]: true },
    }));
  }, []);

  const addToZielnik = useCallback((quote) => {
    setState((prev) => {
      if (prev.zielnik.some((q) => q.id === quote.id)) return prev;
      return { ...prev, zielnik: [...prev.zielnik, quote] };
    });
  }, []);

  const toggleResonance = useCallback((echoIndex) => {
    setState((prev) => ({
      ...prev,
      resonance: {
        ...prev.resonance,
        [echoIndex]: !prev.resonance[echoIndex],
      },
    }));
  }, []);

  const setMood = useCallback((mood) => {
    setState((prev) => ({ ...prev, mood }));
  }, []);

  const setDimmedQuoteId = useCallback((quoteId) => {
    setState((prev) => ({ ...prev, dimmedQuoteId: quoteId }));
  }, []);

  const resetJourney = useCallback(() => {
    setState(INITIAL_JOURNEY_STATE);
  }, []);

  const hydrateFromProfile = useCallback((profile) => {
    setState((prev) => {
      if (!hasValidOdcisk(profile?.odcisk)) {
        return prev;
      }
      if (
        prev.wrotaComplete &&
        prev.odcisk?.join?.(",") === profile.odcisk?.join?.(",")
      ) {
        return prev;
      }
      return {
        ...prev,
        worlds: profile.worlds?.length ? profile.worlds : prev.worlds,
        odcisk: profile.odcisk,
        wrotaComplete: true,
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      toggleWorld,
      setHonesty,
      selectSonda,
      completeWrota,
      answerDicho,
      setCurrentQuote,
      addToShown,
      saveMargin,
      setFlagged,
      addToZielnik,
      toggleResonance,
      setMood,
      setDimmedQuoteId,
      resetJourney,
      hydrateFromProfile,
    }),
    [
      state,
      toggleWorld,
      setHonesty,
      selectSonda,
      completeWrota,
      answerDicho,
      setCurrentQuote,
      addToShown,
      saveMargin,
      setFlagged,
      addToZielnik,
      toggleResonance,
      setMood,
      setDimmedQuoteId,
      resetJourney,
      hydrateFromProfile,
    ]
  );

  return (
    <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>
  );
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) {
    throw new Error("useJourney musi być użyty wewnątrz JourneyProvider.");
  }
  return context;
}

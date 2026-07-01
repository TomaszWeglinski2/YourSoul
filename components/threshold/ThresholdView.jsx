"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { JourneyCard, JourneyShell } from "@/components/journey/JourneyShell";
import { useAuth } from "@/context/AuthContext";
import { usePanelAccess } from "@/hooks/usePanelAccess";
import { oracleDrawsWord } from "@/lib/oracleLimits";
import {
  fetchThresholdSnapshot,
  markThresholdVisit,
} from "@/lib/thresholdData";

const TILES = [
  { href: "/konstelacja", label: "Konstelacja", hint: "Twoje niebo" },
  { href: "/zielnik", label: "Zielnik", hint: "Prywatna antologia" },
  { href: "/rozmowy", label: "Rozmowy", hint: "Prywatne 1:1" },
  { href: "/ludzie", label: "Pracownia", hint: "Spotkania na orbicie" },
  { href: "/moje-zapisy", label: "Moje zapisy", hint: "Profil i historia" },
];

function GuestHome() {
  const router = useRouter();

  return (
    <JourneyShell>
      <JourneyCard dark>
        <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
          Your Soul
        </p>
        <h1 className="mb-2.5 font-serif text-[25px] font-medium leading-tight text-[#ece6d8]">
          Your Soul
        </h1>
        <p className="font-sans text-sm leading-relaxed text-mist">
          Zatrzymaj się na chwilę — to droga w głąb siebie, krok po kroku.
        </p>
        <button
          type="button"
          onClick={() => router.push("/wrota")}
          className="mt-2.5 block w-full rounded-[11px] border border-brass bg-brass px-4 py-3.5 font-sans text-sm text-[#fff8ec] transition-all duration-150 hover:bg-brassdeep hover:-translate-y-px"
        >
          Stań u Wrót
        </button>
      </JourneyCard>
    </JourneyShell>
  );
}

export function ThresholdView() {
  const router = useRouter();
  const { displayName, isAuthenticated, loading: authLoading } = useAuth();
  const { ready, canAccessPanels, requiresWrota } = usePanelAccess();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await fetchThresholdSnapshot();
    if (!result.ok) {
      setError(result.error ?? "Nie udało się wczytać Progu.");
      setSnapshot(null);
    } else {
      setSnapshot(result.snapshot);
      await markThresholdVisit();
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading || !ready) {
      return;
    }

    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    if (requiresWrota) {
      router.replace("/wrota");
      return;
    }

    if (!canAccessPanels) {
      setLoading(false);
      return;
    }

    void load();
  }, [
    authLoading,
    ready,
    isAuthenticated,
    requiresWrota,
    canAccessPanels,
    load,
    router,
  ]);

  if (authLoading || !ready || loading) {
    return (
      <JourneyShell showNav>
        <JourneyCard dark>
          <p className="font-sans text-sm italic text-mistsoft">
            Próg się rozświetla…
          </p>
        </JourneyCard>
      </JourneyShell>
    );
  }

  if (!isAuthenticated) {
    return <GuestHome />;
  }

  const remaining = Number(snapshot?.oracle?.remaining ?? 0);
  const hasDraws = remaining > 0;
  const name = displayName ?? "Podróżnik";
  const newResonances = Number(snapshot?.newResonances ?? 0);
  const unread = Number(snapshot?.unreadConversations ?? 0);
  const showSinceLine =
    Boolean(snapshot?.lastVisitAt) && (newResonances > 0 || unread > 0);

  return (
    <JourneyShell showNav wide>
      <div className="threshold">
        <header className="threshold__head">
          <p className="threshold__kick">Próg</p>
          <h1 className="threshold__title">Witaj, {name}</h1>
          {showSinceLine ? (
            <p className="threshold__since">
              Od ostatniej wizyty:
              {newResonances > 0 ? (
                <span>
                  {" "}
                  {newResonances}{" "}
                  {newResonances === 1 ? "nowy rezonans" : "nowe rezonanse"}
                </span>
              ) : null}
              {newResonances > 0 && unread > 0 ? <span> · </span> : null}
              {unread > 0 ? (
                <span>
                  {unread}{" "}
                  {unread === 1
                    ? "nieprzeczytana rozmowa"
                    : "nieprzeczytanych rozmów"}
                </span>
              ) : null}
            </p>
          ) : null}
          {error ? (
            <p className="threshold__error">{error}</p>
          ) : null}
        </header>

        <Link
          href={hasDraws ? "/wyrocznia" : "#"}
          aria-disabled={!hasDraws}
          onClick={(event) => {
            if (!hasDraws) {
              event.preventDefault();
            }
          }}
          className={`threshold-oracle ${hasDraws ? "threshold-oracle--live" : "threshold-oracle--quiet"}`}
        >
          <p className="threshold-oracle__label">Wyrocznia</p>
          {hasDraws ? (
            <>
              <p className="threshold-oracle__lead">
                Wyrocznia czeka — zostały Ci dziś {remaining}{" "}
                {oracleDrawsWord(remaining)}
              </p>
              <p className="threshold-oracle__cta">Wejdź, gdy będziesz gotów</p>
            </>
          ) : (
            <>
              <p className="threshold-oracle__lead threshold-oracle__lead--muted">
                Wyrocznia milczy do jutra
              </p>
              <p className="threshold-oracle__cta threshold-oracle__cta--muted">
                Limit dzienny wyczerpany
              </p>
            </>
          )}
        </Link>

        <nav className="threshold-tiles" aria-label="Wejścia">
          {TILES.map((tile) => (
            <Link key={tile.href} href={tile.href} className="threshold-tile">
              <span className="threshold-tile__label">{tile.label}</span>
              <span className="threshold-tile__hint">{tile.hint}</span>
            </Link>
          ))}
        </nav>
      </div>
    </JourneyShell>
  );
}

export function HomePage() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <JourneyShell>
        <JourneyCard dark>
          <p className="font-sans text-sm italic text-mistsoft">Chwila…</p>
        </JourneyCard>
      </JourneyShell>
    );
  }

  if (isAuthenticated) {
    return <ThresholdView />;
  }

  return <GuestHome />;
}

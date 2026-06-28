"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BrassButton,
  JourneyCard,
  JourneyShell,
} from "@/components/journey/JourneyShell";
import {
  createInviteCode,
  fetchMyInviteCodes,
  fetchReferralStatus,
  fetchTrustJournal,
} from "@/lib/referralData";
import { useAuth } from "@/context/AuthContext";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}

const STATUS_LABELS = {
  available: "wolny",
  pending_wrota: "czeka na Wrota",
  completed: "realizowany",
  revoked: "cofnięty",
};

const TIER_LABELS = {
  regular: "zwykły",
  trusted: "zaufany",
};

export function ReferralsView() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [status, setStatus] = useState(null);
  const [codes, setCodes] = useState([]);
  const [journal, setJournal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [statusRes, codesRes, journalRes] = await Promise.all([
      fetchReferralStatus(),
      fetchMyInviteCodes(),
      fetchTrustJournal(),
    ]);

    if (!statusRes.ok) {
      setError(statusRes.error ?? "Nie udało się wczytać statusu.");
    } else {
      setStatus(statusRes.status);
    }

    if (codesRes.ok) {
      setCodes(codesRes.codes);
    }

    if (journalRes.ok) {
      setJournal(journalRes.entries);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, isAuthenticated, load]);

  async function handleCreateCode() {
    setCreating(true);
    setError("");
    const result = await createInviteCode();
    if (!result.ok) {
      setError(result.error);
      setCreating(false);
      return;
    }
    await load();
    setCreating(false);
    if (result.code) {
      setCopied(result.code);
    }
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
    } catch {
      setCopied("");
    }
  }

  if (authLoading || loading) {
    return (
      <JourneyShell>
        <JourneyCard dark>
          <p className="font-sans text-sm italic text-mistsoft">Ładuję zaproszenia…</p>
        </JourneyCard>
      </JourneyShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <JourneyShell>
        <JourneyCard>
          <p className="mb-4 font-sans text-sm text-inksoft">
            Zaloguj się, aby zarządzać kodami zaproszeń.
          </p>
          <BrassButton onClick={() => router.push("/logowanie?next=/zaproszenia")}>
            zaloguj się
          </BrassButton>
        </JourneyCard>
      </JourneyShell>
    );
  }

  const noviceUntil = status?.novice_until
    ? new Date(status.novice_until)
    : null;
  const stillNovice =
    status?.wrota_completed_at &&
    !status?.can_create_codes &&
    noviceUntil &&
    noviceUntil.getTime() > Date.now();

  return (
    <JourneyShell>
      <JourneyCard dark>
        <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
          Dzielenie drogi
        </p>
        <h1 className="mb-2 font-serif text-[22px] font-medium text-[#ece6d8]">
          Twoje zaproszenia
        </h1>
        <p className="mb-4 font-sans text-xs leading-relaxed text-mistsoft">
          Kod wiąże się dopiero, gdy zaproszony przejdzie Wrota. Twoje wejście:{" "}
          <strong className="text-brass">
            {status?.invite_access_tier === "trusted" ? "zaufane" : "zwykłe"}
          </strong>
          . Pula 3/5/8+cap10; kody, które sam tworzysz, są zawsze zwykłe.
        </p>

        {error ? (
          <p className="mb-3 font-sans text-xs text-tension">{error}</p>
        ) : null}

        <div className="mb-4 grid grid-cols-2 gap-2 font-sans text-xs text-mistsoft">
          <div className="rounded-[10px] border border-mist/20 bg-black/20 px-3 py-2">
            <span className="block text-[10px] uppercase tracking-wide text-brass">
              Zaufanie
            </span>
            {status?.trust_score ?? 0}
          </div>
          <div className="rounded-[10px] border border-mist/20 bg-black/20 px-3 py-2">
            <span className="block text-[10px] uppercase tracking-wide text-brass">
              Pula
            </span>
            {status?.invite_codes_remaining ?? 0} / {status?.invite_pool ?? 0}
          </div>
          <div className="rounded-[10px] border border-mist/20 bg-black/20 px-3 py-2">
            <span className="block text-[10px] uppercase tracking-wide text-brass">
              Zaproszeni
            </span>
            {status?.referrals_completed ?? 0}
          </div>
          <div className="rounded-[10px] border border-mist/20 bg-black/20 px-3 py-2">
            <span className="block text-[10px] uppercase tracking-wide text-brass">
              Ugruntowani
            </span>
            {status?.referrals_grounded ?? 0}
          </div>
        </div>

        {stillNovice ? (
          <p className="mb-4 rounded-[10px] border border-brass/25 bg-brass/10 px-3 py-2 font-sans text-xs text-mist">
            Okres nowicjusza (kod zwykły) — zaproszenia odblokują się{" "}
            {formatDate(status.novice_until)}.
          </p>
        ) : status?.invite_access_tier === "trusted" && status?.can_create_codes ? (
          <p className="mb-4 rounded-[10px] border border-brass/25 bg-brass/10 px-3 py-2 font-sans text-xs text-mist">
            Masz status zaufany — możesz zapraszać od razu po Wrótach.
          </p>
        ) : null}

        {status?.can_create_codes ? (
          <BrassButton
            disabled={creating || (status?.invite_codes_remaining ?? 0) <= 0}
            onClick={() => void handleCreateCode()}
            className="mb-4"
          >
            {creating ? "Generuję…" : "Wygeneruj kod zaproszenia"}
          </BrassButton>
        ) : !stillNovice ? (
          <p className="mb-4 font-sans text-xs italic text-mistsoft">
            Najpierw przejdź Wrota, aby zapraszać innych.
          </p>
        ) : null}

        {copied ? (
          <p className="mb-3 font-sans text-xs text-brass">
            Skopiuj kod: <strong className="tracking-widest">{copied}</strong>
          </p>
        ) : null}

        {codes.length > 0 ? (
          <div className="mb-4 flex flex-col gap-2">
            {codes.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-[10px] border border-mist/20 bg-black/25 px-3 py-2"
              >
                <div>
                  <span className="font-mono text-sm tracking-widest text-[#ece6d8]">
                    {row.code}
                  </span>
                  <span className="ml-2 font-sans text-[10px] uppercase text-mistsoft">
                    {STATUS_LABELS[row.status] ?? row.status}
                  </span>
                </div>
                {row.status === "available" ? (
                  <button
                    type="button"
                    onClick={() => void copyCode(row.code)}
                    className="font-sans text-[11px] text-brass hover:underline"
                  >
                    kopiuj
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {journal.length > 0 ? (
          <>
            <h2 className="mb-2 font-serif text-base text-[#ece6d8]">
              Dziennik zaufania
            </h2>
            <ul className="mb-4 max-h-40 space-y-1 overflow-y-auto font-sans text-[11px] text-mistsoft">
              {journal.map((row) => (
                <li key={row.id}>
                  {formatDate(row.created_at)} · {row.reason}{" "}
                  <span className={row.delta >= 0 ? "text-brass" : "text-tension"}>
                    ({row.delta >= 0 ? "+" : ""}
                    {row.delta})
                  </span>{" "}
                  → {row.trust_after}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => router.push("/drzewo")}
          className="mb-2 block w-full rounded-[11px] border border-mist/30 px-3 py-2.5 font-sans text-[13px] text-mistsoft hover:border-mist/50"
        >
          publiczne drzewo poleceń
        </button>
        <button
          type="button"
          onClick={() => router.push("/moje-zapisy")}
          className="block w-full rounded-[11px] border border-mist/30 px-3 py-2.5 font-sans text-[13px] text-mistsoft hover:border-mist/50"
        >
          wróć
        </button>
      </JourneyCard>
    </JourneyShell>
  );
}

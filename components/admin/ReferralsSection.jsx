"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminKick,
} from "@/components/admin/AdminShell";

export function ReferralsSection({ password }) {
  const [flags, setFlags] = useState([]);
  const [journal, setJournal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Nie udało się wczytać danych.");
        return;
      }

      setFlags(data.flags ?? []);
      setJournal(data.journal ?? []);
    } catch {
      setError("Błąd połączenia.");
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRunNightly() {
    setRunning(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/referrals/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Przeliczenie nie powiodło się.");
        return;
      }

      setMessage(JSON.stringify(data.result));
      await load();
    } catch {
      setError("Błąd połączenia.");
    } finally {
      setRunning(false);
    }
  }

  async function reviewFlag(flagId) {
    const response = await fetch("/api/admin/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, action: "review_flag", flagId }),
    });
    if (response.ok) {
      await load();
    }
  }

  return (
    <AdminCard>
      <AdminKick>Polecenia i zaufanie</AdminKick>
      <p className="mb-4 font-sans text-sm leading-relaxed text-inksoft">
        Nocne zadanie: ugruntowanie (+3 zaufania), kary za bany, przeliczenie pul
        3/5/8+cap10, skan nadużyć. Ban użytkownika: ustaw{" "}
        <code className="text-xs">profiles.is_banned = true</code> w SQL lub
        przez API.
      </p>

      <AdminButton
        disabled={running}
        onClick={() => void handleRunNightly()}
        className="mb-4"
      >
        {running ? "Przeliczam…" : "Uruchom compute_nightly_referrals"}
      </AdminButton>

      {message ? (
        <p className="mb-3 font-mono text-[10px] text-inksoft">{message}</p>
      ) : null}
      {error ? (
        <p className="mb-3 font-sans text-xs text-tension">{error}</p>
      ) : null}

      <h2 className="mb-2 font-serif text-lg text-ink">Flagi nadużyć</h2>
      {loading ? (
        <p className="font-sans text-xs italic">Ładuję…</p>
      ) : flags.length === 0 ? (
        <p className="mb-4 font-sans text-xs text-inksoft">Brak flag.</p>
      ) : (
        <ul className="mb-4 space-y-2 font-sans text-xs text-inksoft">
          {flags.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-brass/15 px-2 py-1.5"
            >
              <span>
                {row.flag_type} · {row.severity} ·{" "}
                {String(row.user_id).slice(0, 8)}…
                {row.reviewed_at ? " · reviewed" : ""}
              </span>
              {!row.reviewed_at ? (
                <button
                  type="button"
                  onClick={() => void reviewFlag(row.id)}
                  className="text-brass hover:underline"
                >
                  oznacz
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-2 font-serif text-lg text-ink">Ostatnie zmiany zaufania</h2>
      {journal.length === 0 ? (
        <p className="font-sans text-xs text-inksoft">Pusto.</p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto font-sans text-[11px] text-inksoft">
          {journal.map((row) => (
            <li key={row.id}>
              {row.reason} {row.delta >= 0 ? "+" : ""}
              {row.delta} → {row.trust_after} (
              {String(row.user_id).slice(0, 8)}…)
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminKick,
} from "@/components/admin/AdminShell";

const TIER_LABELS = {
  regular: "zwykłe (30 dni)",
  trusted: "zaufane (od razu)",
};

export function ReferralsSection({ password }) {
  const [flags, setFlags] = useState([]);
  const [journal, setJournal] = useState([]);
  const [adminCodes, setAdminCodes] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const [codeTier, setCodeTier] = useState("regular");
  const [codeCount, setCodeCount] = useState(1);
  const [userId, setUserId] = useState("");
  const [noviceDate, setNoviceDate] = useState("");

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
      setAdminCodes(data.adminCodes ?? []);
      setUsers(data.users ?? []);
      if (data.adminCodesError) {
        setError(data.adminCodesError);
      }
      if (data.usersError) {
        setError((prev) => prev ? `${prev} · ${data.usersError}` : data.usersError);
      }
    } catch {
      setError("Błąd połączenia.");
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    void load();
  }, [load]);

  async function postAction(payload) {
    const response = await fetch("/api/admin/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, ...payload }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Operacja nie powiodła się.");
    }
    return data;
  }

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
    } catch (err) {
      setError(err.message ?? "Błąd połączenia.");
    } finally {
      setRunning(false);
    }
  }

  async function handleCreateCodes() {
    setCreating(true);
    setMessage("");
    setError("");

    try {
      const data = await postAction({
        action: "create_codes",
        tier: codeTier,
        count: codeCount,
      });
      const codes = (data.codes ?? []).map((row) => row.code).join(", ");
      setMessage(`Wygenerowano: ${codes}`);
      await load();
    } catch (err) {
      setError(err.message ?? "Nie udało się utworzyć kodów.");
    } finally {
      setCreating(false);
    }
  }

  async function handleUserAccess(mode) {
    const targetId = selectedUser?.id ?? userId.trim();
    if (!targetId) {
      setError("Wybierz użytkownika z listy.");
      return;
    }

    setMessage("");
    setError("");

    try {
      await postAction({
        action: "set_user_access",
        userId: targetId,
        mode,
        noviceUntil: noviceDate || undefined,
      });
      setMessage(
        `Zaktualizowano ${selectedUser?.display_name ?? targetId.slice(0, 8)} (${mode}).`
      );
    } catch (err) {
      setError(err.message ?? "Nie udało się zaktualizować użytkownika.");
    }
  }

  async function reviewFlag(flagId) {
    try {
      await postAction({ action: "review_flag", flagId });
      await load();
    } catch {
      setError("Nie udało się oznaczyć flagi.");
    }
  }

  const filteredUsers = users.filter((row) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      row.display_name?.toLowerCase().includes(q) ||
      row.email?.toLowerCase().includes(q) ||
      row.id.toLowerCase().includes(q)
    );
  });

  return (
    <AdminCard>
      <AdminKick>Polecenia i zaufanie</AdminKick>
      <p className="mb-4 font-sans text-sm leading-relaxed text-inksoft">
        Dwa typy zaproszeń: <strong>zwykłe</strong> (30 dni po Wrótach) i{" "}
        <strong>zaufane</strong> (od razu można zapraszać). Kody admina nie
        wymagają zapraszającego w drzewie.
      </p>

      <h2 className="mb-2 font-serif text-lg text-ink">Generuj kody ręcznie</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={codeTier}
          onChange={(e) => setCodeTier(e.target.value)}
          className="rounded-[10px] border border-brass/35 bg-white/40 px-3 py-2 font-sans text-sm"
        >
          <option value="regular">Zwykłe — 30 dni po Wrótach</option>
          <option value="trusted">Zaufane — zaproszenia od razu</option>
        </select>
        <input
          type="number"
          min={1}
          max={20}
          value={codeCount}
          onChange={(e) => setCodeCount(Number(e.target.value))}
          className="w-20 rounded-[10px] border border-brass/35 bg-white/40 px-3 py-2 font-sans text-sm"
        />
        <AdminButton disabled={creating} onClick={() => void handleCreateCodes()}>
          {creating ? "Generuję…" : "Generuj kody"}
        </AdminButton>
      </div>

      {adminCodes.length > 0 ? (
        <ul className="mb-4 max-h-32 space-y-1 overflow-y-auto font-mono text-[11px] text-inksoft">
          {adminCodes.map((row) => (
            <li key={row.id}>
              {row.code} · {TIER_LABELS[row.tier] ?? row.tier} · {row.status}
            </li>
          ))}
        </ul>
      ) : null}

      <h2 className="mb-2 font-serif text-lg text-ink">Okres próbny użytkownika</h2>
      <div className="mb-4 flex flex-col gap-2">
        <input
          type="search"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          placeholder="Szukaj po nazwie, e-mailu lub UUID"
          className="w-full rounded-[10px] border border-brass/35 bg-white/40 px-3 py-2 font-sans text-sm"
        />

        {loading ? (
          <p className="font-sans text-xs italic text-inksoft">Ładuję użytkowników…</p>
        ) : filteredUsers.length === 0 ? (
          <p className="font-sans text-xs text-inksoft">
            Brak użytkowników. Uruchom Docs/supabase-profiles-username.sql, jeśli
            kolumna display_name nie istnieje.
          </p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded border border-brass/15 p-2">
            {filteredUsers.map((row) => {
              const active = selectedUser?.id === row.id;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(row);
                      setUserId(row.id);
                    }}
                    className={`w-full rounded px-2 py-1.5 text-left font-sans text-xs transition-colors ${
                      active
                        ? "bg-brass/20 text-ink"
                        : "text-inksoft hover:bg-brass/10"
                    }`}
                  >
                    <span className="font-medium text-ink">
                      {row.display_name ?? "— bez nazwy —"}
                    </span>
                    <span className="mt-0.5 block opacity-80">
                      {row.email ?? "brak e-mail"} · {row.invite_access_tier} ·
                      zaufanie {row.trust_score}
                      {row.is_banned ? " · BAN" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {selectedUser ? (
          <p className="font-sans text-[11px] text-inksoft">
            Wybrany: <strong>{selectedUser.display_name ?? selectedUser.id}</strong>
          </p>
        ) : null}

        <input
          type="datetime-local"
          value={noviceDate}
          onChange={(e) => setNoviceDate(e.target.value)}
          className="w-full rounded-[10px] border border-brass/35 bg-white/40 px-3 py-2 font-sans text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <AdminButton onClick={() => void handleUserAccess("unlock_now")}>
            Odblokuj teraz
          </AdminButton>
          <AdminButton onClick={() => void handleUserAccess("trusted")}>
            Ustaw jako zaufany
          </AdminButton>
          <AdminButton
            disabled={!noviceDate}
            onClick={() => void handleUserAccess("novice_until")}
          >
            Ustaw datę końca próby
          </AdminButton>
        </div>
      </div>

      <AdminButton
        disabled={running}
        onClick={() => void handleRunNightly()}
        className="mb-4"
      >
        {running ? "Przeliczam…" : "Uruchom compute_nightly_referrals"}
      </AdminButton>

      {message ? (
        <p className="mb-3 font-sans text-xs text-inksoft">{message}</p>
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

"use client";

import { useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminKick,
  AdminShell,
} from "@/components/admin/AdminShell";
import { CatalogSection } from "@/components/admin/CatalogSection";
import { MatchesSection } from "@/components/admin/MatchesSection";
import { ReferralsSection } from "@/components/admin/ReferralsSection";
import { QualitySection } from "@/components/admin/QualitySection";
import { QuotesSection } from "@/components/admin/QuotesSection";
import { SubmissionsSection } from "@/components/admin/SubmissionsSection";

const TABS = [
  { id: "quotes", label: "Cytaty" },
  { id: "submissions", label: "Zgłoszenia" },
  { id: "glosses", label: "Glosy" },
  { id: "towers", label: "Wieże" },
  { id: "przesilenie", label: "Przesilenia" },
  { id: "cienie", label: "Cienie" },
  { id: "quality", label: "Jakość" },
  { id: "matches", label: "Dopasowania" },
  { id: "referrals", label: "Polecenia" },
];

const IMPORT_META = {
  glosses: {
    title: "Import glos",
    description:
      "Dodaje fasety do quote_glosses. Jeden cytat może mieć wiele glos.",
  },
  towers: {
    title: "Import wież",
    description:
      "Zapisuje definicje do tabeli towers. Przy braku przeciwległych biegunów na osi — ostrzeżenie, import i tak przechodzi.",
  },
  przesilenie: {
    title: "Import przesileń",
    description:
      "Szablony scen do przesilenie_templates. Takty trafiają do beats jako JSON.",
  },
  cienie: {
    title: "Import cieni",
    description:
      "Ustawia quotes.cien — ton tragiczno-ludzki, tylko postacie dawno zmarłe.",
  },
};

export function AdminPanel() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [tab, setTab] = useState("quotes");
  const [summaries, setSummaries] = useState({});

  async function handleUnlock(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setAuthenticated(false);
        setAuthError(data.error ?? "Nieprawidłowe hasło.");
        return;
      }

      setAuthenticated(true);
    } catch {
      setAuthError("Nie udało się zweryfikować hasła.");
    } finally {
      setAuthLoading(false);
    }
  }

  function setSummaryFor(type, data) {
    setSummaries((prev) => ({ ...prev, [type]: data }));
  }

  if (!authenticated) {
    return (
      <AdminShell>
        <AdminCard>
          <AdminKick>Panel redaktora</AdminKick>
          <h1 className="mb-2 font-serif text-[25px] font-medium leading-tight text-ink">
            Dostęp administracyjny
          </h1>
          <p className="mb-5 font-sans text-sm leading-relaxed text-inksoft">
            Hasło z zmiennej ADMIN_PASSWORD na serwerze.
          </p>
          <form onSubmit={(e) => void handleUnlock(e)} className="flex flex-col gap-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Hasło administratora"
              autoComplete="current-password"
              className="w-full rounded-[10px] border border-brass/35 bg-white/40 px-3 py-2.5 font-sans text-sm text-ink placeholder:text-inksoft/70 focus:border-brass focus:outline-none"
            />
            {authError ? (
              <p className="font-sans text-xs text-tension">{authError}</p>
            ) : null}
            <AdminButton disabled={authLoading || !password} type="submit">
              {authLoading ? "Sprawdzam…" : "Wejdź"}
            </AdminButton>
          </form>
        </AdminCard>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <nav className="flex flex-wrap gap-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full border px-3 py-1.5 font-sans text-[11px] tracking-wide transition-colors ${
              tab === item.id
                ? "border-brass bg-brass text-[#fff8ec]"
                : "border-brass/30 text-mistsoft hover:border-brass/60 hover:text-mist"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "quotes" ? <QuotesSection password={password} /> : null}

      {tab === "submissions" ? (
        <SubmissionsSection password={password} />
      ) : null}

      {tab === "quality" ? <QualitySection password={password} /> : null}

      {tab === "matches" ? <MatchesSection password={password} /> : null}

      {tab === "referrals" ? <ReferralsSection password={password} /> : null}

      {["glosses", "towers", "przesilenie", "cienie"].includes(tab) ? (
        <CatalogSection
          password={password}
          type={tab}
          title={IMPORT_META[tab].title}
          description={IMPORT_META[tab].description}
          summary={summaries[tab]}
          onSummary={(data) => setSummaryFor(tab, data)}
        />
      ) : null}
    </AdminShell>
  );
}

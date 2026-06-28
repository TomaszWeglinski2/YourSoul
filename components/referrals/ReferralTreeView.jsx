"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  JourneyCard,
  JourneyShell,
} from "@/components/journey/JourneyShell";
import { fetchPublicReferralTree } from "@/lib/referralData";

export function ReferralTreeView() {
  const router = useRouter();
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const result = await fetchPublicReferralTree();
      if (!result.ok) {
        setError(result.error ?? "Nie udało się wczytać drzewa.");
      } else {
        setEdges(result.edges);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <JourneyShell>
      <JourneyCard dark>
        <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
          Sieć
        </p>
        <h1 className="mb-2 font-serif text-[22px] font-medium text-[#ece6d8]">
          Drzewo poleceń
        </h1>
        <p className="mb-4 font-sans text-xs leading-relaxed text-mistsoft">
          Kto kogo zaprosił — anonimowo. Krawędź powstaje dopiero po Wrótach
          zaproszonego.
        </p>

        {loading ? (
          <p className="font-sans text-sm italic text-mistsoft">Ładuję…</p>
        ) : error ? (
          <p className="font-sans text-xs text-tension">{error}</p>
        ) : edges.length === 0 ? (
          <p className="font-sans text-sm text-mistsoft">
            Jeszcze pusto — pierwsze krawędzie pojawią się, gdy ktoś przejdzie
            Wrota z kodem.
          </p>
        ) : (
          <ul className="mb-4 max-h-[420px] space-y-2 overflow-y-auto">
            {edges.map((row) => (
              <li
                key={row.edge_id}
                className="rounded-[10px] border border-mist/20 bg-black/25 px-3 py-2 font-sans text-sm text-mistsoft"
              >
                <span className="text-[#ece6d8]">{row.inviter_label}</span>
                <span className="mx-2 text-brass">→</span>
                <span className="text-[#ece6d8]">{row.invitee_label}</span>
                {row.grounded_at ? (
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-brass">
                    ugruntowany
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => router.push("/zaproszenia")}
          className="block w-full rounded-[11px] border border-mist/30 px-3 py-2.5 font-sans text-[13px] text-mistsoft hover:border-mist/50"
        >
          twoje kody
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-2 block w-full rounded-[11px] border border-mist/30 px-3 py-2.5 font-sans text-[13px] text-mistsoft hover:border-mist/50"
        >
          strona główna
        </button>
      </JourneyCard>
    </JourneyShell>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { SONDA } from "@/lib/journeyConstants";
import { computeOdcisk } from "@/lib/journeyMath";
import { upsertProfile } from "@/lib/userData";
import { useAuth } from "@/context/AuthContext";
import { useJourney } from "@/context/JourneyContext";
import {
  BrassButton,
  JourneyCard,
  JourneyShell,
} from "@/components/journey/JourneyShell";

export function WrotaStep2() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { worlds, sonda, honesty, setHonesty, selectSonda, completeWrota } =
    useJourney();
  const canContinue = sonda !== null;

  async function handleEnter() {
    if (sonda === null) return;

    const odcisk = computeOdcisk(sonda, honesty);
    completeWrota(sonda, honesty);

    if (isAuthenticated) {
      await upsertProfile({ worlds, odcisk });
    }

    router.push("/wyrocznia");
  }

  return (
    <JourneyShell>
      <JourneyCard>
        <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brassdeep">
          Wrota · 2 z 2 — sonda
        </p>
        <h1 className="mb-2.5 font-serif text-[25px] font-medium leading-tight text-ink">
          Które zdanie zostaje z Tobą?
        </h1>
        <p className="mb-2 font-sans text-sm leading-relaxed text-inksoft">
          Bez dobrych i złych odpowiedzi. Dotknij tego, które zostaje — i powiedz
          szczerze, jak mocno Cię porusza.
        </p>

        {SONDA.map((item, index) => {
          const selected = sonda === index;
          return (
            <button
              key={item.t}
              type="button"
              onClick={() => selectSonda(index)}
              className={`mt-2.5 block w-full cursor-pointer rounded-[10px] border px-3.5 py-3.5 text-left font-serif text-base italic leading-[1.45] text-ink transition-all duration-150 ${
                selected
                  ? "border-brass bg-brass/15"
                  : "border-brass/30 hover:border-brass hover:bg-brass/10"
              }`}
            >
              „{item.t}"
            </button>
          );
        })}

        <div className="mx-0.5 mt-[18px] mb-1">
          <label className="mb-[7px] flex justify-between font-sans text-[11.5px] italic text-inksoft">
            <span>omija mnie</span>
            <span>porusza mnie</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={honesty}
            onChange={(event) => setHonesty(Number(event.target.value))}
            className="w-full accent-brass"
          />
        </div>

        {!isAuthenticated ? (
          <p className="mt-2 font-sans text-[11px] italic text-inksoft">
            <button
              type="button"
              onClick={() => router.push("/logowanie?next=/wrota/sonda")}
              className="text-brassdeep underline-offset-2 hover:underline"
            >
              Zaloguj się
            </button>
            , aby zapisać odcisk i światy w profilu.
          </p>
        ) : null}

        <BrassButton disabled={!canContinue} onClick={handleEnter}>
          Wejdź do Wyroczni
        </BrassButton>
      </JourneyCard>
    </JourneyShell>
  );
}

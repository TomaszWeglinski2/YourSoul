"use client";

import { useRouter } from "next/navigation";
import { WORLDS } from "@/lib/journeyConstants";
import { useJourney } from "@/context/JourneyContext";
import {
  BrassButton,
  JourneyCard,
  JourneyShell,
} from "@/components/journey/JourneyShell";

export function WrotaStep1() {
  const router = useRouter();
  const { worlds, toggleWorld } = useJourney();
  const canContinue = worlds.length > 0;

  return (
    <JourneyShell>
      <JourneyCard>
        <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brassdeep">
          Wrota · 1 z 2
        </p>
        <h1 className="mb-2.5 font-serif text-[25px] font-medium leading-tight text-ink">
          W czym tracisz godziny?
        </h1>
        <p className="mb-2 font-sans text-sm leading-relaxed text-inksoft">
          Zaznacz, co naprawdę Cię pochłania. Można kilka — wielość mile
          widziana.
        </p>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {WORLDS.map((world) => {
            const selected = worlds.includes(world);
            return (
              <button
                key={world}
                type="button"
                onClick={() => toggleWorld(world)}
                className={`cursor-pointer rounded-[20px] border px-3.5 py-2 font-sans text-[13px] transition-all duration-150 ${
                  selected
                    ? "border-brass bg-brass text-[#fff8ec]"
                    : "border-brass/40 bg-transparent text-ink hover:border-brass"
                }`}
              >
                {world}
              </button>
            );
          })}
        </div>

        <BrassButton
          disabled={!canContinue}
          onClick={() => router.push("/wrota/sonda")}
        >
          Dalej
        </BrassButton>
      </JourneyCard>
    </JourneyShell>
  );
}

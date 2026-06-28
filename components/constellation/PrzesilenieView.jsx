"use client";

import { useState } from "react";
import { AXES } from "@/lib/journeyConstants";
import { pickPrzesilenie } from "@/lib/constellationData";
import { BrassButton, JourneyCard } from "@/components/journey/JourneyShell";

export function PrzesilenieView({
  quoteA,
  quoteB,
  axis,
  onComplete,
  onDimSacrifice,
}) {
  const scenario = pickPrzesilenie(axis);
  const [phase, setPhase] = useState(0);
  const [showPointa, setShowPointa] = useState(false);
  const [choice, setChoice] = useState(null);

  function handleChoice(which) {
    const keepLabel = which === "a" ? scenario.a : scenario.b;
    const sacLabel = which === "a" ? scenario.b : scenario.a;
    const sacQuoteId = which === "a" ? quoteB.id : quoteA.id;
    setChoice({ keepLabel, sacLabel });
    onDimSacrifice(sacQuoteId);
    setShowPointa(true);
  }

  if (showPointa && choice) {
    return (
      <JourneyCard>
        <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brassdeep">
          Pointa — lustro, nie ocena
        </p>
        <div className="rounded-r-lg border-l-2 border-brass bg-brass/10 px-3.5 py-3 font-serif text-[17px] leading-normal text-ink">
          „Gdy {scenario.a} i {scenario.b} się starły, ocaliłeś {choice.keepLabel}{" "}
          kosztem tego, co znaczyło {choice.sacLabel}. {scenario.pointa} To też
          jesteś Ty."
        </div>
        <p className="mt-3 font-sans text-xs italic leading-relaxed text-inksoft">
          Żadnego „dobrze / źle" ani wyniku — tylko kształt Twoich wartości, gdy
          musiały wybrać. Na mapie została nić napięcia, którą sam nazwałeś, a
          poświęcona gwiazda przygasła. Wyboru nie da się cofnąć.
        </p>
        <BrassButton onClick={onComplete} className="mt-4">
          wróć na mapę
        </BrassButton>
      </JourneyCard>
    );
  }

  if (phase < scenario.beats.length) {
    const beat = scenario.beats[phase];
    return (
      <JourneyCard dark>
        <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-tension">
          {beat.kick}
        </p>
        <div className="my-2 h-[120px] rounded-xl bg-gradient-to-b from-[#26304a] to-[#161b29]" />
        <p className="my-4 text-center font-serif text-lg italic leading-relaxed text-[#e7e2d4]">
          {beat.txt}
        </p>
        <BrassButton onClick={() => setPhase((p) => p + 1)} className="mt-0">
          {beat.btn}
        </BrassButton>
      </JourneyCard>
    );
  }

  return (
    <JourneyCard dark>
      <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-tension">
        Wybór jest jeden i nieodwracalny
      </p>
      <p className="mb-4 text-center font-serif text-lg italic text-[#ece6d8]">
        {scenario.name}
      </p>
      <button
        type="button"
        onClick={() => handleChoice("a")}
        className="mt-3 block w-full cursor-pointer rounded-xl border border-brass/40 bg-brass/5 px-4 py-[18px] text-center font-serif text-lg text-[#e6e0d2] transition-all duration-200 hover:border-brass hover:bg-brass/15"
      >
        Ocal {scenario.a}
      </button>
      <button
        type="button"
        onClick={() => handleChoice("b")}
        className="mt-3 block w-full cursor-pointer rounded-xl border border-brass/40 bg-brass/5 px-4 py-[18px] text-center font-serif text-lg text-[#e6e0d2] transition-all duration-200 hover:border-brass hover:bg-brass/15"
      >
        Ocal {scenario.b}
      </button>
      <p className="mt-3 text-center font-sans text-[11px] text-mistsoft">
        Oś: {AXES[axis]}
      </p>
    </JourneyCard>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { JourneyCard, JourneyShell } from "@/components/journey/JourneyShell";

export default function Home() {
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

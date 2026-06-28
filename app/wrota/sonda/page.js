"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { WrotaStep2 } from "@/components/journey/WrotaStep2";
import { useJourney } from "@/context/JourneyContext";

export default function WrotaSondaPage() {
  const router = useRouter();
  const { worlds } = useJourney();

  useEffect(() => {
    if (worlds.length === 0) {
      router.replace("/wrota");
    }
  }, [worlds, router]);

  if (worlds.length === 0) {
    return null;
  }

  return <WrotaStep2 />;
}

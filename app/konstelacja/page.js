"use client";

import { ConstellationView } from "@/components/constellation/ConstellationView";
import { PanelAccessGate } from "@/components/navigation/PanelAccessGate";

export default function KonstelacjaPage() {
  return (
    <PanelAccessGate>
      <ConstellationView />
    </PanelAccessGate>
  );
}

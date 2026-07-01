"use client";

import { PracowniaView } from "@/components/pracownia/PracowniaView";
import { PanelAccessGate } from "@/components/navigation/PanelAccessGate";

export default function PracowniaPage() {
  return (
    <PanelAccessGate>
      <PracowniaView />
    </PanelAccessGate>
  );
}

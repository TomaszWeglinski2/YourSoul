"use client";

import { ZielnikView } from "@/components/zielnik/ZielnikView";
import { PanelAccessGate } from "@/components/navigation/PanelAccessGate";

export default function ZielnikPage() {
  return (
    <PanelAccessGate>
      <ZielnikView />
    </PanelAccessGate>
  );
}

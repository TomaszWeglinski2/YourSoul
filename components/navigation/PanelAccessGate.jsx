"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePanelAccess } from "@/hooks/usePanelAccess";

export function PanelAccessGate({ children, requireOdcisk = true }) {
  const router = useRouter();
  const { ready, requiresWrota, canAccessPanels } = usePanelAccess();

  const blocked = requireOdcisk && (!canAccessPanels || requiresWrota);

  useEffect(() => {
    if (!ready || !blocked) {
      return;
    }
    router.replace("/wrota");
  }, [ready, blocked, router]);

  if (!ready) {
    return (
      <p className="font-sans text-sm italic text-mistsoft">Ładuję profil…</p>
    );
  }

  if (blocked) {
    return null;
  }

  return children;
}

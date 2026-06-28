"use client";

import { AuthProvider } from "@/context/AuthContext";
import { JourneyProvider } from "@/context/JourneyContext";

export function Providers({ children }) {
  return (
    <AuthProvider>
      <JourneyProvider>{children}</JourneyProvider>
    </AuthProvider>
  );
}

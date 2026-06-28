import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LogowaniePage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="login" />
    </Suspense>
  );
}

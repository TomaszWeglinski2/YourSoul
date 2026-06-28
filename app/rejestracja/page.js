import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export default function RejestracjaPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="register" />
    </Suspense>
  );
}

import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <p className="text-center text-sm text-slate-600">Loading sign-in…</p>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

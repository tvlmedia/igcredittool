import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/ui/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";

export default function UpdatePasswordPage() {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <Suspense>
        <AuthForm mode="update" />
      </Suspense>
    </main>
  );
}

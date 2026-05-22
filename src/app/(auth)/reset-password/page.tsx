import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/ui/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";

export default function ResetPasswordPage() {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <Suspense>
          <AuthForm mode="reset" />
        </Suspense>
        <div className="mt-5 text-center text-sm text-white/52">
          <Link className="transition hover:text-white" href="/login">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

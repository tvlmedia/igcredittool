import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/ui/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";

export default function LoginPage() {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  return (
    <AuthFrame>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
      <AuthLinks
        primaryHref="/signup"
        primaryLabel="Create account"
        secondaryHref="/reset-password"
        secondaryLabel="Reset password"
      />
    </AuthFrame>
  );
}

function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}

function AuthLinks({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel
}: {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <div className="mt-5 flex justify-center gap-4 text-sm text-white/52">
      <Link className="transition hover:text-white" href={primaryHref}>
        {primaryLabel}
      </Link>
      <span className="text-white/18">/</span>
      <Link className="transition hover:text-white" href={secondaryHref}>
        {secondaryLabel}
      </Link>
    </div>
  );
}

import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SetupNotice } from "@/components/ui/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";
import { getProfile } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children
}: {
  children: ReactNode;
}) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(user.id);

  return <AppShell profile={profile}>{children}</AppShell>;
}

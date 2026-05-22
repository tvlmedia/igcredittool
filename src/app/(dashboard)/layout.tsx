import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { hasSupabaseEnv } from "@/lib/env";
import { getProfile } from "@/lib/data/queries";
import { demoProfile } from "@/lib/data/demo";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children
}: {
  children: ReactNode;
}) {
  if (!hasSupabaseEnv()) {
    return <AppShell profile={demoProfile}>{children}</AppShell>;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const profile = user ? await getProfile(user.id) : demoProfile;

  return <AppShell profile={profile}>{children}</AppShell>;
}

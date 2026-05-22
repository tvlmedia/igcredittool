import { redirect } from "next/navigation";
import { AdminOverview } from "@/components/dashboard/admin-overview";
import { Panel } from "@/components/ui/panel";
import { getAdminProfiles, getDashboardData, getProfile } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(user.id);

  if (profile?.role !== "admin") {
    return (
      <Panel>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-iron-300/70">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Access restricted</h1>
        <p className="mt-3 text-white/54">
          This page is available to profiles with the admin role.
        </p>
      </Panel>
    );
  }

  const [profiles, data] = await Promise.all([getAdminProfiles(), getDashboardData()]);

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-iron-300/70">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">All ambassadors</h1>
      </div>
      <AdminOverview profiles={profiles} data={data} />
    </div>
  );
}

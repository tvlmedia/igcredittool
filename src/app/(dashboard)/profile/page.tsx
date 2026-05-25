import { redirect } from "next/navigation";
import { BadgeDollarSign, Camera, Globe2, MapPinned, Plane, ShoppingBag } from "lucide-react";
import { ProfileForm } from "@/components/profile/profile-form";
import { formatCurrency } from "@/lib/format";
import { getDashboardData, getOwnedLenses, getProfile } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";
import type { DashboardData } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, lenses, data] = await Promise.all([
    getProfile(user.id),
    getOwnedLenses(user.id),
    getDashboardData(user.id)
  ]);
  const stats = buildProfileStats(data);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-iron-300/70">
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Profile</h1>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-iron-400/25 bg-iron-400/10 text-iron-300">
          <Camera size={20} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-lg border border-white/10 bg-white/[0.055] p-4 shadow-panel"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-white/70">
                <Icon size={18} />
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/38">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
            </div>
          );
        })}
      </div>

      <ProfileForm profile={profile} lenses={lenses} fallbackEmail={user.email ?? null} />
    </div>
  );
}

function buildProfileStats(data: DashboardData) {
  const countriesVisited = new Set(
    data.transactions
      .map((transaction) => transaction.country?.trim())
      .filter((country): country is string => Boolean(country))
  );

  return [
    {
      label: "Transactions",
      value: String(data.transactions.length),
      icon: ShoppingBag
    },
    {
      label: "Total earned",
      value: formatCurrency(data.metrics.totalEarnedUsd, "USD"),
      icon: BadgeDollarSign
    },
    {
      label: "Countries",
      value: String(countriesVisited.size),
      icon: Globe2
    },
    {
      label: "Expos",
      value: String(data.transactions.filter((transaction) => transaction.type === "expo").length),
      icon: Plane
    },
    {
      label: "Sales",
      value: String(data.transactions.filter((transaction) => transaction.type === "sale").length),
      icon: MapPinned
    }
  ];
}

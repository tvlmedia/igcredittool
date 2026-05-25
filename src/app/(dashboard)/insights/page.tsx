import { redirect } from "next/navigation";
import { CreditCharts } from "@/components/charts/credit-charts";
import { InsightGrid } from "@/components/dashboard/insight-grid";
import { TripProfitability } from "@/components/dashboard/trip-profitability";
import { TravelMap, type TravelMapHomeBase } from "@/components/dashboard/travel-map";
import { EmptyState } from "@/components/dashboard/empty-state";
import { getDashboardData, getProfile } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [data, profile] = await Promise.all([getDashboardData(user.id), getProfile(user.id)]);
  const homeBase = buildHomeBase(profile);

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-iron-300/70">
          Attribution
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Insights</h1>
      </div>
      <InsightGrid data={data} />
      <TripProfitability data={data} />
      <TravelMap transactions={data.transactions} homeBase={homeBase} />
      {data.transactions.length > 0 ? <CreditCharts data={data} /> : <EmptyState />}
    </div>
  );
}

function buildHomeBase(profile: Profile | null): TravelMapHomeBase | null {
  const latitude = parseCoordinate(profile?.home_base_latitude);
  const longitude = parseCoordinate(profile?.home_base_longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    label:
      [profile?.home_base_city, profile?.home_base_country].filter(Boolean).join(", ") ||
      "Configured origin",
    latitude,
    longitude
  };
}

function parseCoordinate(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

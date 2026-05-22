import { CreditCharts } from "@/components/charts/credit-charts";
import { InsightGrid } from "@/components/dashboard/insight-grid";
import { getDashboardData } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const data = await getDashboardData(user?.id);

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-iron-300/70">
          Attribution
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Insights</h1>
      </div>
      <InsightGrid data={data} />
      <CreditCharts data={data} />
    </div>
  );
}

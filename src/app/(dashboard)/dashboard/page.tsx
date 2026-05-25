import { redirect } from "next/navigation";
import { BalanceHero } from "@/components/dashboard/balance-hero";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FxPreview } from "@/components/dashboard/fx-preview";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { CreditCharts } from "@/components/charts/credit-charts";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { Timeline } from "@/components/transactions/timeline";
import { getDashboardData } from "@/lib/data/queries";
import { getLiveEurUsdRate } from "@/lib/fx";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [data, liveFx] = await Promise.all([
    getDashboardData(user.id),
    getLiveEurUsdRate()
  ]);

  return (
    <div className="grid gap-5">
      <BalanceHero metrics={data.metrics} />
      <MetricGrid metrics={data.metrics} />
      <FxPreview metrics={data.metrics} fx={liveFx} />
      {data.transactions.length > 0 ? <CreditCharts data={data} /> : <EmptyState />}
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <TransactionForm sourceTransactions={data.sourceTransactions} />
        <Timeline transactions={data.transactions} compact />
      </div>
    </div>
  );
}

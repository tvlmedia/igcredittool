import { redirect } from "next/navigation";
import { BalanceHero } from "@/components/dashboard/balance-hero";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FxPreview } from "@/components/dashboard/fx-preview";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { UpcomingExpirations } from "@/components/dashboard/upcoming-expirations";
import { CreditCharts } from "@/components/charts/credit-charts";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { Timeline } from "@/components/transactions/timeline";
import { getDashboardData, getRecentActivity } from "@/lib/data/queries";
import { getLiveEurUsdRate } from "@/lib/fx";
import { createClient } from "@/lib/supabase/server";
import type { DashboardData } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [data, liveFx, activities] = await Promise.all([
    getDashboardData(user.id),
    getLiveEurUsdRate(),
    getRecentActivity(user.id)
  ]);
  const liveMetrics = getLiveFxMetrics(data, liveFx.rate);
  const liveData = { ...data, metrics: liveMetrics };

  return (
    <div className="grid gap-5">
      <BalanceHero metrics={liveMetrics} />
      <MetricGrid metrics={liveMetrics} />
      <FxPreview metrics={liveMetrics} fx={liveFx} />
      <UpcomingExpirations reminders={liveData.reminders} transactions={liveData.transactions} />
      <RecentActivity activities={activities} />
      {liveData.transactions.length > 0 ? <CreditCharts data={liveData} /> : <EmptyState />}
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <TransactionForm sourceTransactions={liveData.sourceTransactions} />
        <Timeline transactions={liveData.transactions} reminders={liveData.reminders} compact />
      </div>
    </div>
  );
}

function getLiveFxMetrics(data: DashboardData, eurUsdRate: number): DashboardData["metrics"] {
  const currentBalanceUsd = Math.round(
    data.metrics.eurReserve * eurUsdRate + data.metrics.usdReserve
  );
  const livePurchaseSpendUsd = data.purchaseDetails.reduce(
    (sum, purchase) =>
      sum +
      Number(purchase.usd_credit_used) +
      Number(purchase.eur_credit_converted) * eurUsdRate,
    0
  );
  const totalSpentUsd = Math.round(livePurchaseSpendUsd || data.metrics.totalSpentUsd);

  return {
    ...data.metrics,
    totalCreditUsd: currentBalanceUsd,
    totalEarnedUsd: currentBalanceUsd + totalSpentUsd,
    totalSpentUsd,
    currentBalanceUsd
  };
}

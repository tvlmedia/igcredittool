import { BalanceHero } from "@/components/dashboard/balance-hero";
import { EmptyState } from "@/components/dashboard/empty-state";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { CreditCharts } from "@/components/charts/credit-charts";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { Timeline } from "@/components/transactions/timeline";
import { getDashboardData } from "@/lib/data/queries";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="grid gap-5">
      <BalanceHero metrics={data.metrics} />
      <MetricGrid metrics={data.metrics} />
      {data.transactions.length > 0 ? <CreditCharts data={data} /> : <EmptyState />}
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <TransactionForm sourceTransactions={data.sourceTransactions} />
        <Timeline transactions={data.transactions} compact />
      </div>
    </div>
  );
}

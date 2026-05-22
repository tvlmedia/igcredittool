import { ExportButtons } from "@/components/transactions/export-buttons";
import { ReminderPanel } from "@/components/transactions/reminder-panel";
import { Timeline } from "@/components/transactions/timeline";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { getDashboardData } from "@/lib/data/queries";

export default async function TransactionsPage() {
  const data = await getDashboardData();

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-iron-300/70">
            Control room
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Transactions</h1>
        </div>
        <ExportButtons transactions={data.transactions} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.72fr]">
        <TransactionForm sourceTransactions={data.sourceTransactions} />
        <ReminderPanel reminders={data.reminders} />
      </div>

      <Timeline transactions={data.transactions} />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ExportButtons } from "@/components/transactions/export-buttons";
import { ReminderPanel } from "@/components/transactions/reminder-panel";
import { Timeline } from "@/components/transactions/timeline";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { getDashboardData } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getDashboardData(user.id);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-iron-300/70">
            Control room
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Transactions</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/transactions/deleted"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-iron-400/18 bg-white/[0.045] px-4 py-2 text-sm font-semibold text-white/86 transition hover:border-iron-400/34 hover:bg-iron-400/[0.08] hover:text-white"
          >
            <Trash2 size={16} />
            Deleted transactions
          </Link>
          <ExportButtons transactions={data.transactions} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.72fr]">
        <TransactionForm sourceTransactions={data.sourceTransactions} />
        <ReminderPanel reminders={data.reminders} />
      </div>

      <Timeline transactions={data.transactions} reminders={data.reminders} />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Timeline } from "@/components/transactions/timeline";
import { getDeletedTransactions } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DeletedTransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const transactions = await getDeletedTransactions(user.id);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-iron-300/70">
            Recovery
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Deleted transactions</h1>
        </div>
        <Link
          href="/transactions"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
        >
          <ArrowLeft size={16} />
          Transactions
        </Link>
      </div>

      <Timeline transactions={transactions} mode="deleted" />
    </div>
  );
}

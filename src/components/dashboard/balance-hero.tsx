import { ArrowUpRight, BadgeDollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { formatCurrency } from "@/lib/format";
import type { DashboardData } from "@/lib/types/domain";

export function BalanceHero({ metrics }: { metrics: DashboardData["metrics"] }) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="relative z-[1] grid gap-6 bg-gradient-to-br from-iron-500/[0.085] via-transparent to-black/10 p-6 md:grid-cols-[1.35fr_1fr] md:p-8">
        <div>
          <Badge className="border-iron-400/25 bg-iron-400/10 text-iron-300">
            <BadgeDollarSign size={14} />
            Total Credit
          </Badge>
          <p className="mt-5 text-5xl font-semibold leading-none text-white drop-shadow-[0_12px_36px_rgba(230,132,46,0.12)] sm:text-6xl lg:text-7xl">
            {formatCurrency(metrics.totalCreditUsd, "USD")}
          </p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/54">
            Live USD-equivalent balance. EUR positions keep their original currency
            and are valued with the current dashboard rate.
          </p>
        </div>

        <div className="grid content-end gap-3">
          <ReserveLine label="Total earned" value={metrics.totalEarnedUsd} tone="positive" />
          <ReserveLine label="Total spent" value={metrics.totalSpentUsd} tone="negative" />
          <ReserveLine label="Current balance" value={metrics.currentBalanceUsd} tone="neutral" />
        </div>
      </div>
    </Panel>
  );
}

function ReserveLine({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "positive" | "negative" | "neutral";
}) {
  const color =
    tone === "positive"
      ? "text-volt-400"
      : tone === "negative"
        ? "text-red-200"
        : "text-iron-300";

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-iron-400/12 bg-black/24 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">{label}</span>
      <span className={`inline-flex items-center gap-2 text-lg font-semibold ${color}`}>
        {tone === "positive" ? <ArrowUpRight size={16} /> : null}
        {formatCurrency(value, "USD")}
      </span>
    </div>
  );
}

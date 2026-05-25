import { CircleDollarSign, Landmark, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { DashboardData } from "@/lib/types/domain";

export function MetricGrid({ metrics }: { metrics: DashboardData["metrics"] }) {
  const items = [
    {
      label: "Total earned",
      value: formatCurrency(metrics.totalEarnedUsd, "USD"),
      icon: TrendingUp,
      accent: "text-volt-400"
    },
    {
      label: "Total spent",
      value: formatCurrency(metrics.totalSpentUsd, "USD"),
      icon: TrendingDown,
      accent: "text-red-200"
    },
    {
      label: "Current balance",
      value: formatCurrency(metrics.currentBalanceUsd, "USD"),
      icon: Wallet,
      accent: "text-iron-300"
    },
    {
      label: "EUR reserve",
      value: formatCurrency(metrics.eurReserve, "EUR"),
      icon: Landmark,
      accent: "text-white"
    },
    {
      label: "USD reserve",
      value: formatCurrency(metrics.usdReserve, "USD"),
      icon: CircleDollarSign,
      accent: "text-white"
    }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="rounded-lg border border-iron-400/12 bg-gradient-to-b from-white/[0.05] to-black/18 p-4 shadow-panel"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-iron-400/18 bg-iron-400/[0.07] text-iron-300">
              <Icon size={18} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/36">{item.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${item.accent}`}>{item.value}</p>
          </div>
        );
      })}
    </div>
  );
}

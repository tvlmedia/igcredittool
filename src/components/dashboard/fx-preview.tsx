import { Activity, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { LiveFxRate } from "@/lib/fx";
import type { DashboardData } from "@/lib/types/domain";

export function FxPreview({
  metrics,
  fx
}: {
  metrics: DashboardData["metrics"];
  fx: LiveFxRate;
}) {
  const eurReserveUsd = metrics.eurReserve * fx.rate;
  const totalUsdEquivalent = eurReserveUsd + metrics.usdReserve;

  const rows = [
    {
      label: "EUR reserve",
      value: formatCurrency(metrics.eurReserve, "EUR")
    },
    {
      label: "Live EUR/USD rate",
      value: `1 EUR = $${fx.rate.toFixed(4)}`
    },
    {
      label: "EUR reserve in USD",
      value: formatCurrency(eurReserveUsd, "USD")
    },
    {
      label: "USD reserve",
      value: formatCurrency(metrics.usdReserve, "USD")
    }
  ];

  return (
    <section className="rounded-lg border border-iron-400/16 bg-gradient-to-br from-iron-500/[0.08] via-white/[0.035] to-black/24 p-4 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-iron-300/70">
            Live FX Preview
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Reserve conversion</h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-iron-400/22 bg-iron-400/[0.08] text-iron-300">
          <Activity size={18} />
        </div>
      </div>

      <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="rounded-md border border-white/10 bg-black/18 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/36">
              {row.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{row.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-iron-400/16 bg-black/24 px-3 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/36">
            Total USD equivalent
          </p>
          <p className="mt-1 text-2xl font-semibold text-iron-300">
            {formatCurrency(totalUsdEquivalent, "USD")}
          </p>
        </div>
        {fx.usingFallback ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-iron-400/20 bg-iron-400/[0.08] px-3 py-1 text-xs font-semibold text-iron-300">
            <AlertTriangle size={14} />
            Using fallback rate
          </span>
        ) : null}
      </div>
    </section>
  );
}

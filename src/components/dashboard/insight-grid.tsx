import { Award, Route, Sparkles, TrendingUp } from "lucide-react";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { DashboardData } from "@/lib/types/domain";
import { transactionTypeLabels } from "@/lib/types/domain";

export function InsightGrid({ data }: { data: DashboardData }) {
  const insights = [
    {
      label: "Best expo",
      value: data.insights.topExpo?.name ?? "No data",
      detail: data.insights.topExpo
        ? formatCurrency(data.insights.topExpo.salesUsd, "USD")
        : "Linked sales",
      icon: Award
    },
    {
      label: "Best rental tour",
      value: data.insights.topRentalTour?.name ?? "No data",
      detail: data.insights.topRentalTour
        ? formatCurrency(data.insights.topRentalTour.salesUsd, "USD")
        : "Linked sales",
      icon: Route
    },
    {
      label: "Average ROI",
      value: formatPercent(data.insights.averageRoi),
      detail: "Across trips with costs",
      icon: TrendingUp
    },
    {
      label: "Biggest income source",
      value: data.insights.biggestIncomeType
        ? transactionTypeLabels[data.insights.biggestIncomeType]
        : "No data",
      detail: "By USD equivalent",
      icon: Sparkles
    },
    {
      label: "Annual growth",
      value: formatPercent(data.insights.yearlyGrowth),
      detail: "Current year vs previous",
      icon: TrendingUp
    },
    {
      label: "Most valuable source",
      value: data.insights.mostValuableSource?.name ?? "No data",
      detail: data.insights.mostValuableSource
        ? formatCurrency(data.insights.mostValuableSource.salesUsd, "USD")
        : "Linked sales",
      icon: Award
    }
  ];

  return (
    <Panel>
      <SectionHeader eyebrow="Insights" title="Automatic analysis" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <div
              key={insight.label}
              className="rounded-lg border border-iron-400/12 bg-gradient-to-b from-white/[0.045] to-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-iron-400/24 bg-iron-400/10 text-iron-300">
                <Icon size={18} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/36">
                {insight.label}
              </p>
              <p className="mt-2 truncate text-xl font-semibold text-white">{insight.value}</p>
              <p className="mt-1 text-sm text-white/48">{insight.detail}</p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

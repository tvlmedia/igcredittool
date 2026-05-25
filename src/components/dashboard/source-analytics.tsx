import { Aperture, Building2, Globe2, MapPin, Tags, Trophy } from "lucide-react";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { formatCurrency } from "@/lib/format";
import type { DashboardData, OwnedLens } from "@/lib/types/domain";
import { transactionTypeLabels } from "@/lib/types/domain";

type AnalyticsItem = {
  label: string;
  value: number;
  detail?: string;
};

export function SourceAnalytics({
  data,
  lenses
}: {
  data: DashboardData;
  lenses: OwnedLens[];
}) {
  const countries = topItems(groupTransactions(data, (transaction) => transaction.country));
  const cities = topItems(
    groupTransactions(data, (transaction) =>
      [transaction.city, transaction.country].filter(Boolean).join(", ")
    )
  );
  const types = topItems(
    groupTransactions(data, (transaction) => transactionTypeLabels[transaction.type])
  );
  const expos = topItems(
    groupTransactions(data, (transaction) =>
      transaction.type === "expo" ? transaction.title : null
    )
  );
  const tags = topItems(groupTags(data));
  const lensBrands = topItems(groupLenses(lenses), "count");
  const bestLocation = [...cities].sort((a, b) => b.value - a.value)[0] ?? null;

  const sections = [
    {
      title: "Top countries",
      icon: Globe2,
      items: countries
    },
    {
      title: "Top cities",
      icon: MapPin,
      items: cities
    },
    {
      title: "Top transaction types",
      icon: Building2,
      items: types
    },
    {
      title: "Top expos",
      icon: Trophy,
      items: expos
    },
    {
      title: lensBrands.length > 0 ? "Lens brands" : "Top tags",
      icon: lensBrands.length > 0 ? Aperture : Tags,
      items: lensBrands.length > 0 ? lensBrands : tags
    },
    {
      title: "Best location",
      icon: Trophy,
      items: bestLocation ? [bestLocation] : []
    }
  ];

  return (
    <Panel>
      <SectionHeader eyebrow="Source analytics" title="Where your credit came from" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const maxValue = Math.max(...section.items.map((item) => item.value), 1);

          return (
            <div
              key={section.title}
              className="rounded-lg border border-iron-400/12 bg-gradient-to-b from-white/[0.045] to-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-iron-400/24 bg-iron-400/10 text-iron-300">
                  <Icon size={18} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
                  {section.title}
                </p>
              </div>

              <div className="grid gap-3">
                {section.items.slice(0, 4).map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-semibold text-white">{item.label}</span>
                      <span className="text-white/58">
                        {item.detail ?? formatCurrency(item.value, "USD")}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-iron-500 to-iron-300"
                        style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}

                {section.items.length === 0 ? (
                  <p className="text-sm text-white/48">No source data yet.</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function groupTransactions(
  data: DashboardData,
  getLabel: (transaction: DashboardData["transactions"][number]) => string | null | undefined
) {
  return data.transactions.reduce<Record<string, number>>((acc, transaction) => {
    const label = getLabel(transaction)?.trim();
    if (!label) {
      return acc;
    }

    acc[label] = (acc[label] ?? 0) + transactionValue(transaction);
    return acc;
  }, {});
}

function groupTags(data: DashboardData) {
  return data.transactions.reduce<Record<string, number>>((acc, transaction) => {
    for (const tag of transaction.tags) {
      acc[tag.name] = (acc[tag.name] ?? 0) + transactionValue(transaction);
    }

    return acc;
  }, {});
}

function groupLenses(lenses: OwnedLens[]) {
  return lenses.reduce<Record<string, number>>((acc, lens) => {
    const brand = lens.brand.trim();
    if (!brand) {
      return acc;
    }

    acc[brand] = (acc[brand] ?? 0) + 1;
    return acc;
  }, {});
}

function topItems(grouped: Record<string, number>, unit: "currency" | "count" = "currency"): AnalyticsItem[] {
  return Object.entries(grouped)
    .map(([label, value]) => ({
      label,
      value,
      detail: unit === "count" ? `${value}` : undefined
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function transactionValue(transaction: DashboardData["transactions"][number]) {
  return Math.abs(Number(transaction.converted_amount_usd ?? transaction.original_amount));
}

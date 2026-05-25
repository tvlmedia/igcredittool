import { ArrowDownRight, Award, BadgeDollarSign, Route, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { DashboardData, TimelineEvent } from "@/lib/types/domain";
import { transactionTypeColors, transactionTypeLabels } from "@/lib/types/domain";

type TripRow = {
  id: string;
  name: string;
  type: "expo" | "rental_tour";
  creditEarnedUsd: number;
  linkedSalesUsd: number;
  expensesUsd: number;
  netValueUsd: number;
  roi: number;
};

export function TripProfitability({ data }: { data: DashboardData }) {
  const rows = buildTripRows(data);
  const bestExpo = getBestByType(rows, "expo");
  const bestRentalTour = getBestByType(rows, "rental_tour");
  const worstRoi = [...rows].sort((a, b) => a.roi - b.roi)[0] ?? null;
  const bestLinkedSale = getBestLinkedSale(data);

  const highlights = [
    {
      label: "Most profitable expo",
      value: bestExpo?.name ?? "No data",
      detail: bestExpo ? formatCurrency(bestExpo.netValueUsd, "USD") : "Net value",
      icon: Award
    },
    {
      label: "Most profitable rental tour",
      value: bestRentalTour?.name ?? "No data",
      detail: bestRentalTour ? formatCurrency(bestRentalTour.netValueUsd, "USD") : "Net value",
      icon: Route
    },
    {
      label: "Worst ROI trip",
      value: worstRoi?.name ?? "No data",
      detail: worstRoi ? formatPercent(worstRoi.roi) : "ROI",
      icon: ArrowDownRight
    },
    {
      label: "Best linked sale",
      value: bestLinkedSale?.transaction.title ?? "No data",
      detail: bestLinkedSale
        ? `${formatCurrency(bestLinkedSale.amountUsd, "USD")} from ${bestLinkedSale.source?.title ?? "source"}`
        : "Linked sale",
      icon: BadgeDollarSign
    }
  ];

  return (
    <Panel>
      <SectionHeader eyebrow="Trip performance" title="Expo & rental tour profitability" />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {highlights.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-lg border border-iron-400/12 bg-gradient-to-b from-white/[0.045] to-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-iron-400/24 bg-iron-400/10 text-iron-300">
                <Icon size={18} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/36">
                {item.label}
              </p>
              <p className="mt-2 truncate text-lg font-semibold text-white">{item.value}</p>
              <p className="mt-1 text-sm text-white/48">{item.detail}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3">
        {rows.map((row) => {
          const color = transactionTypeColors[row.type];

          return (
            <div
              key={row.id}
              className="grid gap-4 rounded-lg border border-white/10 bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] lg:grid-cols-[1.2fr_repeat(5,minmax(0,1fr))]"
              style={{ borderLeft: `2px solid ${color.core}` }}
            >
              <div>
                <Badge
                  style={{
                    borderColor: color.border,
                    backgroundColor: color.background,
                    color: color.text
                  }}
                >
                  {transactionTypeLabels[row.type]}
                </Badge>
                <p className="mt-2 font-semibold text-white">{row.name}</p>
              </div>
              <Metric label="Credit earned" value={formatCurrency(row.creditEarnedUsd, "USD")} />
              <Metric label="Linked sales" value={formatCurrency(row.linkedSalesUsd, "USD")} />
              <Metric label="Expenses" value={formatCurrency(row.expensesUsd, "USD")} />
              <Metric label="Net value" value={formatCurrency(row.netValueUsd, "USD")} />
              <Metric label="ROI" value={formatPercent(row.roi)} icon={<TrendingUp size={14} />} />
            </div>
          );
        })}

        {rows.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 text-sm text-white/48">
            Add expo or rental tour transactions to unlock trip profitability.
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/36">
        {label}
      </p>
      <p className="mt-1 inline-flex items-center gap-1.5 font-semibold text-white">
        {icon}
        {value}
      </p>
    </div>
  );
}

function buildTripRows(data: DashboardData): TripRow[] {
  const transactionsById = new Map(data.transactions.map((transaction) => [transaction.id, transaction]));

  return data.profitability.map((item) => {
    const transaction = transactionsById.get(item.id);
    const creditEarnedUsd = Number(transaction?.converted_amount_usd ?? transaction?.original_amount ?? 0);
    const netValueUsd = creditEarnedUsd + item.salesUsd - item.costUsd;

    return {
      id: item.id,
      name: item.name,
      type: item.type,
      creditEarnedUsd,
      linkedSalesUsd: item.salesUsd,
      expensesUsd: item.costUsd,
      netValueUsd,
      roi: item.roi
    };
  });
}

function getBestByType(rows: TripRow[], type: TripRow["type"]) {
  return rows
    .filter((row) => row.type === type)
    .sort((a, b) => b.netValueUsd - a.netValueUsd)[0] ?? null;
}

function getBestLinkedSale(data: DashboardData) {
  const transactionsById = new Map(data.transactions.map((transaction) => [transaction.id, transaction]));
  const linkedSales = data.saleDetails
    .map((sale) => {
      const transaction = transactionsById.get(sale.transaction_id);
      const source = sale.linked_source_transaction_id
        ? transactionsById.get(sale.linked_source_transaction_id) ?? null
        : null;

      if (!transaction || !source) {
        return null;
      }

      return {
        transaction,
        source,
        amountUsd: Number(transaction.converted_amount_usd ?? transaction.original_amount)
      };
    })
    .filter((item): item is { transaction: TimelineEvent; source: TimelineEvent; amountUsd: number } =>
      Boolean(item)
    );

  return linkedSales.sort((a, b) => b.amountUsd - a.amountUsd)[0] ?? null;
}

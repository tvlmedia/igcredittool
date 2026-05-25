"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";
import type { DashboardData } from "@/lib/types/domain";
import { transactionTypeColors, transactionTypeLabels } from "@/lib/types/domain";

export function CreditCharts({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
      <Panel>
        <SectionHeader eyebrow="Trajectory" title="Credit growth" />
        <div className="h-[330px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.growth} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="rgba(230,132,46,0.08)" vertical={false} />
              <XAxis dataKey="date" stroke="rgba(255,248,236,0.42)" tickLine={false} />
              <YAxis
                stroke="rgba(255,248,236,0.42)"
                tickFormatter={(value) => formatCompactCurrency(Number(value), "USD")}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="earned"
                name="Total earned"
                stroke="#77f2d5"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="balance"
                name="Current balance"
                stroke="#e1b45f"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Allocation" title="Breakdown by type" />
        <div className="h-[330px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.breakdown}>
              <CartesianGrid stroke="rgba(230,132,46,0.08)" vertical={false} />
              <XAxis
                dataKey="type"
                stroke="rgba(255,248,236,0.42)"
                tickFormatter={(value) => transactionTypeLabels[value as keyof typeof transactionTypeLabels]}
                tickLine={false}
              />
              <YAxis
                stroke="rgba(255,248,236,0.42)"
                tickFormatter={(value) => formatCompactCurrency(Number(value), "USD")}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" fillOpacity={0.88} radius={[5, 5, 0, 0]}>
                {data.breakdown.map((item) => (
                  <Cell key={item.type} fill={transactionTypeColors[item.type].core} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {data.breakdown.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.breakdown.map((item) => {
              const color = transactionTypeColors[item.type];

              return (
                <span
                  key={item.type}
                  className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium"
                  style={{
                    borderColor: color.border,
                    backgroundColor: color.background,
                    color: color.text
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color.core }} />
                  {transactionTypeLabels[item.type]}
                </span>
              );
            })}
          </div>
        ) : null}
      </Panel>

      <Panel className="xl:col-span-2">
        <SectionHeader eyebrow="Attribution" title="Trip profitability" />
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.profitability}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#77f2d5" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#77f2d5" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(230,132,46,0.08)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,248,236,0.42)" tickLine={false} />
              <YAxis
                stroke="rgba(255,248,236,0.42)"
                tickFormatter={(value) => formatCompactCurrency(Number(value), "USD")}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ProfitTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="costUsd"
                name="Cost"
                stroke="#f87171"
                fill="url(#costGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="salesUsd"
                name="Linked sales"
                stroke="#77f2d5"
                fill="url(#salesGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border border-iron-400/18 bg-carbon-900/95 p-3 text-sm shadow-panel">
      <p className="mb-2 font-semibold text-white">
        {typeof label === "string" && label in transactionTypeLabels
          ? transactionTypeLabels[label as keyof typeof transactionTypeLabels]
          : label}
      </p>
      {payload.map((item) => (
        <p key={item.name} className="text-white/68">
          {item.name}: <span className="text-white">{formatCurrency(Number(item.value), "USD")}</span>
        </p>
      ))}
    </div>
  );
}

function ProfitTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0]?.payload as { roi?: number } | undefined;

  return (
    <div className="rounded-md border border-iron-400/18 bg-carbon-900/95 p-3 text-sm shadow-panel">
      <p className="mb-2 font-semibold text-white">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="text-white/68">
          {item.name}: <span className="text-white">{formatCurrency(Number(item.value), "USD")}</span>
        </p>
      ))}
      <p className="mt-2 text-iron-300">ROI {formatPercent(data?.roi ?? 0)}</p>
    </div>
  );
}

type TooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{
    name?: string;
    value?: number | string;
    payload?: unknown;
  }>;
};

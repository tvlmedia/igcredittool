"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Download, Eye, Mail, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { resendMonthlyReportEmail, type ManualReportActionState } from "@/lib/actions/reports";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CreditSnapshot } from "@/lib/types/domain";

const initialState: ManualReportActionState = {
  status: "idle",
  message: ""
};

export function BackupReportsClient({ snapshots }: { snapshots: CreditSnapshot[] }) {
  const [selectedId, setSelectedId] = useState(snapshots[0]?.id ?? "");
  const selected = useMemo(
    () => snapshots.find((snapshot) => snapshot.id === selectedId) ?? snapshots[0] ?? null,
    [selectedId, snapshots]
  );
  const [state, resendAction, pending] = useActionState(resendMonthlyReportEmail, initialState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
    }

    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  if (snapshots.length === 0) {
    return (
      <Panel>
        <SectionHeader eyebrow="Backup" title="Monthly snapshots" />
        <div className="rounded-lg border border-white/10 bg-black/18 p-6 text-sm leading-6 text-white/52">
          No monthly snapshots yet. Generate one from Dashboard or Profile to create the first
          backup record.
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel>
        <SectionHeader
          eyebrow="Archive"
          title="Monthly snapshots"
          action={<span className="text-sm text-white/45">{snapshots.length} reports</span>}
        />
        <div className="grid gap-3">
          {snapshots.map((snapshot) => {
            const active = selected?.id === snapshot.id;

            return (
              <button
                key={snapshot.id}
                type="button"
                onClick={() => setSelectedId(snapshot.id)}
                className={`rounded-lg border p-4 text-left transition ${
                  active
                    ? "border-iron-400/32 bg-iron-400/[0.08] shadow-glow"
                    : "border-white/10 bg-black/18 hover:border-iron-400/22 hover:bg-white/[0.045]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {formatSnapshotTitle(snapshot)}
                    </p>
                    <p className="mt-1 text-xs text-white/42">
                      {formatDate(snapshot.period_start)} - {formatDate(snapshot.period_end)}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-iron-300">
                    {formatCurrency(Number(snapshot.total_usd_equivalent), "USD")}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-white/50">
                  <span>{snapshot.transaction_count} tx</span>
                  <span>{snapshot.countries_visited} countries</span>
                  <span>{snapshot.emailed_at ? "Emailed" : "Not emailed"}</span>
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      {selected ? (
        <Panel>
          <SectionHeader
            eyebrow="Report"
            title={formatSnapshotTitle(selected)}
            action={<Eye size={18} className="text-iron-300" />}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Total credit" value={formatCurrency(Number(selected.total_usd_equivalent), "USD")} />
            <Metric label="EUR reserve" value={formatCurrency(Number(selected.eur_reserve), "EUR")} />
            <Metric label="USD reserve" value={formatCurrency(Number(selected.usd_reserve), "USD")} />
            <Metric label="FX rate" value={`1 EUR = $${Number(selected.live_eur_usd_rate).toFixed(4)}`} />
            <Metric label="Total earned" value={formatCurrency(Number(selected.total_earned), "USD")} />
            <Metric label="Total spent" value={formatCurrency(Number(selected.total_spent), "USD")} />
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-black/18 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
              Snapshot details
            </p>
            <div className="mt-3 grid gap-2 text-sm text-white/60 sm:grid-cols-2">
              <span>Transactions: {selected.transaction_count}</span>
              <span>Countries visited: {selected.countries_visited}</span>
              <span>Cities visited: {selected.cities_visited}</span>
              <span>
                Emailed:{" "}
                {selected.emailed_at ? new Date(selected.emailed_at).toLocaleString() : "Not yet"}
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              icon={<Download size={16} />}
              onClick={() => downloadJson(selected)}
            >
              Download JSON
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={<Download size={16} />}
              onClick={() => downloadCsv(selected)}
            >
              Download CSV
            </Button>
            <form action={resendAction}>
              <input type="hidden" name="snapshotId" value={selected.id} />
              <Button type="submit" disabled={pending} icon={<Mail size={16} />}>
                {pending ? "Sending..." : "Resend email"}
              </Button>
            </form>
            <Button
              type="button"
              variant="ghost"
              icon={<RotateCcw size={16} />}
              onClick={() => setSelectedId(snapshots[0]?.id ?? "")}
            >
              Latest
            </Button>
          </div>
          <ReportStatus state={state} />
        </Panel>
      ) : null}
    </div>
  );
}

function ReportStatus({ state }: { state: ManualReportActionState }) {
  if (state.status === "idle") {
    return null;
  }

  const tone =
    state.status === "error"
      ? "border-red-300/20 bg-red-500/[0.08] text-red-100/82"
      : "border-volt-300/20 bg-volt-400/[0.08] text-volt-100/82";

  return (
    <div className={`mt-4 rounded-md border px-3 py-2 text-sm leading-5 ${tone}`}>
      {state.message}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/36">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function formatSnapshotTitle(snapshot: CreditSnapshot) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${snapshot.period_start}T00:00:00Z`));
}

function downloadJson(snapshot: CreditSnapshot) {
  downloadFile(
    `${snapshot.year}-${String(snapshot.month).padStart(2, "0")}-ironglass-report.json`,
    JSON.stringify(snapshot, null, 2),
    "application/json"
  );
}

function downloadCsv(snapshot: CreditSnapshot) {
  const rows = getTransactionRows(snapshot);
  const header = ["date", "title", "type", "city", "country", "currency", "original_amount", "usd_equivalent"];
  const body = rows.map((row) =>
    header
      .map((key) => csvCell(row[key as keyof StoredTransactionRow]))
      .join(",")
  );

  downloadFile(
    `${snapshot.year}-${String(snapshot.month).padStart(2, "0")}-ironglass-transactions.csv`,
    [header.join(","), ...body].join("\n"),
    "text/csv"
  );
}

function downloadFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

type StoredTransactionRow = {
  date?: unknown;
  title?: unknown;
  type?: unknown;
  city?: unknown;
  country?: unknown;
  currency?: unknown;
  originalAmount?: unknown;
  usdEquivalent?: unknown;
};

function getTransactionRows(snapshot: CreditSnapshot): StoredTransactionRow[] {
  const data = snapshot.report_data as { transactions?: unknown };
  return Array.isArray(data.transactions) ? (data.transactions as StoredTransactionRow[]) : [];
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

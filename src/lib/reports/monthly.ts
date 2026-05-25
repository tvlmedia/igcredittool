import {
  buildLiveFxMetrics,
  calculateTransactionBreakdown,
  type TransactionCalculationBreakdown
} from "@/lib/calculations";
import { getDashboardData, getDeletedTransactions, getProfile } from "@/lib/data/queries";
import { getLiveEurUsdRate, type LiveFxRate } from "@/lib/fx";
import { createClient } from "@/lib/supabase/server";
import type { CreditSnapshot, DashboardData, TimelineEvent } from "@/lib/types/domain";
import { transactionTypeLabels } from "@/lib/types/domain";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ReportPeriod = {
  start: string;
  end: string;
};

export type MonthlyCreditReport = {
  userId: string;
  month: number;
  year: number;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  title: string;
  profile: {
    name: string | null;
    email: string | null;
    company: string | null;
  };
  openingBalanceUsd: number | null;
  closingBalanceUsd: number;
  eurReserve: number;
  usdReserve: number;
  liveEurUsdRate: number;
  usingFallbackFx: boolean;
  totalUsdEquivalent: number;
  totalEarned: number;
  totalSpent: number;
  creditsEarnedThisMonth: number;
  expensesThisMonth: number;
  transactionCount: number;
  countriesVisited: number;
  citiesVisited: number;
  upcomingExpirations: Array<{
    title: string;
    dueDate: string;
    transactionTitle: string | null;
    daysUntil: number;
  }>;
  topTransactions: Array<ReportTransaction>;
  topCountries: Array<{ label: string; value: number }>;
  topCities: Array<{ label: string; value: number }>;
  profitability: DashboardData["profitability"];
  activitySummary: {
    deleted: number;
    restored: number;
    events: Array<{ action: string; label: string | null; createdAt: string }>;
  };
  transactions: ReportTransaction[];
  calculationBreakdowns: Array<ReportCalculationBreakdown>;
  snapshot: Omit<CreditSnapshot, "id" | "created_at" | "emailed_at">;
};

export type ReportTransaction = {
  id: string;
  date: string;
  title: string;
  type: string;
  city: string | null;
  country: string | null;
  currency: string;
  originalAmount: number;
  usdEquivalent: number;
};

export type ReportCalculationBreakdown = {
  transactionId: string;
  title: string;
  type: string;
  originalAmount: number;
  currency: string;
  exchangeRateSnapshot: number | null;
  grossCredit: TransactionCalculationBreakdown["grossCredit"];
  expenses: TransactionCalculationBreakdown["expenses"];
  multiplier: number;
  finalCreditEarned: TransactionCalculationBreakdown["finalCreditEarned"];
  usdEquivalent: number;
  eurReserveImpact: number;
  usdReserveImpact: number;
};

export async function generateMonthlyCreditReport(input: {
  userId: string;
  period?: ReportPeriod;
  fx?: LiveFxRate;
  client?: SupabaseClient;
}): Promise<MonthlyCreditReport> {
  const period = input.period ?? getPreviousMonthPeriod();
  const [data, profile, deletedTransactions, fx] = await Promise.all([
    getDashboardData(input.userId, input.client),
    getProfile(input.userId, input.client),
    getDeletedTransactions(input.userId, input.client),
    input.fx ? Promise.resolve(input.fx) : getLiveEurUsdRate()
  ]);
  const liveMetrics = buildLiveFxMetrics(data, fx.rate);
  const monthTransactions = data.transactions.filter((transaction) =>
    isWithinPeriod(transaction.date, period)
  );
  const calculations = buildCalculationMap(data, fx.rate);
  const monthCalculations = monthTransactions.map((transaction) => ({
    transaction,
    calculation: calculations.get(transaction.id)
  }));
  const countries = uniqueValues(monthTransactions.map((transaction) => transaction.country));
  const cities = uniqueValues(monthTransactions.map((transaction) => transaction.city));
  const openingSnapshot = await getOpeningSnapshot(input.userId, period.start, input.client);
  const activitySummary = await getActivitySummary(input.userId, period, input.client);
  const creditsEarnedThisMonth = monthCalculations.reduce(
    (sum, item) => sum + Math.max(item.calculation?.usdEquivalent ?? 0, 0),
    0
  );
  const expensesThisMonth = monthCalculations.reduce(
    (sum, item) => sum + Math.abs(Math.min(item.calculation?.usdEquivalent ?? 0, 0)),
    0
  );
  const topTransactions = monthCalculations
    .map(({ transaction, calculation }) => toReportTransaction(transaction, calculation))
    .sort((a, b) => Math.abs(b.usdEquivalent) - Math.abs(a.usdEquivalent))
    .slice(0, 8);
  const transactions = monthCalculations
    .map(({ transaction, calculation }) => toReportTransaction(transaction, calculation))
    .sort((a, b) => a.date.localeCompare(b.date));
  const reportMonth = new Date(`${period.start}T00:00:00`);
  const month = reportMonth.getUTCMonth() + 1;
  const year = reportMonth.getUTCFullYear();
  const reportDataBase = {
    period,
    profile: {
      name: profile?.full_name ?? null,
      email: profile?.email ?? null,
      company: profile?.company ?? null
    },
    metrics: liveMetrics,
    creditsEarnedThisMonth,
    expensesThisMonth,
    transactions,
    topTransactions,
    topCountries: topBuckets(monthTransactions, calculations, (transaction) => transaction.country),
    topCities: topBuckets(monthTransactions, calculations, (transaction) =>
      [transaction.city, transaction.country].filter(Boolean).join(", ")
    ),
    upcomingExpirations: buildUpcomingExpirations(data),
    profitability: data.profitability,
    deletedTransactions: deletedTransactions
      .filter((transaction) => transaction.deleted_at && isWithinPeriod(transaction.deleted_at.slice(0, 10), period))
      .map((transaction) => ({
        id: transaction.id,
        title: transaction.title,
        deletedAt: transaction.deleted_at
      })),
    activitySummary
  };
  const snapshot = {
    user_id: input.userId,
    month,
    year,
    period_start: period.start,
    period_end: period.end,
    eur_reserve: liveMetrics.eurReserve,
    usd_reserve: liveMetrics.usdReserve,
    live_eur_usd_rate: fx.rate,
    total_usd_equivalent: liveMetrics.currentBalanceUsd,
    total_earned: liveMetrics.totalEarnedUsd,
    total_spent: liveMetrics.totalSpentUsd,
    transaction_count: monthTransactions.length,
    countries_visited: countries.length,
    cities_visited: cities.length,
    report_data: reportDataBase
  };

  return {
    userId: input.userId,
    month,
    year,
    periodStart: period.start,
    periodEnd: period.end,
    generatedAt: new Date().toISOString(),
    title: `IronGlass Credit Report - ${formatReportMonth(period.start)}`,
    profile: reportDataBase.profile,
    openingBalanceUsd: openingSnapshot?.total_usd_equivalent ?? null,
    closingBalanceUsd: liveMetrics.currentBalanceUsd,
    eurReserve: liveMetrics.eurReserve,
    usdReserve: liveMetrics.usdReserve,
    liveEurUsdRate: fx.rate,
    usingFallbackFx: fx.usingFallback,
    totalUsdEquivalent: liveMetrics.currentBalanceUsd,
    totalEarned: liveMetrics.totalEarnedUsd,
    totalSpent: liveMetrics.totalSpentUsd,
    creditsEarnedThisMonth,
    expensesThisMonth,
    transactionCount: monthTransactions.length,
    countriesVisited: countries.length,
    citiesVisited: cities.length,
    upcomingExpirations: reportDataBase.upcomingExpirations,
    topTransactions,
    topCountries: reportDataBase.topCountries,
    topCities: reportDataBase.topCities,
    profitability: data.profitability,
    activitySummary,
    transactions,
    calculationBreakdowns: monthCalculations.map(({ transaction, calculation }) =>
      toReportCalculation(transaction, calculation)
    ),
    snapshot
  };
}

export function getPreviousMonthPeriod(reference = new Date()): ReportPeriod {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 0));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

export function getCurrentMonthPeriod(reference = new Date()): ReportPeriod {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));

  return {
    start: start.toISOString().slice(0, 10),
    end: reference.toISOString().slice(0, 10)
  };
}

export function formatReportMonth(periodStart: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${periodStart}T00:00:00Z`));
}

export async function saveCreditSnapshot(
  report: MonthlyCreditReport,
  client?: SupabaseClient
) {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("credit_snapshots")
    .upsert(report.snapshot, { onConflict: "user_id,year,month" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as CreditSnapshot;
}

export async function markCreditSnapshotEmailed(
  snapshotId: string,
  client?: SupabaseClient
) {
  const supabase = client ?? (await createClient());
  const { error } = await supabase
    .from("credit_snapshots")
    .update({ emailed_at: new Date().toISOString() })
    .eq("id", snapshotId);

  if (error) {
    throw new Error(error.message);
  }
}

function buildCalculationMap(data: DashboardData, eurUsdRate: number) {
  const saleByTransaction = new Map(data.saleDetails.map((detail) => [detail.transaction_id, detail]));
  const expoByTransaction = new Map(data.expoDetails.map((detail) => [detail.transaction_id, detail]));
  const rentalByTransaction = new Map(
    data.rentalTourDetails.map((detail) => [detail.transaction_id, detail])
  );
  const purchaseByTransaction = new Map(
    data.purchaseDetails.map((detail) => [detail.transaction_id, detail])
  );
  const expenseItemsByTransaction = data.expenseItems.reduce<
    Map<string, DashboardData["expenseItems"]>
  >((map, item) => {
    map.set(item.transaction_id, [...(map.get(item.transaction_id) ?? []), item]);
    return map;
  }, new Map());

  return new Map(
    data.transactions.map((transaction) => [
      transaction.id,
      calculateTransactionBreakdown({
        transaction,
        eurUsdRate,
        expenseItems: expenseItemsByTransaction.get(transaction.id) ?? [],
        saleDetail: saleByTransaction.get(transaction.id),
        expoDetail: expoByTransaction.get(transaction.id),
        rentalTourDetail: rentalByTransaction.get(transaction.id),
        purchaseDetail: purchaseByTransaction.get(transaction.id)
      })
    ])
  );
}

function toReportTransaction(
  transaction: TimelineEvent,
  calculation: TransactionCalculationBreakdown | undefined
): ReportTransaction {
  return {
    id: transaction.id,
    date: transaction.date,
    title: transaction.title,
    type: transactionTypeLabels[transaction.type],
    city: transaction.city,
    country: transaction.country,
    currency: transaction.currency,
    originalAmount: Number(transaction.original_amount),
    usdEquivalent: calculation?.usdEquivalent ?? Number(transaction.converted_amount_usd ?? transaction.original_amount)
  };
}

function toReportCalculation(
  transaction: TimelineEvent,
  calculation: TransactionCalculationBreakdown | undefined
): ReportCalculationBreakdown {
  const fallbackAmount = Number(transaction.converted_amount_usd ?? transaction.original_amount);

  return {
    transactionId: transaction.id,
    title: transaction.title,
    type: transactionTypeLabels[transaction.type],
    originalAmount: Number(transaction.original_amount),
    currency: transaction.currency,
    exchangeRateSnapshot:
      transaction.exchange_rate_snapshot === null ? null : Number(transaction.exchange_rate_snapshot),
    grossCredit: calculation?.grossCredit ?? {
      currency: transaction.currency,
      amount: Number(transaction.original_amount)
    },
    expenses: calculation?.expenses ?? [],
    multiplier: calculation?.multiplier ?? 1,
    finalCreditEarned: calculation?.finalCreditEarned ?? [
      {
        currency: transaction.currency,
        amount: Number(transaction.original_amount)
      }
    ],
    usdEquivalent: calculation?.usdEquivalent ?? fallbackAmount,
    eurReserveImpact: calculation?.eurReserveImpact ?? 0,
    usdReserveImpact: calculation?.usdReserveImpact ?? fallbackAmount
  };
}

function topBuckets(
  transactions: TimelineEvent[],
  calculations: Map<string, TransactionCalculationBreakdown>,
  getLabel: (transaction: TimelineEvent) => string | null | undefined
) {
  const grouped = transactions.reduce<Record<string, number>>((acc, transaction) => {
    const label = getLabel(transaction)?.trim();
    if (!label) {
      return acc;
    }

    acc[label] = (acc[label] ?? 0) + Math.abs(calculations.get(transaction.id)?.usdEquivalent ?? 0);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function buildUpcomingExpirations(data: DashboardData) {
  const transactionsById = new Map(data.transactions.map((transaction) => [transaction.id, transaction]));

  return data.reminders
    .filter((reminder) => reminder.status === "open")
    .map((reminder) => {
      const transaction = reminder.transaction_id
        ? transactionsById.get(reminder.transaction_id) ?? null
        : null;

      return {
        title: reminder.title,
        dueDate: reminder.due_date,
        transactionTitle: transaction?.title ?? null,
        daysUntil: daysUntil(reminder.due_date)
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 8);
}

async function getOpeningSnapshot(userId: string, periodStart: string, client?: SupabaseClient) {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("credit_snapshots")
    .select("*")
    .eq("user_id", userId)
    .lt("period_end", periodStart)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data as CreditSnapshot | null;
}

async function getActivitySummary(userId: string, period: ReportPeriod, client?: SupabaseClient) {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("activity_log")
    .select("action,label,created_at")
    .eq("user_id", userId)
    .gte("created_at", `${period.start}T00:00:00.000Z`)
    .lte("created_at", `${period.end}T23:59:59.999Z`)
    .in("action", ["transaction_deleted", "transaction_restored"]);

  if (error) {
    return { deleted: 0, restored: 0, events: [] };
  }

  const events = (data ?? []) as Array<{ action: string; label: string | null; created_at: string }>;

  return {
    deleted: events.filter((event) => event.action === "transaction_deleted").length,
    restored: events.filter((event) => event.action === "transaction_restored").length,
    events: events.map((event) => ({
      action: event.action,
      label: event.label,
      createdAt: event.created_at
    }))
  };
}

function isWithinPeriod(date: string, period: ReportPeriod) {
  return date >= period.start && date <= period.end;
}

function daysUntil(date: string) {
  const today = new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const due = new Date(`${date}T00:00:00`);
  const dueDate = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());

  return Math.ceil((dueDate - start) / 86_400_000);
}

function uniqueValues(values: Array<string | null>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}

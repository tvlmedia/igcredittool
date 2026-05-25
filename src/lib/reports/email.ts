import { appUrl, monthlyReportFromEmail, resendApiKey } from "@/lib/env";
import { formatCurrency } from "@/lib/format";
import {
  formatReportMonth,
  type MonthlyCreditReport,
  type ReportAllTimeSummary,
  type ReportBalanceBuildUp,
  type ReportSourceAnalytics
} from "@/lib/reports/monthly";
import type { CreditSnapshot } from "@/lib/types/domain";

export async function sendMonthlyReportEmail(input: {
  to: string;
  report: MonthlyCreditReport;
}) {
  if (!resendApiKey || !monthlyReportFromEmail) {
    throw new Error("Monthly report email environment variables are missing.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: monthlyReportFromEmail,
      to: input.to,
      subject: `Your IronGlass Credit Report — ${formatReportMonth(input.report.periodStart)}`,
      html: renderMonthlyReportEmail(input.report)
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend email failed: ${details || response.statusText}`);
  }
}

export async function sendCreditSnapshotEmail(input: {
  to: string;
  snapshot: CreditSnapshot;
}) {
  if (!resendApiKey || !monthlyReportFromEmail) {
    throw new Error("Monthly report email environment variables are missing.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: monthlyReportFromEmail,
      to: input.to,
      subject: `Your IronGlass Credit Report — ${formatSnapshotMonth(input.snapshot)}`,
      html: renderCreditSnapshotEmail(input.snapshot)
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend email failed: ${details || response.statusText}`);
  }
}

export function renderMonthlyReportEmail(report: MonthlyCreditReport) {
  return renderDetailedEmail({
    title: report.title,
    intro: "Your detailed monthly credit snapshot is stored safely as a backup record.",
    periodLabel: formatReportMonth(report.periodStart),
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    totalCredit: report.totalUsdEquivalent,
    eurReserve: report.eurReserve,
    usdReserve: report.usdReserve,
    fxRate: report.liveEurUsdRate,
    balanceBuildUp: report.balanceBuildUp,
    allTimeSummary: report.allTimeSummary,
    transactions: report.transactions,
    upcomingExpirations: report.upcomingExpirations,
    sourceAnalytics: report.sourceAnalytics,
    activitySummary: report.activitySummary
  });
}

export function renderCreditSnapshotEmail(snapshot: CreditSnapshot) {
  const data = snapshot.report_data as StoredReportData;

  return renderDetailedEmail({
    title: `Credit Report - ${formatSnapshotMonth(snapshot)}`,
    intro: "This email was resent from your stored monthly backup snapshot.",
    periodLabel: formatSnapshotMonth(snapshot),
    periodStart: snapshot.period_start,
    periodEnd: snapshot.period_end,
    totalCredit: Number(snapshot.total_usd_equivalent),
    eurReserve: Number(snapshot.eur_reserve),
    usdReserve: Number(snapshot.usd_reserve),
    fxRate: Number(snapshot.live_eur_usd_rate),
    balanceBuildUp: normalizeBalanceBuildUp(data.balanceBuildUp, snapshot),
    allTimeSummary: normalizeAllTimeSummary(data.allTimeSummary, snapshot),
    transactions: arrayOrEmpty(data.transactions),
    upcomingExpirations: arrayOrEmpty(data.upcomingExpirations),
    sourceAnalytics: normalizeSourceAnalytics(data.sourceAnalytics, data),
    activitySummary: normalizeActivitySummary(data.activitySummary)
  });
}

function renderDetailedEmail(model: EmailReportModel) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body style="margin:0;background:#050607;color:#fff8ec;font-family:Inter,Arial,sans-serif;">
        <div style="max-width:920px;margin:0 auto;padding:28px;">
          <div style="${heroStyle}">
            <p style="${eyebrowStyle}">IronGlass Credit Tracker</p>
            <h1 style="margin:0;color:#fff;font-size:30px;line-height:1.15;">${escapeHtml(model.title)}</h1>
            <p style="margin:14px 0 0;color:rgba(255,248,236,.66);font-size:14px;line-height:1.6;">${escapeHtml(model.intro)}</p>
            <p style="margin:8px 0 0;color:rgba(255,248,236,.48);font-size:13px;line-height:1.6;">Report period: ${escapeHtml(model.periodStart)} to ${escapeHtml(model.periodEnd)}</p>
          </div>

          <div style="${metricGridStyle}">
            ${metric("Report month", model.periodLabel)}
            ${metric("Total credit", formatCurrency(model.totalCredit, "USD"))}
            ${metric("EUR reserve", formatCurrency(model.eurReserve, "EUR"))}
            ${metric("USD reserve", formatCurrency(model.usdReserve, "USD"))}
            ${metric("FX rate", `1 EUR = $${model.fxRate.toFixed(4)}`)}
          </div>

          ${section("Balance build-up", balanceBuildUpTable(model.balanceBuildUp))}
          ${section("All-time overview", allTimeSummaryTable(model.allTimeSummary))}
          ${section("Transactions in this report period", transactionsTable(model.transactions))}
          ${section("Upcoming expirations", expirationsTable(model.upcomingExpirations))}
          ${section("Source analytics", sourceAnalyticsTables(model.sourceAnalytics))}
          ${section("Deleted / restored / edited activity", activitySummaryTable(model.activitySummary))}

          <div style="${footerStyle}">
            <p style="margin:0 0 8px;font-weight:700;color:#fff;">Backup snapshot</p>
            <p style="margin:0;color:rgba(255,248,236,.62);font-size:13px;line-height:1.6;">
              This email is a backup snapshot. The same report is stored in your dashboard under Backup &amp; Reports.
            </p>
            <p style="margin:12px 0 0;color:rgba(255,248,236,.56);font-size:13px;line-height:1.6;">
              Open the dashboard:
              <a href="${appUrl}/dashboard" style="color:#e6842e;">${appUrl}/dashboard</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function balanceBuildUpTable(item: ReportBalanceBuildUp) {
  return simpleRows([
    ["EUR reserve", formatCurrency(Number(item.eurReserve), "EUR")],
    ["EUR converted to USD", formatCurrency(Number(item.eurReserveUsd), "USD")],
    ["USD reserve", formatCurrency(Number(item.usdReserve), "USD")],
    ["Total USD equivalent", formatCurrency(Number(item.totalUsdEquivalent), "USD")],
    ["Total spent", formatCurrency(Number(item.totalSpent), "USD")],
    ["Current balance", formatCurrency(Number(item.currentBalance), "USD")],
    ["Rate source", item.rateSource],
    ["Fallback status", item.usingFallbackFx ? "Using fallback rate" : "Live rate fetched successfully"]
  ]);
}

function allTimeSummaryTable(item: ReportAllTimeSummary) {
  return simpleRows([
    ["All-time total earned", formatCurrency(Number(item.totalEarned), "USD")],
    ["All-time total spent", formatCurrency(Number(item.totalSpent), "USD")],
    ["All-time current balance", formatCurrency(Number(item.currentBalance), "USD")],
    ["Total transactions", String(item.transactionCount)],
    ["Countries visited", String(item.countriesVisited)],
    ["Cities visited", String(item.citiesVisited)],
    ["Expos", String(item.expos)],
    ["Sales", String(item.sales)],
    ["Rental tours", String(item.rentalTours)],
    ["Expenses", String(item.expenses)],
    ["Purchases", String(item.purchases)]
  ]);
}

function transactionsTable(transactions: StoredTransaction[]) {
  if (transactions.length === 0) {
    return emptyText("No transactions in this report period.");
  }

  const rows = transactions
    .map((transaction) => {
      const title = stringOrEmpty(transaction.title) || "Untitled transaction";
      const type = stringOrEmpty(transaction.type);
      const location = stringOrEmpty(transaction.location) || locationLabel(transaction);
      const linked = stringOrEmpty(transaction.linkedSourceTitle);
      const notes = stringOrEmpty(transaction.notes);
      const tags = Array.isArray(transaction.tags)
        ? transaction.tags.map((tag) => stringOrEmpty(tag)).filter(Boolean).join(", ")
        : "";

      return `
        <tr>
          <td style="${tdStyle}">${escapeHtml(stringOrEmpty(transaction.date))}</td>
          <td style="${tdStyle}">
            <strong style="color:#fff;">${escapeHtml(title)}</strong>
            <div style="${mutedTextStyle}">${escapeHtml([type, location].filter(Boolean).join(" - "))}</div>
            ${linked ? `<div style="${mutedTextStyle}">Linked source: ${escapeHtml(linked)}</div>` : ""}
            ${tags ? `<div style="${mutedTextStyle}">Tags / lens brands: ${escapeHtml(tags)}</div>` : ""}
            ${notes ? `<div style="${mutedTextStyle}">Notes: ${escapeHtml(notes)}</div>` : ""}
          </td>
          <td style="${tdStyle}">${escapeHtml(formatOriginalAmount(transaction))}</td>
          <td style="${tdStyle}">${escapeHtml(formatCreditEarned(transaction))}</td>
          <td style="${tdStyle}">${escapeHtml(formatCalculationDetails(transaction))}</td>
          <td style="${tdRightStyle}">${formatCurrency(numberOrZero(transaction.usdEquivalent), "USD")}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <table style="${tableStyle}">
      <thead>
        <tr>
          ${th("Date")}
          ${th("Transaction")}
          ${th("Original")}
          ${th("Credit earned")}
          ${th("Calculation breakdown")}
          ${th("USD eq.", "right")}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function expirationsTable(items: StoredExpiration[]) {
  if (items.length === 0) {
    return emptyText("No open upcoming expirations.");
  }

  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="${tdStyle}">${escapeHtml(stringOrEmpty(item.dueDate))}</td>
          <td style="${tdStyle}">
            <strong style="color:#fff;">${escapeHtml(stringOrEmpty(item.title))}</strong>
            <div style="${mutedTextStyle}">${escapeHtml(stringOrEmpty(item.transactionTitle))}</div>
          </td>
          <td style="${tdStyle}">${escapeHtml(formatDays(numberOrZero(item.daysUntil)))}</td>
          <td style="${tdRightStyle}">${formatOptionalAmount(item)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <table style="${tableStyle}">
      <thead><tr>${th("Expiration date")}${th("Reminder")}${th("Days remaining")}${th("Amount", "right")}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function sourceAnalyticsTables(source: ReportSourceAnalytics) {
  const bestLocation = source.bestLocation
    ? `${source.bestLocation.label} - ${formatCurrency(Number(source.bestLocation.value), "USD")}`
    : "Not enough location data";

  return `
    ${simpleRows([["Best location", bestLocation]])}
    ${miniBucketTable("Top countries", source.topCountries)}
    ${miniBucketTable("Top cities", source.topCities)}
    ${miniBucketTable("Top transaction types", source.topTransactionTypes)}
    ${miniBucketTable("Top expos", source.topExpos)}
    ${miniBucketTable("Top tags / lens brands", source.topTags)}
  `;
}

function activitySummaryTable(summary: StoredActivitySummary) {
  const events = arrayOrEmpty(summary.events);

  return `
    ${simpleRows([
      ["Deleted transactions this month", String(numberOrZero(summary.deleted))],
      ["Restored transactions this month", String(numberOrZero(summary.restored))],
      ["Edited transactions this month", String(numberOrZero(summary.edited))]
    ])}
    ${
      events.length > 0
        ? `<div style="margin-top:12px;">${miniEventTable(events)}</div>`
        : emptyText("No matching activity log events for this report period.")
    }
  `;
}

function simpleRows(rows: Array<[string, string]>) {
  return `
    <table style="${tableStyle}">
      <tbody>
        ${rows
          .map(
            ([label, value]) => `
              <tr>
                <td style="${tdLabelStyle}">${escapeHtml(label)}</td>
                <td style="${tdRightStyle}">${escapeHtml(value)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function miniBucketTable(title: string, items: Array<{ label: string; value: number; count?: number }>) {
  if (items.length === 0) {
    return `<p style="${mutedTextStyle}"><strong>${escapeHtml(title)}:</strong> No data yet.</p>`;
  }

  const rows = items
    .slice(0, 10)
    .map(
      (item) => `
        <tr>
          <td style="${tdStyle}">${escapeHtml(item.label)}</td>
          <td style="${tdStyle}">${item.count ? `${item.count} tx` : ""}</td>
          <td style="${tdRightStyle}">${formatCurrency(Number(item.value), "USD")}</td>
        </tr>
      `
    )
    .join("");

  return `
    <h3 style="margin:18px 0 8px;color:#fff;font-size:15px;">${escapeHtml(title)}</h3>
    <table style="${tableStyle}">
      <tbody>${rows}</tbody>
    </table>
  `;
}

function miniEventTable(events: StoredActivityEvent[]) {
  const rows = events
    .map(
      (event) => `
        <tr>
          <td style="${tdStyle}">${escapeHtml(stringOrEmpty(event.createdAt))}</td>
          <td style="${tdStyle}">${escapeHtml(stringOrEmpty(event.action).replaceAll("_", " "))}</td>
          <td style="${tdStyle}">${escapeHtml(stringOrEmpty(event.label))}</td>
        </tr>
      `
    )
    .join("");

  return `<table style="${tableStyle}"><tbody>${rows}</tbody></table>`;
}

function metric(label: string, value: string) {
  return `
    <div style="border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(0,0,0,.24);padding:16px;">
      <p style="margin:0;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,248,236,.48);font-size:11px;font-weight:700;">${escapeHtml(label)}</p>
      <p style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">${escapeHtml(value)}</p>
    </div>
  `;
}

function section(title: string, body: string) {
  return `
    <div style="${sectionStyle}">
      <h2 style="margin:0 0 14px;font-size:19px;color:#fff;">${escapeHtml(title)}</h2>
      ${body}
    </div>
  `;
}

function th(label: string, align: "left" | "right" = "left") {
  return `<th style="${thStyle}text-align:${align};">${escapeHtml(label)}</th>`;
}

function emptyText(value: string) {
  return `<p style="${mutedTextStyle}">${escapeHtml(value)}</p>`;
}

function formatOriginalAmount(transaction: StoredTransaction) {
  const currency = stringOrEmpty(transaction.currency) || "USD";
  return `${formatCurrency(numberOrZero(transaction.originalAmount), currency as "EUR" | "USD")} ${currency}`;
}

function formatCreditEarned(transaction: StoredTransaction) {
  const calculation = transaction.calculation;
  const finalCredit = Array.isArray(calculation?.finalCreditEarned)
    ? calculation.finalCreditEarned
    : [];

  if (finalCredit.length > 0) {
    return finalCredit.map(formatStoredAmount).join(" + ");
  }

  return formatOriginalAmount(transaction);
}

function formatCalculationDetails(transaction: StoredTransaction) {
  const summary = stringOrEmpty(transaction.breakdownSummary);
  if (summary) {
    return summary;
  }

  const calculation = transaction.calculation;
  const pieces = [
    calculation?.days ? `${numberOrZero(calculation.days)} days` : null,
    calculation?.creditPercentage !== undefined
      ? `${numberOrZero(calculation.creditPercentage)}% credit`
      : null,
    calculation?.multiplier !== undefined ? `x${numberOrZero(calculation.multiplier)} multiplier` : null,
    Array.isArray(calculation?.expenses) && calculation.expenses.length > 0
      ? `Expenses ${calculation.expenses.map(formatStoredAmount).join(" + ")}`
      : null
  ].filter(Boolean);

  return pieces.join("; ") || "Stored credit amount";
}

function formatOptionalAmount(item: StoredExpiration) {
  const original = numberOrNull(item.originalAmount);
  const currency = stringOrEmpty(item.currency);
  const usd = numberOrNull(item.amountUsdEquivalent);

  if (original !== null && currency) {
    return `${formatCurrency(original, currency as "EUR" | "USD")} ${currency}`;
  }

  if (usd !== null) {
    return formatCurrency(usd, "USD");
  }

  return "";
}

function formatStoredAmount(item: StoredAmount) {
  const currency = stringOrEmpty(item.currency) || "USD";
  return `${formatCurrency(numberOrZero(item.amount), currency as "EUR" | "USD")} ${currency}`;
}

function locationLabel(transaction: StoredTransaction) {
  return [stringOrEmpty(transaction.city), stringOrEmpty(transaction.country)]
    .filter(Boolean)
    .join(", ");
}

function formatDays(days: number) {
  if (days < 0) {
    return `${Math.abs(days)} days overdue`;
  }

  if (days === 0) {
    return "expires today";
  }

  return `${days} days`;
}

function normalizeBalanceBuildUp(
  value: StoredReportData["balanceBuildUp"],
  snapshot: CreditSnapshot
): ReportBalanceBuildUp {
  if (value) {
    return value as ReportBalanceBuildUp;
  }

  const eurReserve = Number(snapshot.eur_reserve);
  const usdReserve = Number(snapshot.usd_reserve);
  const rate = Number(snapshot.live_eur_usd_rate);

  return {
    eurReserve,
    eurReserveUsd: eurReserve * rate,
    usdReserve,
    totalUsdEquivalent: Number(snapshot.total_usd_equivalent),
    totalSpent: Number(snapshot.total_spent),
    currentBalance: Number(snapshot.total_usd_equivalent),
    liveEurUsdRate: rate,
    rateSource: "Stored snapshot rate",
    usingFallbackFx: false
  };
}

function normalizeAllTimeSummary(
  value: StoredReportData["allTimeSummary"],
  snapshot: CreditSnapshot
): ReportAllTimeSummary {
  if (value) {
    return value as ReportAllTimeSummary;
  }

  return {
    totalEarned: Number(snapshot.total_earned),
    totalSpent: Number(snapshot.total_spent),
    currentBalance: Number(snapshot.total_usd_equivalent),
    transactionCount: Number(snapshot.transaction_count),
    countriesVisited: Number(snapshot.countries_visited),
    citiesVisited: Number(snapshot.cities_visited),
    expos: 0,
    sales: 0,
    rentalTours: 0,
    expenses: 0,
    purchases: 0
  };
}

function normalizeSourceAnalytics(
  value: StoredReportData["sourceAnalytics"],
  data: StoredReportData
): ReportSourceAnalytics {
  if (value) {
    return value as ReportSourceAnalytics;
  }

  const topCountries = arrayOrEmpty(data.topCountries);
  const topCities = arrayOrEmpty(data.topCities);

  return {
    topCountries,
    topCities,
    topTransactionTypes: [],
    topExpos: [],
    bestLocation: topCities[0] ?? topCountries[0] ?? null,
    topTags: []
  };
}

function normalizeActivitySummary(value: StoredReportData["activitySummary"]): StoredActivitySummary {
  return {
    deleted: numberOrZero(value?.deleted),
    restored: numberOrZero(value?.restored),
    edited: numberOrZero(value?.edited),
    events: arrayOrEmpty(value?.events)
  };
}

function formatSnapshotMonth(snapshot: CreditSnapshot) {
  return formatReportMonth(snapshot.period_start);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberOrZero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function arrayOrEmpty<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

type EmailReportModel = {
  title: string;
  intro: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  totalCredit: number;
  eurReserve: number;
  usdReserve: number;
  fxRate: number;
  balanceBuildUp: ReportBalanceBuildUp;
  allTimeSummary: ReportAllTimeSummary;
  transactions: StoredTransaction[];
  upcomingExpirations: StoredExpiration[];
  sourceAnalytics: ReportSourceAnalytics;
  activitySummary: StoredActivitySummary;
};

type StoredReportData = {
  balanceBuildUp?: Partial<ReportBalanceBuildUp>;
  allTimeSummary?: Partial<ReportAllTimeSummary>;
  transactions?: unknown;
  upcomingExpirations?: unknown;
  topCountries?: unknown;
  topCities?: unknown;
  sourceAnalytics?: Partial<ReportSourceAnalytics>;
  activitySummary?: Partial<StoredActivitySummary>;
};

type StoredAmount = {
  currency?: unknown;
  amount?: unknown;
};

type StoredCalculation = {
  finalCreditEarned?: StoredAmount[];
  expenses?: StoredAmount[];
  multiplier?: unknown;
  creditPercentage?: unknown;
  days?: unknown;
};

type StoredTransaction = {
  date?: unknown;
  title?: unknown;
  notes?: unknown;
  type?: unknown;
  city?: unknown;
  country?: unknown;
  location?: unknown;
  currency?: unknown;
  originalAmount?: unknown;
  usdEquivalent?: unknown;
  linkedSourceTitle?: unknown;
  tags?: unknown;
  calculation?: StoredCalculation;
  breakdownSummary?: unknown;
};

type StoredExpiration = {
  title?: unknown;
  dueDate?: unknown;
  transactionTitle?: unknown;
  daysUntil?: unknown;
  amountUsdEquivalent?: unknown;
  originalAmount?: unknown;
  currency?: unknown;
};

type StoredActivityEvent = {
  action?: unknown;
  label?: unknown;
  createdAt?: unknown;
};

type StoredActivitySummary = {
  deleted?: unknown;
  restored?: unknown;
  edited?: unknown;
  events?: StoredActivityEvent[];
};

const heroStyle =
  "border:1px solid rgba(230,132,46,.22);border-radius:14px;background:linear-gradient(135deg,rgba(230,132,46,.14),rgba(255,255,255,.04),rgba(0,0,0,.3));padding:28px;";
const eyebrowStyle =
  "margin:0 0 8px;text-transform:uppercase;letter-spacing:.22em;color:#d8a25b;font-size:12px;font-weight:700;";
const metricGridStyle =
  "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px;";
const sectionStyle =
  "margin-top:22px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.035);padding:18px;";
const footerStyle =
  "margin-top:22px;border:1px solid rgba(230,132,46,.18);border-radius:12px;background:rgba(230,132,46,.055);padding:18px;";
const tableStyle =
  "width:100%;border-collapse:collapse;color:rgba(255,248,236,.76);font-size:13px;line-height:1.45;";
const thStyle =
  "padding:9px 8px;border-bottom:1px solid rgba(255,255,255,.12);color:rgba(255,248,236,.46);font-size:11px;text-transform:uppercase;letter-spacing:.12em;";
const tdStyle = "padding:10px 8px;border-bottom:1px solid rgba(255,255,255,.08);vertical-align:top;";
const tdRightStyle = `${tdStyle}text-align:right;color:#fff;`;
const tdLabelStyle = `${tdStyle}color:rgba(255,248,236,.55);`;
const mutedTextStyle = "color:rgba(255,248,236,.52);font-size:12px;line-height:1.45;";

import { appUrl, monthlyReportFromEmail, resendApiKey } from "@/lib/env";
import { formatCurrency } from "@/lib/format";
import {
  formatReportMonth,
  type MonthlyCreditReport
} from "@/lib/reports/monthly";

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

export function renderMonthlyReportEmail(report: MonthlyCreditReport) {
  const topTransactions = report.topTransactions
    .slice(0, 5)
    .map(
      (transaction) => `
        <tr>
          <td>${escapeHtml(transaction.date)}</td>
          <td>${escapeHtml(transaction.title)}</td>
          <td>${escapeHtml(transaction.type)}</td>
          <td style="text-align:right;">${formatCurrency(transaction.usdEquivalent, "USD")}</td>
        </tr>
      `
    )
    .join("");
  const expirations = report.upcomingExpirations
    .slice(0, 5)
    .map(
      (item) => `
        <li>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.dueDate)}${item.transactionTitle ? ` - ${escapeHtml(item.transactionTitle)}` : ""}</span>
        </li>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#050607;color:#fff8ec;font-family:Inter,Arial,sans-serif;">
        <div style="max-width:720px;margin:0 auto;padding:28px;">
          <div style="border:1px solid rgba(230,132,46,.2);border-radius:14px;background:linear-gradient(135deg,rgba(230,132,46,.14),rgba(255,255,255,.04),rgba(0,0,0,.3));padding:28px;">
            <p style="margin:0 0 8px;text-transform:uppercase;letter-spacing:.22em;color:#d8a25b;font-size:12px;font-weight:700;">IronGlass Credit Tracker</p>
            <h1 style="margin:0;color:#fff;font-size:30px;line-height:1.15;">${escapeHtml(report.title)}</h1>
            <p style="margin:14px 0 0;color:rgba(255,248,236,.62);font-size:14px;line-height:1.6;">Your monthly credit snapshot is stored safely as a backup record.</p>
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px;">
            ${metric("Total credit", formatCurrency(report.totalUsdEquivalent, "USD"))}
            ${metric("EUR reserve", formatCurrency(report.eurReserve, "EUR"))}
            ${metric("USD reserve", formatCurrency(report.usdReserve, "USD"))}
            ${metric("FX rate", `1 EUR = $${report.liveEurUsdRate.toFixed(4)}`)}
          </div>

          <div style="margin-top:22px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.035);padding:18px;">
            <h2 style="margin:0 0 12px;font-size:18px;color:#fff;">Top transactions</h2>
            <table style="width:100%;border-collapse:collapse;color:rgba(255,248,236,.72);font-size:13px;">
              <tbody>${topTransactions || `<tr><td>No transactions this month.</td></tr>`}</tbody>
            </table>
          </div>

          <div style="margin-top:22px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.035);padding:18px;">
            <h2 style="margin:0 0 12px;font-size:18px;color:#fff;">Upcoming expirations</h2>
            <ul style="margin:0;padding-left:18px;color:rgba(255,248,236,.72);line-height:1.7;">${expirations || "<li>No upcoming expirations.</li>"}</ul>
          </div>

          <p style="margin:22px 0 0;color:rgba(255,248,236,.56);font-size:13px;line-height:1.6;">
            This report is also stored as a monthly snapshot. Open the dashboard:
            <a href="${appUrl}/dashboard" style="color:#e6842e;">${appUrl}/dashboard</a>
          </p>
        </div>
      </body>
    </html>
  `;
}

function metric(label: string, value: string) {
  return `
    <div style="border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(0,0,0,.24);padding:16px;">
      <p style="margin:0;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,248,236,.42);font-size:11px;font-weight:700;">${escapeHtml(label)}</p>
      <p style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">${escapeHtml(value)}</p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

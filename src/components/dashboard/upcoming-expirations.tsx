import { CalendarPlus, ExternalLink, Timer } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DashboardData, Reminder, TimelineEvent } from "@/lib/types/domain";

export function UpcomingExpirations({
  reminders,
  transactions
}: {
  reminders: Reminder[];
  transactions: TimelineEvent[];
}) {
  const transactionsById = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  const upcoming = reminders
    .filter((reminder) => reminder.status === "open")
    .map((reminder) => ({
      reminder,
      transaction: reminder.transaction_id
        ? transactionsById.get(reminder.transaction_id) ?? null
        : null,
      days: daysUntil(reminder.due_date)
    }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  return (
    <Panel>
      <SectionHeader
        eyebrow="Expiry control"
        title="Upcoming credit expirations"
        action={<span className="text-sm text-white/45">{upcoming.length} open</span>}
      />

      <div className="grid gap-3">
        {upcoming.map(({ reminder, transaction, days }) => {
          const urgency = getUrgency(days);
          const calendarUrl = buildReminderCalendarUrl(reminder, transaction);

          return (
            <div
              key={reminder.id}
              className="grid gap-4 rounded-lg border bg-gradient-to-r from-white/[0.045] to-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] md:grid-cols-[1fr_auto]"
              style={{
                borderColor: urgency.border,
                boxShadow: `inset 4px 0 18px ${urgency.glow}`
              }}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className="uppercase tracking-[0.12em]"
                    style={{
                      borderColor: urgency.border,
                      backgroundColor: urgency.background,
                      color: urgency.text
                    }}
                  >
                    <Timer size={13} />
                    {formatDays(days)}
                  </Badge>
                  {transaction ? <Badge>{transaction.title}</Badge> : null}
                </div>

                <h3 className="mt-3 font-semibold text-white">{reminder.title}</h3>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/54">
                  <span>{formatDate(reminder.due_date)}</span>
                  {transaction ? (
                    <span>
                      {formatCurrency(Number(transaction.original_amount), transaction.currency)}
                      {transaction.linkedTitle ? ` from ${transaction.linkedTitle}` : ""}
                    </span>
                  ) : null}
                </div>
                {reminder.notes ? (
                  <p className="mt-2 text-sm leading-5 text-white/48">{reminder.notes}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-start justify-end gap-2">
                {transaction ? (
                  <Link
                    href={`/transactions#transaction-${transaction.id}`}
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-iron-400/18 bg-white/[0.045] px-3 py-1.5 text-sm font-semibold text-white/82 transition hover:border-iron-400/34 hover:bg-iron-400/[0.08]"
                  >
                    <ExternalLink size={15} />
                    Open
                  </Link>
                ) : null}
                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-iron-400/22 bg-iron-400/10 px-3 py-1.5 text-sm font-semibold text-iron-300 transition hover:bg-iron-400/16"
                >
                  <CalendarPlus size={15} />
                  Calendar
                </a>
              </div>
            </div>
          );
        })}

        {upcoming.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 text-sm text-white/48">
            No upcoming credit expirations.
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function daysUntil(date: string) {
  const today = new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const due = new Date(`${date}T00:00:00`);
  const dueDate = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());

  return Math.ceil((dueDate - start) / 86_400_000);
}

function formatDays(days: number) {
  if (days < 0) {
    return `${Math.abs(days)} days overdue`;
  }

  if (days === 0) {
    return "expires today";
  }

  return `expires in ${days} days`;
}

function getUrgency(days: number) {
  if (days < 30) {
    return {
      text: "#fecaca",
      border: "rgba(248,113,113,0.36)",
      background: "rgba(248,113,113,0.1)",
      glow: "rgba(248,113,113,0.16)"
    };
  }

  if (days < 90) {
    return {
      text: "#fed7aa",
      border: "rgba(245,158,66,0.34)",
      background: "rgba(245,158,66,0.1)",
      glow: "rgba(245,158,66,0.14)"
    };
  }

  return {
    text: "#d8c18a",
    border: "rgba(225,180,95,0.22)",
    background: "rgba(225,180,95,0.07)",
    glow: "rgba(225,180,95,0.08)"
  };
}

function buildReminderCalendarUrl(reminder: Reminder, transaction: DashboardData["transactions"][number] | null) {
  const startDate = reminder.due_date.replaceAll("-", "");
  const endDate = addDays(reminder.due_date, 1).replaceAll("-", "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: reminder.title,
    dates: `${startDate}/${endDate}`,
    details: [
      transaction ? `Transaction: ${transaction.title}` : null,
      reminder.notes,
      "IronGlass credit expiration"
    ]
      .filter(Boolean)
      .join("\n")
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

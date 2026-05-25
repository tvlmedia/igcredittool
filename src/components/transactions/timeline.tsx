"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  Clock3,
  Eye,
  MapPin,
  Paperclip,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { LocationAutocomplete } from "@/components/transactions/location-autocomplete";
import {
  deleteTransaction,
  deleteTransactionAttachment,
  restoreTransaction,
  updateTransaction,
  type TransactionActionState
} from "@/lib/actions/transactions";
import { buildGoogleCalendarUrl } from "@/lib/exports/calendar";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  Currency,
  DashboardData,
  ExpenseItem,
  Reminder,
  TimelineEvent,
  TransactionType
} from "@/lib/types/domain";
import { transactionTypeColors, transactionTypeLabels } from "@/lib/types/domain";

const initialUpdateState: TransactionActionState = {
  status: "idle",
  message: ""
};

export function Timeline({
  transactions,
  reminders = [],
  saleDetails = [],
  expoDetails = [],
  rentalTourDetails = [],
  expenseItems = [],
  purchaseDetails = [],
  compact = false,
  mode = "active"
}: {
  transactions: TimelineEvent[];
  reminders?: Reminder[];
  saleDetails?: DashboardData["saleDetails"];
  expoDetails?: DashboardData["expoDetails"];
  rentalTourDetails?: DashboardData["rentalTourDetails"];
  expenseItems?: DashboardData["expenseItems"];
  purchaseDetails?: DashboardData["purchaseDetails"];
  compact?: boolean;
  mode?: "active" | "deleted";
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TransactionType | "all">("all");
  const [currency, setCurrency] = useState<Currency | "all">("all");
  const [tag, setTag] = useState("");
  const [source, setSource] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const sourceOptions = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.type === "expo" || transaction.type === "rental_tour")
        .map((transaction) => ({ id: transaction.id, title: transaction.title })),
    [transactions]
  );
  const remindersByTransaction = useMemo(() => {
    const rows = reminders
      .filter((reminder) => reminder.status === "open" && reminder.transaction_id)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));

    return new Map(rows.map((reminder) => [reminder.transaction_id, reminder]));
  }, [reminders]);
  const saleByTransaction = useMemo(
    () => new Map(saleDetails.map((detail) => [detail.transaction_id, detail])),
    [saleDetails]
  );
  const expoByTransaction = useMemo(
    () => new Map(expoDetails.map((detail) => [detail.transaction_id, detail])),
    [expoDetails]
  );
  const rentalByTransaction = useMemo(
    () => new Map(rentalTourDetails.map((detail) => [detail.transaction_id, detail])),
    [rentalTourDetails]
  );
  const purchaseByTransaction = useMemo(
    () => new Map(purchaseDetails.map((detail) => [detail.transaction_id, detail])),
    [purchaseDetails]
  );
  const expenseItemsByTransaction = useMemo(
    () => groupExpenseItems(expenseItems),
    [expenseItems]
  );

  const filtered = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesQuery =
        !query ||
        transaction.title.toLowerCase().includes(query.toLowerCase()) ||
        (transaction.description ?? "").toLowerCase().includes(query.toLowerCase());
      const matchesType = type === "all" || transaction.type === type;
      const matchesCurrency = currency === "all" || transaction.currency === currency;
      const matchesTag =
        !tag ||
        transaction.tags.some((item) => item.name.toLowerCase().includes(tag.toLowerCase()));
      const matchesSource =
        !source ||
        transaction.attributed_to_transaction_id === source ||
        transaction.id === source;
      const matchesFrom = !dateFrom || transaction.date >= dateFrom;
      const matchesTo = !dateTo || transaction.date <= dateTo;

      return (
        matchesQuery &&
        matchesType &&
        matchesCurrency &&
        matchesTag &&
        matchesSource &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [currency, dateFrom, dateTo, query, source, tag, transactions, type]);

  const shown = compact ? filtered.slice(0, 7) : filtered;
  const action = mode === "deleted" ? restoreTransaction : deleteTransaction;
  const canEdit = mode === "active" && !compact;

  return (
    <Panel>
      <SectionHeader
        eyebrow="Timeline"
        title={mode === "deleted" ? "Deleted transactions" : "Chronological ledger"}
        action={<span className="text-sm text-white/45">{filtered.length} events</span>}
      />

      {!compact ? (
        <div className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Field label="Search">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-white/32" size={16} />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                placeholder="Client, notes, source"
              />
            </div>
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(event) => setType(event.target.value as typeof type)}>
              <option value="all">All</option>
              {Object.entries(transactionTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Currency">
            <Select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as typeof currency)}
            >
              <option value="all">All</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
          <Field label="Tags">
            <Input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="Tag" />
          </Field>
          <Field label="Linked source">
            <Select value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="">All</option>
              {sourceOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="From">
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </Field>
            <Field label="To">
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </Field>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3">
        {shown.map((transaction) => {
          const originalAmount = formatCurrency(
            Number(transaction.original_amount),
            transaction.currency
          );
          const convertedAmountUsd =
            transaction.converted_amount_usd === null
              ? null
              : Number(transaction.converted_amount_usd);
          const usdEquivalent =
            transaction.currency !== "USD" &&
            convertedAmountUsd !== null &&
            Number.isFinite(convertedAmountUsd)
              ? formatCurrency(convertedAmountUsd, "USD")
              : null;
          const typeColor = transactionTypeColors[transaction.type];
          const location = getLocationLabel(transaction);
          const reminder = remindersByTransaction.get(transaction.id);
          const urgency = reminder ? getReminderUrgency(daysUntil(reminder.due_date)) : null;
          const calculationRows = getCalculationRows({
            transaction,
            saleDetail: saleByTransaction.get(transaction.id),
            expoDetail: expoByTransaction.get(transaction.id),
            rentalTourDetail: rentalByTransaction.get(transaction.id),
            purchaseDetail: purchaseByTransaction.get(transaction.id),
            expenseItems: expenseItemsByTransaction.get(transaction.id) ?? []
          });
          const amountLabel =
            transaction.type === "purchase" ? "Final cost/spend" : "Final credit earned";

          return (
            <article
              key={transaction.id}
              id={`transaction-${transaction.id}`}
              className="grid gap-4 rounded-lg border border-l-2 border-white/10 bg-gradient-to-b from-white/[0.045] to-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-iron-400/24 hover:bg-white/[0.055] md:grid-cols-[150px_1fr_auto]"
              style={{
                borderLeftColor: typeColor.core,
                boxShadow: `inset 8px 0 22px ${typeColor.glow}`
              }}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                {formatDate(transaction.date)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-white">{transaction.title}</h3>
                  <TypeBadge type={transaction.type} />
                  {location ? (
                    <Badge>
                      <MapPin size={13} />
                      {location}
                    </Badge>
                  ) : null}
                  {transaction.linkedTitle ? <Badge>Source: {transaction.linkedTitle}</Badge> : null}
                </div>
                {transaction.description ? (
                  <p className="mt-2 text-sm leading-6 text-white/54">{transaction.description}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {transaction.tags.map((item) => (
                    <Badge key={item.id}>{item.name}</Badge>
                  ))}
                  {(transaction.type === "expo" || transaction.type === "rental_tour") ? (
                    <a
                      href={buildGoogleCalendarUrl(transaction)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-iron-400/20 bg-iron-400/10 px-2.5 py-1 text-xs font-medium text-iron-300 transition hover:bg-iron-400/16"
                    >
                      <Calendar size={13} />
                      Google Calendar
                    </a>
                  ) : null}
                  {reminder && urgency ? (
                    <Badge
                      style={{
                        borderColor: urgency.border,
                        backgroundColor: urgency.background,
                        color: urgency.text
                      }}
                    >
                      <Clock3 size={13} />
                      {formatReminderStatus(daysUntil(reminder.due_date))}
                    </Badge>
                  ) : null}
                  {transaction.attachments.length > 0 ? (
                    <Badge>
                      <Paperclip size={13} />
                      {transaction.attachments.length} attachment
                      {transaction.attachments.length === 1 ? "" : "s"}
                    </Badge>
                  ) : null}
                </div>
                <CalculationBreakdown rows={calculationRows} />
              </div>
              <div className="rounded-md border border-white/10 bg-black/18 p-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/36">
                  {amountLabel}
                </p>
                <p
                  className={`mt-1 text-xl font-semibold ${
                    transaction.original_amount < 0 ? "text-red-200" : "text-white"
                  }`}
                >
                  {originalAmount}
                </p>
                <div className="mt-2 grid gap-1 text-xs text-white/46">
                  <p>Currency: {transaction.currency}</p>
                  {usdEquivalent ? <p>USD equivalent: {usdEquivalent}</p> : null}
                </div>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="secondary"
                      icon={editingId === transaction.id ? <X size={15} /> : <Pencil size={15} />}
                      className="min-h-9 px-3 py-1.5"
                      onClick={() =>
                        setEditingId(editingId === transaction.id ? null : transaction.id)
                      }
                    >
                      {editingId === transaction.id ? "Close" : "Edit"}
                    </Button>
                  ) : null}
                  <form
                    action={action}
                    onSubmit={(event) => {
                      if (
                        mode === "active" &&
                        !window.confirm("Are you sure you want to delete this transaction?")
                      ) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="transactionId" value={transaction.id} />
                    <Button
                      type="submit"
                      variant={mode === "deleted" ? "secondary" : "danger"}
                      icon={mode === "deleted" ? <RotateCcw size={15} /> : <Trash2 size={15} />}
                      className="min-h-9 px-3 py-1.5"
                    >
                      {mode === "deleted" ? "Restore" : "Delete"}
                    </Button>
                  </form>
                </div>
              </div>
              {editingId === transaction.id ? (
                <EditTransactionForm
                  transaction={transaction}
                  onSaved={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                />
              ) : null}
            </article>
          );
        })}

        {shown.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-8 text-center text-white/48">
            No transactions yet.
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function TypeBadge({ type }: { type: TransactionType }) {
  const color = transactionTypeColors[type];

  return (
    <Badge
      style={{
        borderColor: color.border,
        backgroundColor: color.background,
        color: color.text
      }}
    >
      {transactionTypeLabels[type]}
    </Badge>
  );
}

function CalculationBreakdown({ rows }: { rows: CalculationRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2 rounded-md border border-white/10 bg-black/14 p-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/34">
            {row.label}
          </p>
          <p className={`mt-0.5 text-sm font-semibold ${row.emphasis ? "text-iron-300" : "text-white/74"}`}>
            {row.value}
          </p>
        </div>
      ))}
    </div>
  );
}

type CalculationRow = {
  label: string;
  value: string;
  emphasis?: boolean;
};

function getCalculationRows(input: {
  transaction: TimelineEvent;
  saleDetail?: DashboardData["saleDetails"][number];
  expoDetail?: DashboardData["expoDetails"][number];
  rentalTourDetail?: DashboardData["rentalTourDetails"][number];
  purchaseDetail?: DashboardData["purchaseDetails"][number];
  expenseItems: ExpenseItem[];
}): CalculationRow[] {
  if (input.transaction.type === "sale") {
    const saleAmount = input.saleDetail?.sale_amount ?? Math.abs(Number(input.transaction.original_amount));
    const saleCurrency = input.saleDetail?.sale_currency ?? input.transaction.currency;
    const creditPercentage = input.saleDetail?.credit_percentage ?? 100;

    return [
      { label: "Sale amount", value: formatCurrency(Number(saleAmount), saleCurrency) },
      { label: "Credit percentage", value: `${formatNumber(Number(creditPercentage))}%` },
      {
        label: "Final credit earned",
        value: formatCurrency(Number(input.transaction.original_amount), input.transaction.currency),
        emphasis: true
      }
    ];
  }

  if (input.transaction.type === "expo") {
    const days = Math.max(1, Number(input.expoDetail?.days_count ?? 1));
    const dailyCredits = normalizeDailyCredits(input.expoDetail?.daily_credits);
    const defaultCreditPerDay = Number(
      input.expoDetail?.default_credit_per_day ??
        (dailyCredits.length > 0 ? dailyCredits[0] : Number(input.transaction.original_amount) / days)
    );
    const grossExpoCredit =
      dailyCredits.length > 0
        ? dailyCredits.reduce((sum, value) => sum + value, 0)
        : Number(input.transaction.original_amount);
    const expensesMultiplier = Number(input.expoDetail?.expenses_multiplier ?? 1);
    const expenseTotals = groupCurrencyAmounts(
      input.expenseItems.map((item) => ({
        currency: item.currency,
        amount: Number(item.amount)
      }))
    );
    const expenseCreditTotals = groupCurrencyAmounts(
      input.expenseItems.map((item) => ({
        currency: item.currency,
        amount: Number(item.amount) * expensesMultiplier
      }))
    );
    const finalTotals = addGroupedAmount(
      expenseCreditTotals,
      input.transaction.currency,
      grossExpoCredit
    );

    return [
      {
        label: "Expo credit/day",
        value: formatCurrency(defaultCreditPerDay, input.transaction.currency)
      },
      { label: "Number of days", value: `${days}` },
      {
        label: "Gross expo credit",
        value: formatCurrency(grossExpoCredit, input.transaction.currency)
      },
      {
        label: "Expenses",
        value: formatGroupedAmounts(expenseTotals, input.transaction.currency)
      },
      { label: "Expenses multiplier", value: `x${formatNumber(expensesMultiplier)}` },
      {
        label: "Expense credit",
        value: formatGroupedAmounts(expenseCreditTotals, input.transaction.currency)
      },
      {
        label: "Final credit earned",
        value: formatGroupedAmounts(finalTotals, input.transaction.currency),
        emphasis: true
      }
    ];
  }

  if (input.transaction.type === "expense") {
    return [
      {
        label: "Expense amount",
        value: formatCurrency(Number(input.transaction.original_amount), input.transaction.currency)
      },
      { label: "Multiplier", value: "x1" },
      {
        label: "Final credit earned",
        value: formatCurrency(Number(input.transaction.original_amount), input.transaction.currency),
        emphasis: true
      }
    ];
  }

  if (input.transaction.type === "rental_tour") {
    const expensesMultiplier = Number(input.rentalTourDetail?.expenses_multiplier ?? 1);
    const expenseTotals = groupCurrencyAmounts(
      input.expenseItems.map((item) => ({
        currency: item.currency,
        amount: Number(item.amount)
      }))
    );
    const expenseCreditTotals = groupCurrencyAmounts(
      input.expenseItems.map((item) => ({
        currency: item.currency,
        amount: Number(item.amount) * expensesMultiplier
      }))
    );
    const hasExpenses = input.expenseItems.length > 0;

    return [
      {
        label: "Tour/day amount",
        value: hasExpenses
          ? "From expenses"
          : formatCurrency(Number(input.transaction.original_amount), input.transaction.currency)
      },
      { label: "Days", value: "Not tracked" },
      {
        label: "Expenses",
        value: hasExpenses ? formatGroupedAmounts(expenseTotals, input.transaction.currency) : "None"
      },
      { label: "Expenses multiplier", value: `x${formatNumber(expensesMultiplier)}` },
      {
        label: "Final credit earned",
        value: hasExpenses
          ? formatGroupedAmounts(expenseCreditTotals, input.transaction.currency)
          : formatCurrency(Number(input.transaction.original_amount), input.transaction.currency),
        emphasis: true
      }
    ];
  }

  const purchaseAmount = Math.abs(Number(input.transaction.original_amount));

  return [
    {
      label: "Purchase amount",
      value: formatCurrency(purchaseAmount, input.transaction.currency)
    },
    { label: "Currency", value: input.transaction.currency },
    input.purchaseDetail
      ? {
          label: "Payment mode",
          value: formatPaymentMode(input.purchaseDetail.payment_mode)
        }
      : null,
    {
      label: "Final cost/spend",
      value: formatCurrency(purchaseAmount, input.transaction.currency),
      emphasis: true
    }
  ].filter((row): row is CalculationRow => Boolean(row));
}

function groupExpenseItems(items: ExpenseItem[]) {
  return items.reduce<Map<string, ExpenseItem[]>>((map, item) => {
    map.set(item.transaction_id, [...(map.get(item.transaction_id) ?? []), item]);
    return map;
  }, new Map());
}

function normalizeDailyCredits(value: unknown) {
  return Array.isArray(value)
    ? value.map(Number).filter((item) => Number.isFinite(item) && item >= 0)
    : [];
}

function groupCurrencyAmounts(items: Array<{ currency: Currency; amount: number }>) {
  return items.reduce<Partial<Record<Currency, number>>>((grouped, item) => {
    if (!Number.isFinite(item.amount)) {
      return grouped;
    }

    grouped[item.currency] = (grouped[item.currency] ?? 0) + item.amount;
    return grouped;
  }, {});
}

function addGroupedAmount(
  grouped: Partial<Record<Currency, number>>,
  currency: Currency,
  amount: number
) {
  return groupCurrencyAmounts([
    ...Object.entries(grouped).map(([key, value]) => ({
      currency: key as Currency,
      amount: value ?? 0
    })),
    { currency, amount }
  ]);
}

function formatGroupedAmounts(grouped: Partial<Record<Currency, number>>, preferredCurrency: Currency) {
  const currencies = [
    preferredCurrency,
    ...(["USD", "EUR"] as Currency[]).filter((currency) => currency !== preferredCurrency)
  ];
  const parts = currencies
    .map((currency) => ({
      currency,
      amount: grouped[currency] ?? 0
    }))
    .filter((item) => Math.abs(item.amount) > 0.000001)
    .map((item) => formatCurrency(item.amount, item.currency));

  return parts.length > 0 ? parts.join(" + ") : formatCurrency(0, preferredCurrency);
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatPaymentMode(value: string) {
  return value.replaceAll("_", " ");
}

function getLocationLabel(transaction: TimelineEvent) {
  const cityCountry = [transaction.city, transaction.country].filter(Boolean).join(", ");
  return cityCountry || transaction.location_label || "";
}

function daysUntil(date: string) {
  const today = new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const due = new Date(`${date}T00:00:00`);
  const dueDate = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());

  return Math.ceil((dueDate - start) / 86_400_000);
}

function formatReminderStatus(days: number) {
  if (days < 0) {
    return `${Math.abs(days)} days overdue`;
  }

  if (days === 0) {
    return "expires today";
  }

  return `expires in ${days} days`;
}

function getReminderUrgency(days: number) {
  if (days < 30) {
    return {
      text: "#fecaca",
      border: "rgba(248,113,113,0.36)",
      background: "rgba(248,113,113,0.1)"
    };
  }

  if (days < 90) {
    return {
      text: "#fed7aa",
      border: "rgba(245,158,66,0.34)",
      background: "rgba(245,158,66,0.1)"
    };
  }

  return {
    text: "#d8c18a",
    border: "rgba(225,180,95,0.22)",
    background: "rgba(225,180,95,0.07)"
  };
}

function formatFileSize(value: number | null) {
  if (!value) {
    return "File";
  }

  if (value < 1_000_000) {
    return `${Math.round(value / 1000)} KB`;
  }

  return `${(value / 1_000_000).toFixed(1)} MB`;
}

function EditTransactionForm({
  transaction,
  onSaved,
  onCancel
}: {
  transaction: TimelineEvent;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateTransaction, initialUpdateState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      if (state.warning) {
        toast(state.warning);
      }
      onSaved();
    }

    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [onSaved, state]);

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-4 md:col-span-3"
    >
      <input type="hidden" name="transactionId" value={transaction.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title">
          <Input name="title" required defaultValue={transaction.title} />
        </Field>
        <Field label="Date">
          <Input name="date" type="date" required defaultValue={transaction.date} />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Original amount">
          <Input
            name="originalAmount"
            type="number"
            step="0.01"
            required
            defaultValue={Number(transaction.original_amount)}
          />
        </Field>
        <Field label="Currency">
          <Select name="currency" defaultValue={transaction.currency}>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </Select>
        </Field>
      </div>

      <LocationAutocomplete
        initialValue={{
          locationLabel: transaction.location_label,
          city: transaction.city,
          country: transaction.country,
          latitude: transaction.latitude,
          longitude: transaction.longitude
        }}
      />

      <Field label="Notes">
        <Textarea name="description" defaultValue={transaction.description ?? ""} />
      </Field>

      <div className="grid gap-3 rounded-lg border border-white/10 bg-black/18 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
              Attachments
            </p>
            <p className="mt-1 text-sm text-white/48">Receipts, invoices, screenshots or PDFs.</p>
          </div>
          <span className="text-xs text-white/38">{transaction.attachments.length} files</span>
        </div>

        <Field label="Upload file">
          <Input name="attachment" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
        </Field>

        {transaction.attachments.length > 0 ? (
          <div className="grid gap-2">
            {transaction.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{attachment.file_name}</p>
                  <p className="text-xs text-white/42">{formatFileSize(attachment.file_size)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/attachments/${attachment.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-iron-400/18 bg-white/[0.045] px-3 py-1.5 text-sm font-semibold text-white/82 transition hover:border-iron-400/34 hover:bg-iron-400/[0.08]"
                  >
                    <Eye size={15} />
                    View
                  </a>
                  <Button
                    type="submit"
                    variant="danger"
                    icon={<Trash2 size={15} />}
                    className="min-h-9 px-3 py-1.5"
                    name="attachmentId"
                    value={attachment.id}
                    formAction={deleteTransactionAttachment}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="secondary" icon={<Pencil size={16} />} disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

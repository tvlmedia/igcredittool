"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Calendar, Pencil, RotateCcw, Search, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { LocationAutocomplete } from "@/components/transactions/location-autocomplete";
import {
  deleteTransaction,
  restoreTransaction,
  updateTransaction,
  type TransactionActionState
} from "@/lib/actions/transactions";
import { getDefaultEurUsdRate } from "@/lib/env";
import { buildGoogleCalendarUrl } from "@/lib/exports/calendar";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Currency, TimelineEvent, TransactionType } from "@/lib/types/domain";
import { transactionTypeLabels } from "@/lib/types/domain";

const initialUpdateState: TransactionActionState = {
  status: "idle",
  message: ""
};

export function Timeline({
  transactions,
  compact = false,
  mode = "active"
}: {
  transactions: TimelineEvent[];
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

          return (
            <article
              key={transaction.id}
              className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.045] p-4 transition hover:bg-white/[0.065] md:grid-cols-[150px_1fr_auto]"
            >
              <div className="text-sm text-white/48">{formatDate(transaction.date)}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-white">{transaction.title}</h3>
                  <Badge>{transactionTypeLabels[transaction.type]}</Badge>
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
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-white/38">Credit earned</p>
                <p
                  className={`mt-1 text-xl font-semibold ${
                    transaction.original_amount < 0 ? "text-red-200" : "text-white"
                  }`}
                >
                  {originalAmount}
                </p>
                <div className="mt-2 grid gap-1 text-xs text-white/45">
                  <p>Original amount: {originalAmount}</p>
                  <p>Currency: {transaction.currency}</p>
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
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Title">
          <Input name="title" required defaultValue={transaction.title} />
        </Field>
        <Field label="Date">
          <Input name="date" type="date" required defaultValue={transaction.date} />
        </Field>
        <Field label="Exchange rate">
          <Input
            name="exchangeRate"
            type="number"
            min="0"
            step="0.0001"
            defaultValue={Number(transaction.exchange_rate_snapshot ?? getDefaultEurUsdRate())}
          />
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

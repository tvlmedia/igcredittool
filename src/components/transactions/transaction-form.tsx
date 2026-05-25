"use client";

import { type ComponentType, useActionState, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  CalendarPlus,
  CircleDollarSign,
  Landmark,
  Plus,
  Receipt,
  Save,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Panel, SectionHeader } from "@/components/ui/panel";
import {
  createTransaction,
  type TransactionActionState
} from "@/lib/actions/transactions";
import { getDefaultEurUsdRate } from "@/lib/env";
import type { Currency, Transaction, TransactionType } from "@/lib/types/domain";
import { transactionTypeLabels } from "@/lib/types/domain";

type ExpenseDraft = {
  id: string;
  label: string;
  amount: string;
  currency: Currency;
};

const initialState: TransactionActionState = {
  status: "idle",
  message: ""
};

const typeOptions: Array<{
  value: TransactionType;
  icon: ComponentType<{ size?: number }>;
}> = [
  { value: "sale", icon: CircleDollarSign },
  { value: "expo", icon: CalendarPlus },
  { value: "rental_tour", icon: Landmark },
  { value: "expense", icon: Receipt },
  { value: "purchase", icon: Save }
];

export function TransactionForm({
  sourceTransactions
}: {
  sourceTransactions: Transaction[];
}) {
  const [state, formAction, pending] = useActionState(createTransaction, initialState);
  const [type, setType] = useState<TransactionType>("sale");
  const [daysCount, setDaysCount] = useState(1);
  const [dailyCredits, setDailyCredits] = useState<number[]>([1000]);
  const [expenses, setExpenses] = useState<ExpenseDraft[]>([
    { id: "initial-expense", label: "Hotel", amount: "", currency: "EUR" }
  ]);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
    }

    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  useEffect(() => {
    setDailyCredits((current) => {
      const next = [...current];
      while (next.length < daysCount) {
        next.push(1000);
      }
      return next.slice(0, daysCount);
    });
  }, [daysCount]);

  const expenseItemsJson = JSON.stringify(
    expenses
      .filter((item) => item.label.trim() && Number(item.amount) > 0)
      .map((item) => ({
        label: item.label,
        amount: Number(item.amount),
        currency: item.currency
      }))
  );

  return (
    <Panel>
      <SectionHeader eyebrow="Ledger" title="Add credit event" />
      <form action={formAction} className="grid gap-5">
        <input name="type" type="hidden" value={type} />
        <input name="expenseItemsJson" type="hidden" value={expenseItemsJson} />
        <input name="dailyCreditsJson" type="hidden" value={JSON.stringify(dailyCredits)} />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {typeOptions.map((option) => {
            const Icon = option.icon;
            const active = option.value === type;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${
                  active
                    ? "border-iron-400/45 bg-iron-400/14 text-iron-300"
                    : "border-white/10 bg-white/[0.045] text-white/58 hover:bg-white/[0.075] hover:text-white"
                }`}
              >
                <Icon size={16} />
                {transactionTypeLabels[option.value]}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Title">
            <Input name="title" required placeholder="Follow-up sale" />
          </Field>
          <Field label="Date">
            <Input name="date" type="date" required defaultValue={today} />
          </Field>
          <Field label="EUR to USD rate">
            <Input
              name="exchangeRate"
              type="number"
              min="0"
              step="0.0001"
              defaultValue={getDefaultEurUsdRate()}
            />
          </Field>
        </div>

        {type !== "sale" && type !== "purchase" ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Entry currency">
              <Select key={type} name="currency" defaultValue={type === "expo" ? "USD" : "EUR"}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </Select>
            </Field>
            <Field label="Expenses multiplier">
              <Input
                name="expensesMultiplier"
                type="number"
                min="0"
                step="0.1"
                defaultValue={type === "expense" ? 1 : 2}
              />
            </Field>
            {sourceTransactions.length > 0 && type === "expense" ? (
              <SourceSelect sourceTransactions={sourceTransactions} />
            ) : null}
          </div>
        ) : (
          <input name="currency" type="hidden" value="USD" />
        )}

        {type === "sale" ? <SaleFields sourceTransactions={sourceTransactions} /> : null}
        {type === "expo" ? (
          <ExpoFields
            daysCount={daysCount}
            setDaysCount={setDaysCount}
            dailyCredits={dailyCredits}
            setDailyCredits={setDailyCredits}
          />
        ) : null}
        {type === "rental_tour" ? <RentalTourFields /> : null}
        {type === "expense" ? <StandaloneExpenseFields /> : null}
        {type === "purchase" ? <PurchaseFields /> : null}

        {(type === "expo" || type === "rental_tour") ? (
          <ExpenseList expenses={expenses} setExpenses={setExpenses} />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tags">
            <Input name="tags" placeholder="Trade show, city, lens brand" />
          </Field>
          <Field label="Reminder date">
            <Input name="reminderDueDate" type="date" />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Reminder title">
            <Input name="reminderTitle" placeholder="Credit expires / invoice follow-up" />
          </Field>
          <Field label="Reminder notes">
            <Input name="reminderNotes" placeholder="Optional" />
          </Field>
        </div>

        <Field label="Notes">
          <Textarea name="description" placeholder="Context, client, lens set, deal stage..." />
        </Field>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending} icon={<Save size={16} />}>
            {pending ? "Saving..." : "Save transaction"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function SaleFields({ sourceTransactions }: { sourceTransactions: Transaction[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Field label="Sale amount">
        <Input name="saleAmount" type="number" min="0" step="0.01" required />
      </Field>
      <Field label="Sale currency">
        <Select name="saleCurrency" defaultValue="USD">
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </Select>
      </Field>
      <Field label="Credit percentage">
        <Input name="creditPercentage" type="number" min="0" step="0.1" defaultValue="10" />
      </Field>
      <SourceSelect sourceTransactions={sourceTransactions} />
    </div>
  );
}

function ExpoFields({
  daysCount,
  setDaysCount,
  dailyCredits,
  setDailyCredits
}: {
  daysCount: number;
  setDaysCount: (value: number) => void;
  dailyCredits: number[];
  setDailyCredits: (value: number[]) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Expo name">
          <Input name="expoName" placeholder="Industry expo" />
        </Field>
        <Field label="Days">
          <Input
            name="daysCount"
            type="number"
            min="1"
            value={daysCount}
            onChange={(event) => setDaysCount(Math.max(1, Number(event.target.value)))}
          />
        </Field>
        <Field label="Default per day">
          <Input name="defaultCreditPerDay" type="number" min="0" defaultValue="1000" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dailyCredits.map((value, index) => (
          <Field key={index} label={`Day ${index + 1}`}>
            <Input
              type="number"
              min="0"
              value={value}
              onChange={(event) => {
                const next = [...dailyCredits];
                next[index] = Number(event.target.value);
                setDailyCredits(next);
              }}
            />
          </Field>
        ))}
      </div>
    </div>
  );
}

function RentalTourFields() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Rental / tour name">
        <Input name="tourName" placeholder="Rental tour" />
      </Field>
      <Field label="Source label">
        <Input name="sourceLabel" placeholder="Rental tour" />
      </Field>
    </div>
  );
}

function StandaloneExpenseFields() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Field label="Expense label">
        <Input name="expenseLabel" placeholder="Shipping, taxi, import duties" />
      </Field>
      <Field label="Expense amount">
        <Input name="expenseAmount" type="number" min="0" step="0.01" required />
      </Field>
      <Field label="Expense currency">
        <Select name="expenseCurrency" defaultValue="EUR">
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
        </Select>
      </Field>
    </div>
  );
}

function PurchaseFields() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Field label="Purchase">
        <Input name="purchaseName" placeholder="IronGlass MKII set" />
      </Field>
      <Field label="Payment mode">
        <Select name="paymentMode" defaultValue="mixed">
          <option value="usd_credit">USD credit</option>
          <option value="eur_to_usd">EUR to USD</option>
          <option value="mixed">Mixed</option>
        </Select>
      </Field>
      <Field label="USD credit used">
        <Input name="usdCreditUsed" type="number" min="0" step="0.01" defaultValue="0" />
      </Field>
      <Field label="EUR credit converted">
        <Input name="eurCreditConverted" type="number" min="0" step="0.01" defaultValue="0" />
      </Field>
    </div>
  );
}

function ExpenseList({
  expenses,
  setExpenses
}: {
  expenses: ExpenseDraft[];
  setExpenses: (value: ExpenseDraft[]) => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">Expense list</p>
        <Button
          type="button"
          variant="secondary"
          icon={<Plus size={16} />}
          onClick={() =>
            setExpenses([
              ...expenses,
              { id: `expense-${Date.now()}`, label: "", amount: "", currency: "EUR" }
            ])
          }
        >
          Add item
        </Button>
      </div>

      <div className="grid gap-3">
        {expenses.map((expense) => (
          <div key={expense.id} className="grid gap-3 md:grid-cols-[1fr_160px_120px_44px]">
            <Input
              value={expense.label}
              placeholder="Taxi, hotel, freight"
              onChange={(event) =>
                setExpenses(
                  expenses.map((item) =>
                    item.id === expense.id ? { ...item, label: event.target.value } : item
                  )
                )
              }
            />
            <Input
              value={expense.amount}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              onChange={(event) =>
                setExpenses(
                  expenses.map((item) =>
                    item.id === expense.id ? { ...item, amount: event.target.value } : item
                  )
                )
              }
            />
            <Select
              value={expense.currency}
              onChange={(event) =>
                setExpenses(
                  expenses.map((item) =>
                    item.id === expense.id
                      ? { ...item, currency: event.target.value as Currency }
                      : item
                  )
                )
              }
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </Select>
            <Button
              type="button"
              variant="ghost"
              title="Remove expense"
              onClick={() => setExpenses(expenses.filter((item) => item.id !== expense.id))}
              icon={<Trash2 size={16} />}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceSelect({ sourceTransactions }: { sourceTransactions: Transaction[] }) {
  return (
    <Field label="Linked expo / tour">
      <Select name="linkedSourceId" defaultValue="">
        <option value="">Unlinked</option>
        {sourceTransactions.map((source) => (
          <option key={source.id} value={source.id}>
            {source.title}
          </option>
        ))}
      </Select>
    </Field>
  );
}

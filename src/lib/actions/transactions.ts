"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Currency, TransactionType } from "@/lib/types/domain";

export type TransactionActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const expenseItemSchema = z.object({
  label: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.enum(["EUR", "USD"])
});

const baseSchema = z.object({
  type: z.enum(["sale", "expo", "rental_tour", "expense", "purchase"]),
  title: z.string().min(2, "Title is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  tags: z.string().optional(),
  currency: z.enum(["EUR", "USD"]),
  exchangeRate: z.coerce.number().positive()
});

export async function createTransaction(
  _previousState: TransactionActionState,
  formData: FormData
): Promise<TransactionActionState> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "You need to be logged in." };
  }

  const parsed = baseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  try {
    const type = parsed.data.type;
    const expenseItems = parseExpenseItems(formData.get("expenseItemsJson"));
    const dailyCredits = parseDailyCredits(formData.get("dailyCreditsJson"));
    const exchangeRate = parsed.data.exchangeRate;
    const detail = buildTransactionPayload({
      type,
      formData,
      currency: parsed.data.currency,
      exchangeRate,
      expenseItems,
      dailyCredits
    });

    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type,
        title: parsed.data.title,
        description: parsed.data.description || null,
        date: parsed.data.date,
        currency: detail.currency,
        original_amount: detail.originalAmount,
        converted_amount_usd: detail.convertedAmountUsd,
        exchange_rate_snapshot: exchangeRate,
        attributed_to_transaction_id: detail.attributedToTransactionId
      })
      .select("*")
      .single();

    if (transactionError || !transaction) {
      throw transactionError ?? new Error("Transaction could not be created.");
    }

    await insertDetailRecord({
      supabase,
      type,
      transactionId: transaction.id,
      formData,
      detail,
      expenseItems,
      dailyCredits
    });

    if (expenseItems.length > 0) {
      const { error } = await supabase.from("expense_items").insert(
        expenseItems.map((item) => ({
          transaction_id: transaction.id,
          user_id: user.id,
          label: item.label,
          amount: item.amount,
          currency: item.currency,
          converted_amount_usd:
            item.currency === "EUR" ? item.amount * exchangeRate : item.amount,
          exchange_rate_snapshot: item.currency === "EUR" ? exchangeRate : null
        }))
      );

      if (error) {
        throw error;
      }
    }

    await syncTags({
      supabase,
      userId: user.id,
      transactionId: transaction.id,
      tags: parsed.data.tags ?? ""
    });

    const reminderTitle = stringValue(formData.get("reminderTitle"));
    const reminderDueDate = stringValue(formData.get("reminderDueDate"));
    if (reminderTitle && reminderDueDate) {
      const { error } = await supabase.from("reminders").insert({
        user_id: user.id,
        transaction_id: transaction.id,
        title: reminderTitle,
        due_date: reminderDueDate,
        notes: stringValue(formData.get("reminderNotes")) || null
      });

      if (error) {
        throw error;
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/insights");

    return { status: "success", message: "Transaction saved." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Something went wrong."
    };
  }
}

function buildTransactionPayload(input: {
  type: TransactionType;
  formData: FormData;
  currency: Currency;
  exchangeRate: number;
  expenseItems: z.infer<typeof expenseItemSchema>[];
  dailyCredits: number[];
}) {
  const linkedSource = stringValue(input.formData.get("linkedSourceId")) || null;

  if (input.type === "sale") {
    const saleAmount = numberValue(input.formData.get("saleAmount"));
    const saleCurrency = enumValue<Currency>(input.formData.get("saleCurrency"), "USD");
    const creditPercentage = numberValue(input.formData.get("creditPercentage"), 10);
    const credit = saleAmount * (creditPercentage / 100);

    return {
      currency: saleCurrency,
      originalAmount: roundCurrency(credit),
      convertedAmountUsd: roundCurrency(
        saleCurrency === "EUR" ? credit * input.exchangeRate : credit
      ),
      attributedToTransactionId: linkedSource,
      saleAmount,
      saleCurrency,
      creditPercentage,
      linkedSource
    };
  }

  if (input.type === "expo") {
    const expensesMultiplier = numberValue(input.formData.get("expensesMultiplier"), 2);
    const baseCredits = input.dailyCredits.reduce((sum, value) => sum + value, 0);
    const expenseCreditsUsd = input.expenseItems.reduce(
      (sum, item) =>
        sum +
        (item.currency === "EUR" ? item.amount * input.exchangeRate : item.amount) *
          expensesMultiplier,
      0
    );
    const baseUsd = input.currency === "EUR" ? baseCredits * input.exchangeRate : baseCredits;

    return {
      currency: input.currency,
      originalAmount: roundCurrency(baseCredits),
      convertedAmountUsd: roundCurrency(baseUsd + expenseCreditsUsd),
      attributedToTransactionId: null,
      expensesMultiplier
    };
  }

  if (input.type === "rental_tour") {
    const expensesMultiplier = numberValue(input.formData.get("expensesMultiplier"), 2);
    const expenseCreditsUsd = input.expenseItems.reduce(
      (sum, item) =>
        sum +
        (item.currency === "EUR" ? item.amount * input.exchangeRate : item.amount) *
          expensesMultiplier,
      0
    );

    return {
      currency: "USD" as Currency,
      originalAmount: roundCurrency(expenseCreditsUsd),
      convertedAmountUsd: roundCurrency(expenseCreditsUsd),
      attributedToTransactionId: null,
      expensesMultiplier
    };
  }

  if (input.type === "expense") {
    const amount = numberValue(input.formData.get("expenseAmount"));
    const currency = enumValue<Currency>(input.formData.get("expenseCurrency"), input.currency);
    const multiplier = numberValue(input.formData.get("expensesMultiplier"), 1);
    const credit = amount * multiplier;

    return {
      currency,
      originalAmount: roundCurrency(credit),
      convertedAmountUsd: roundCurrency(currency === "EUR" ? credit * input.exchangeRate : credit),
      attributedToTransactionId: linkedSource,
      expensesMultiplier: multiplier
    };
  }

  const usdCreditUsed = numberValue(input.formData.get("usdCreditUsed"));
  const eurCreditConverted = numberValue(input.formData.get("eurCreditConverted"));
  const convertedUsdAmount = eurCreditConverted * input.exchangeRate;
  const totalSpendUsd = usdCreditUsed + convertedUsdAmount;

  return {
    currency: "USD" as Currency,
    originalAmount: -roundCurrency(totalSpendUsd),
    convertedAmountUsd: -roundCurrency(totalSpendUsd),
    attributedToTransactionId: null,
    usdCreditUsed,
    eurCreditConverted,
    convertedUsdAmount
  };
}

async function insertDetailRecord(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  type: TransactionType;
  transactionId: string;
  formData: FormData;
  detail: ReturnType<typeof buildTransactionPayload>;
  expenseItems: z.infer<typeof expenseItemSchema>[];
  dailyCredits: number[];
}) {
  if (input.type === "sale") {
    const { error } = await input.supabase.from("sale_details").insert({
      transaction_id: input.transactionId,
      sale_amount: "saleAmount" in input.detail ? input.detail.saleAmount : 0,
      sale_currency: "saleCurrency" in input.detail ? input.detail.saleCurrency : "USD",
      credit_percentage:
        "creditPercentage" in input.detail ? input.detail.creditPercentage : 10,
      linked_source_transaction_id:
        "linkedSource" in input.detail ? input.detail.linkedSource : null
    });

    if (error) {
      throw error;
    }
  }

  if (input.type === "expo") {
    const { error } = await input.supabase.from("expo_details").insert({
      transaction_id: input.transactionId,
      expo_name: stringValue(input.formData.get("expoName")) || stringValue(input.formData.get("title")),
      start_date: stringValue(input.formData.get("date")),
      days_count: Math.max(1, numberValue(input.formData.get("daysCount"), 1)),
      default_credit_per_day: numberValue(input.formData.get("defaultCreditPerDay"), 1000),
      daily_credits: input.dailyCredits,
      expenses_multiplier:
        "expensesMultiplier" in input.detail ? input.detail.expensesMultiplier : 2
    });

    if (error) {
      throw error;
    }
  }

  if (input.type === "rental_tour") {
    const { error } = await input.supabase.from("rental_tour_details").insert({
      transaction_id: input.transactionId,
      tour_name: stringValue(input.formData.get("tourName")) || stringValue(input.formData.get("title")),
      start_date: stringValue(input.formData.get("date")),
      expenses_multiplier:
        "expensesMultiplier" in input.detail ? input.detail.expensesMultiplier : 2
    });

    if (error) {
      throw error;
    }
  }

  if (input.type === "purchase") {
    const { error } = await input.supabase.from("purchase_details").insert({
      transaction_id: input.transactionId,
      purchase_name:
        stringValue(input.formData.get("purchaseName")) ||
        stringValue(input.formData.get("title")),
      usd_credit_used: "usdCreditUsed" in input.detail ? input.detail.usdCreditUsed : 0,
      eur_credit_converted:
        "eurCreditConverted" in input.detail ? input.detail.eurCreditConverted : 0,
      converted_usd_amount:
        "convertedUsdAmount" in input.detail ? input.detail.convertedUsdAmount : 0,
      exchange_rate_snapshot: numberValue(input.formData.get("exchangeRate"), 1),
      payment_mode: enumValue(
        input.formData.get("paymentMode"),
        "mixed"
      )
    });

    if (error) {
      throw error;
    }
  }
}

async function syncTags(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  transactionId: string;
  tags: string;
}) {
  const tagNames = input.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (tagNames.length === 0) {
    return;
  }

  for (const name of tagNames) {
    const { data: existingTag, error: selectError } = await input.supabase
      .from("tags")
      .select("*")
      .eq("user_id", input.userId)
      .eq("name", name)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    const tag =
      existingTag ??
      (
        await input.supabase
          .from("tags")
          .insert({ user_id: input.userId, name })
          .select("*")
          .single()
      ).data;

    if (!tag) {
      continue;
    }

    const { error } = await input.supabase.from("transaction_tags").insert({
      transaction_id: input.transactionId,
      tag_id: tag.id,
      user_id: input.userId
    });

    if (error && error.code !== "23505") {
      throw error;
    }
  }
}

function parseExpenseItems(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) {
    return [];
  }

  const parsed = JSON.parse(value) as unknown;
  const result = z.array(expenseItemSchema).safeParse(parsed);
  return result.success ? result.data : [];
}

function parseDailyCredits(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) {
    return [1000];
  }

  const parsed = JSON.parse(value) as unknown;
  const result = z.array(z.coerce.number().nonnegative()).safeParse(parsed);
  return result.success && result.data.length > 0 ? result.data : [1000];
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function enumValue<T extends string>(value: FormDataEntryValue | null, fallback: T) {
  return typeof value === "string" && value ? (value as T) : fallback;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

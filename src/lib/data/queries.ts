import { buildDashboardData } from "@/lib/calculations";
import { getDefaultEurUsdRate } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  DashboardData,
  ExpenseItem,
  ExpoDetail,
  Profile,
  PurchaseDetail,
  Reminder,
  RentalTourDetail,
  SaleDetail,
  Tag,
  TimelineEvent,
  Transaction
} from "@/lib/types/domain";

type TransactionTagRow = {
  transaction_id: string;
  tag_id: string;
};

export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return data as Profile | null;
}

export async function getDashboardData(userId?: string): Promise<DashboardData> {
  const supabase = await createClient();
  const scopedTransactions = supabase
    .from("transactions")
    .select("*")
    .is("deleted_at", null)
    .order("date", { ascending: true });

  if (userId) {
    scopedTransactions.eq("user_id", userId);
  }

  const [
    transactionsResult,
    saleDetailsResult,
    expoDetailsResult,
    rentalTourDetailsResult,
    expenseItemsResult,
    purchaseDetailsResult,
    tagsResult,
    transactionTagsResult,
    remindersResult
  ] = await Promise.all([
    scopedTransactions,
    supabase.from("sale_details").select("*"),
    supabase.from("expo_details").select("*"),
    supabase.from("rental_tour_details").select("*"),
    supabase.from("expense_items").select("*"),
    supabase.from("purchase_details").select("*"),
    supabase.from("tags").select("*"),
    supabase.from("transaction_tags").select("*"),
    supabase.from("reminders").select("*").order("due_date", { ascending: true })
  ]);

  const transactions = (transactionsResult.data ?? []) as Transaction[];
  const transactionIds = new Set(transactions.map((transaction) => transaction.id));
  const saleDetails = filterByTransactionId(
    (saleDetailsResult.data ?? []) as SaleDetail[],
    transactionIds
  );
  const expoDetails = filterByTransactionId(
    (expoDetailsResult.data ?? []) as ExpoDetail[],
    transactionIds
  );
  const rentalTourDetails = filterByTransactionId(
    (rentalTourDetailsResult.data ?? []) as RentalTourDetail[],
    transactionIds
  );
  const expenseItems = filterByTransactionId(
    (expenseItemsResult.data ?? []) as ExpenseItem[],
    transactionIds
  );
  const purchaseDetails = filterByTransactionId(
    (purchaseDetailsResult.data ?? []) as PurchaseDetail[],
    transactionIds
  );
  const reminders = ((remindersResult.data ?? []) as Reminder[]).filter(
    (reminder) => !reminder.transaction_id || transactionIds.has(reminder.transaction_id)
  );
  const tagsByTransaction = buildTagsByTransaction(
    (tagsResult.data ?? []) as Tag[],
    (transactionTagsResult.data ?? []) as TransactionTagRow[],
    transactionIds
  );

  return buildDashboardData({
    transactions,
    saleDetails,
    expoDetails: normalizeExpoDetails(expoDetails),
    rentalTourDetails,
    expenseItems,
    purchaseDetails,
    tagsByTransaction,
    reminders,
    eurUsdRate: getDefaultEurUsdRate()
  });
}

export async function getDeletedTransactions(userId: string): Promise<TimelineEvent[]> {
  const supabase = await createClient();
  const { data: transactionData } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  const transactions = (transactionData ?? []) as Transaction[];
  if (transactions.length === 0) {
    return [];
  }

  const transactionIds = new Set(transactions.map((transaction) => transaction.id));
  const [saleDetailsResult, tagsResult, transactionTagsResult] = await Promise.all([
    supabase.from("sale_details").select("*"),
    supabase.from("tags").select("*"),
    supabase.from("transaction_tags").select("*")
  ]);
  const tagsByTransaction = buildTagsByTransaction(
    (tagsResult.data ?? []) as Tag[],
    (transactionTagsResult.data ?? []) as TransactionTagRow[],
    transactionIds
  );
  const transactionsById = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  const saleByTransaction = new Map(
    filterByTransactionId((saleDetailsResult.data ?? []) as SaleDetail[], transactionIds).map(
      (detail) => [detail.transaction_id, detail]
    )
  );

  return transactions.map((transaction) => {
    const linkedId =
      transaction.attributed_to_transaction_id ??
      saleByTransaction.get(transaction.id)?.linked_source_transaction_id ??
      null;

    return {
      ...transaction,
      tags: tagsByTransaction[transaction.id] ?? [],
      linkedTitle: linkedId ? transactionsById.get(linkedId)?.title : undefined
    };
  });
}

export async function getAdminProfiles() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []) as Profile[];
}

function normalizeExpoDetails(details: ExpoDetail[]) {
  return details.map((detail) => ({
    ...detail,
    daily_credits: Array.isArray(detail.daily_credits)
      ? detail.daily_credits.map(Number)
      : []
  }));
}

function filterByTransactionId<T extends { transaction_id: string }>(
  rows: T[],
  transactionIds: Set<string>
) {
  return rows.filter((row) => transactionIds.has(row.transaction_id));
}

function buildTagsByTransaction(
  tags: Tag[],
  transactionTags: TransactionTagRow[],
  transactionIds: Set<string>
) {
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

  return transactionTags.reduce<Record<string, Tag[]>>((acc, row) => {
    if (!transactionIds.has(row.transaction_id)) {
      return acc;
    }

    const tag = tagsById.get(row.tag_id);
    if (tag) {
      acc[row.transaction_id] = [...(acc[row.transaction_id] ?? []), tag];
    }

    return acc;
  }, {});
}

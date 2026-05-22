import { buildDashboardData } from "@/lib/calculations";
import { getDefaultEurUsdRate, hasSupabaseEnv } from "@/lib/env";
import { demoProfile, getDemoDashboardData, getDemoProfiles } from "@/lib/data/demo";
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
  Transaction
} from "@/lib/types/domain";

export async function getProfile(userId: string) {
  if (!hasSupabaseEnv()) {
    return demoProfile;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return data as Profile | null;
}

export async function getDashboardData(userId?: string): Promise<DashboardData> {
  if (!hasSupabaseEnv() || !userId) {
    return getDemoDashboardData();
  }

  const supabase = await createClient();
  const scopedTransactions = supabase
    .from("transactions")
    .select("*")
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

  const tags = (tagsResult.data ?? []) as Tag[];
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const tagsByTransaction = (transactionTagsResult.data ?? []).reduce<
    Record<string, Tag[]>
  >((acc, row) => {
    const tag = tagsById.get(String(row.tag_id));
    if (tag) {
      acc[String(row.transaction_id)] = [
        ...(acc[String(row.transaction_id)] ?? []),
        tag
      ];
    }
    return acc;
  }, {});

  return buildDashboardData({
    transactions: (transactionsResult.data ?? []) as Transaction[],
    saleDetails: (saleDetailsResult.data ?? []) as SaleDetail[],
    expoDetails: normalizeExpoDetails((expoDetailsResult.data ?? []) as ExpoDetail[]),
    rentalTourDetails: (rentalTourDetailsResult.data ?? []) as RentalTourDetail[],
    expenseItems: (expenseItemsResult.data ?? []) as ExpenseItem[],
    purchaseDetails: (purchaseDetailsResult.data ?? []) as PurchaseDetail[],
    tagsByTransaction,
    reminders: (remindersResult.data ?? []) as Reminder[],
    eurUsdRate: getDefaultEurUsdRate()
  });
}

export async function getAdminProfiles() {
  if (!hasSupabaseEnv()) {
    return getDemoProfiles();
  }

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

export type Currency = "EUR" | "USD";

export type TransactionType =
  | "sale"
  | "expo"
  | "rental_tour"
  | "expense"
  | "purchase";

export type ProfileRole = "ambassador" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: TransactionType;
  title: string;
  description: string | null;
  date: string;
  currency: Currency;
  original_amount: number;
  converted_amount_usd: number | null;
  exchange_rate_snapshot: number | null;
  attributed_to_transaction_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SaleDetail = {
  transaction_id: string;
  sale_amount: number;
  sale_currency: Currency;
  credit_percentage: number;
  linked_source_transaction_id: string | null;
};

export type ExpoDetail = {
  transaction_id: string;
  expo_name: string;
  start_date: string;
  days_count: number;
  default_credit_per_day: number;
  daily_credits: number[];
  expenses_multiplier: number;
};

export type RentalTourDetail = {
  transaction_id: string;
  tour_name: string;
  start_date: string;
  expenses_multiplier: number;
};

export type ExpenseItem = {
  id: string;
  transaction_id: string;
  user_id: string;
  label: string;
  amount: number;
  currency: Currency;
  converted_amount_usd: number | null;
  exchange_rate_snapshot: number | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseDetail = {
  transaction_id: string;
  purchase_name: string;
  usd_credit_used: number;
  eur_credit_converted: number;
  converted_usd_amount: number;
  exchange_rate_snapshot: number | null;
  payment_mode: "usd_credit" | "eur_to_usd" | "mixed";
};

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  color: string;
};

export type Reminder = {
  id: string;
  user_id: string;
  transaction_id: string | null;
  title: string;
  due_date: string;
  status: "open" | "done";
  notes: string | null;
};

export type TimelineEvent = Transaction & {
  tags: Tag[];
  linkedTitle?: string;
};

export type MetricCard = {
  label: string;
  value: string;
  accent: "gold" | "teal" | "silver" | "danger";
  helper?: string;
};

export type GrowthPoint = {
  date: string;
  earned: number;
  balance: number;
};

export type BreakdownPoint = {
  type: TransactionType;
  value: number;
};

export type ProfitabilityPoint = {
  id: string;
  name: string;
  type: "expo" | "rental_tour";
  costUsd: number;
  salesUsd: number;
  roi: number;
};

export type DashboardData = {
  transactions: TimelineEvent[];
  saleDetails: SaleDetail[];
  expoDetails: ExpoDetail[];
  rentalTourDetails: RentalTourDetail[];
  expenseItems: ExpenseItem[];
  purchaseDetails: PurchaseDetail[];
  reminders: Reminder[];
  sourceTransactions: Transaction[];
  metrics: {
    totalCreditUsd: number;
    totalEarnedUsd: number;
    totalSpentUsd: number;
    currentBalanceUsd: number;
    eurReserve: number;
    usdReserve: number;
  };
  growth: GrowthPoint[];
  breakdown: BreakdownPoint[];
  profitability: ProfitabilityPoint[];
  insights: {
    topExpo: ProfitabilityPoint | null;
    topRentalTour: ProfitabilityPoint | null;
    averageRoi: number;
    biggestIncomeType: TransactionType | null;
    yearlyGrowth: number;
    mostValuableSource: ProfitabilityPoint | null;
  };
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  sale: "Sale",
  expo: "Expo",
  rental_tour: "Rental tour",
  expense: "Expense",
  purchase: "Purchase"
};

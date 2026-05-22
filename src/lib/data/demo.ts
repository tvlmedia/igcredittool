import { buildDashboardData } from "@/lib/calculations";
import { getDefaultEurUsdRate } from "@/lib/env";
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

const demoUserId = "00000000-0000-4000-8000-000000000001";

export const demoProfile: Profile = {
  id: demoUserId,
  email: "demo@ironglass.com",
  full_name: "IronGlass Preview",
  company: "IronGlass",
  role: "admin",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-05-22T00:00:00.000Z"
};

const transactions: Transaction[] = [
  {
    id: "expo-nab-2025",
    user_id: demoUserId,
    type: "expo",
    title: "NAB Las Vegas",
    description: "Four-day IronGlass booth, follow-ups with rental houses and DPs.",
    date: "2025-04-08",
    currency: "EUR",
    original_amount: 4000,
    converted_amount_usd: 4320,
    exchange_rate_snapshot: 1.08,
    attributed_to_transaction_id: null,
    created_at: "2025-04-08T08:00:00.000Z",
    updated_at: "2025-04-08T08:00:00.000Z"
  },
  {
    id: "rental-tour-cooke",
    user_id: demoUserId,
    type: "rental_tour",
    title: "Cooke rental tour",
    description: "Amsterdam, Berlin and Paris demo run.",
    date: "2025-09-14",
    currency: "USD",
    original_amount: 5200,
    converted_amount_usd: 5200,
    exchange_rate_snapshot: 1,
    attributed_to_transaction_id: null,
    created_at: "2025-09-14T08:00:00.000Z",
    updated_at: "2025-09-14T08:00:00.000Z"
  },
  {
    id: "sale-zeiss-followup",
    user_id: demoUserId,
    type: "sale",
    title: "Zeiss Supreme follow-up sale",
    description: "Credit from NAB lead converting after lens tests.",
    date: "2025-10-03",
    currency: "USD",
    original_amount: 9400,
    converted_amount_usd: 9400,
    exchange_rate_snapshot: 1,
    attributed_to_transaction_id: "expo-nab-2025",
    created_at: "2025-10-03T08:00:00.000Z",
    updated_at: "2025-10-03T08:00:00.000Z"
  },
  {
    id: "expense-import",
    user_id: demoUserId,
    type: "expense",
    title: "Import duties",
    description: "Customs and freight for demo glass.",
    date: "2026-01-18",
    currency: "EUR",
    original_amount: 1800,
    converted_amount_usd: 1944,
    exchange_rate_snapshot: 1.08,
    attributed_to_transaction_id: null,
    created_at: "2026-01-18T08:00:00.000Z",
    updated_at: "2026-01-18T08:00:00.000Z"
  },
  {
    id: "expo-cinegear-2026",
    user_id: demoUserId,
    type: "expo",
    title: "CineGear LA",
    description: "Three days plus private tests with rental partners.",
    date: "2026-03-06",
    currency: "EUR",
    original_amount: 3300,
    converted_amount_usd: 3564,
    exchange_rate_snapshot: 1.08,
    attributed_to_transaction_id: null,
    created_at: "2026-03-06T08:00:00.000Z",
    updated_at: "2026-03-06T08:00:00.000Z"
  },
  {
    id: "sale-cinegear-package",
    user_id: demoUserId,
    type: "sale",
    title: "IronGlass MKII package",
    description: "CineGear lead closed with mixed EUR/USD reserve.",
    date: "2026-04-12",
    currency: "USD",
    original_amount: 16250,
    converted_amount_usd: 16250,
    exchange_rate_snapshot: 1,
    attributed_to_transaction_id: "expo-cinegear-2026",
    created_at: "2026-04-12T08:00:00.000Z",
    updated_at: "2026-04-12T08:00:00.000Z"
  },
  {
    id: "purchase-mkii-set",
    user_id: demoUserId,
    type: "purchase",
    title: "New MKII lens set",
    description: "Credit spend for ambassador demo inventory.",
    date: "2026-05-10",
    currency: "USD",
    original_amount: -18500,
    converted_amount_usd: -18500,
    exchange_rate_snapshot: 1.08,
    attributed_to_transaction_id: null,
    created_at: "2026-05-10T08:00:00.000Z",
    updated_at: "2026-05-10T08:00:00.000Z"
  }
];

const saleDetails: SaleDetail[] = [
  {
    transaction_id: "sale-zeiss-followup",
    sale_amount: 94000,
    sale_currency: "USD",
    credit_percentage: 10,
    linked_source_transaction_id: "expo-nab-2025"
  },
  {
    transaction_id: "sale-cinegear-package",
    sale_amount: 162500,
    sale_currency: "USD",
    credit_percentage: 10,
    linked_source_transaction_id: "expo-cinegear-2026"
  }
];

const expoDetails: ExpoDetail[] = [
  {
    transaction_id: "expo-nab-2025",
    expo_name: "NAB Las Vegas",
    start_date: "2025-04-08",
    days_count: 4,
    default_credit_per_day: 1000,
    daily_credits: [1000, 1000, 1000, 1000],
    expenses_multiplier: 2
  },
  {
    transaction_id: "expo-cinegear-2026",
    expo_name: "CineGear LA",
    start_date: "2026-03-06",
    days_count: 3,
    default_credit_per_day: 1000,
    daily_credits: [1000, 1100, 1200],
    expenses_multiplier: 2
  }
];

const rentalTourDetails: RentalTourDetail[] = [
  {
    transaction_id: "rental-tour-cooke",
    tour_name: "Cooke rental tour",
    start_date: "2025-09-14",
    expenses_multiplier: 2
  }
];

const expenseItems: ExpenseItem[] = [
  {
    id: "expense-hotel-nab",
    transaction_id: "expo-nab-2025",
    user_id: demoUserId,
    label: "Hotel",
    amount: 2200,
    currency: "USD",
    converted_amount_usd: 2200,
    exchange_rate_snapshot: 1,
    created_at: "2025-04-08T08:00:00.000Z",
    updated_at: "2025-04-08T08:00:00.000Z"
  },
  {
    id: "expense-freight-cinegear",
    transaction_id: "expo-cinegear-2026",
    user_id: demoUserId,
    label: "Freight",
    amount: 1400,
    currency: "USD",
    converted_amount_usd: 1400,
    exchange_rate_snapshot: 1,
    created_at: "2026-03-06T08:00:00.000Z",
    updated_at: "2026-03-06T08:00:00.000Z"
  },
  {
    id: "expense-hotels-tour",
    transaction_id: "rental-tour-cooke",
    user_id: demoUserId,
    label: "Hotels and taxi",
    amount: 2600,
    currency: "EUR",
    converted_amount_usd: 2808,
    exchange_rate_snapshot: 1.08,
    created_at: "2025-09-14T08:00:00.000Z",
    updated_at: "2025-09-14T08:00:00.000Z"
  }
];

const purchaseDetails: PurchaseDetail[] = [
  {
    transaction_id: "purchase-mkii-set",
    purchase_name: "New MKII lens set",
    usd_credit_used: 12000,
    eur_credit_converted: 6018.52,
    converted_usd_amount: 6500,
    exchange_rate_snapshot: 1.08,
    payment_mode: "mixed"
  }
];

const reminders: Reminder[] = [
  {
    id: "reminder-cinegear-followup",
    user_id: demoUserId,
    transaction_id: "expo-cinegear-2026",
    title: "Follow up CineGear leads",
    due_date: "2026-05-30",
    status: "open",
    notes: "Send updated quote and delivery timing."
  },
  {
    id: "reminder-import-docs",
    user_id: demoUserId,
    transaction_id: "expense-import",
    title: "Upload import documents",
    due_date: "2026-06-04",
    status: "open",
    notes: "Attach customs receipt to expense record."
  }
];

const tags: Tag[] = [
  { id: "tag-nab", user_id: demoUserId, name: "NAB", color: "#e1b45f" },
  { id: "tag-cinegear", user_id: demoUserId, name: "CineGear", color: "#77f2d5" },
  { id: "tag-paris", user_id: demoUserId, name: "Paris", color: "#f4cf86" },
  { id: "tag-zeiss", user_id: demoUserId, name: "Zeiss", color: "#e1b45f" },
  { id: "tag-cooke", user_id: demoUserId, name: "Cooke", color: "#77f2d5" }
];

const tagsByTransaction: Record<string, Tag[]> = {
  "expo-nab-2025": [tags[0], tags[3]],
  "rental-tour-cooke": [tags[2], tags[4]],
  "sale-zeiss-followup": [tags[0], tags[3]],
  "expo-cinegear-2026": [tags[1]],
  "sale-cinegear-package": [tags[1]],
  "purchase-mkii-set": [tags[4]]
};

export function getDemoDashboardData(): DashboardData {
  return buildDashboardData({
    transactions,
    saleDetails,
    expoDetails,
    rentalTourDetails,
    expenseItems,
    purchaseDetails,
    tagsByTransaction,
    reminders,
    eurUsdRate: getDefaultEurUsdRate()
  });
}

export function getDemoProfiles(): Profile[] {
  return [
    demoProfile,
    {
      id: "00000000-0000-4000-8000-000000000002",
      email: "la@ironglass.com",
      full_name: "LA Rental Partner",
      company: "IronGlass",
      role: "ambassador",
      created_at: "2026-02-12T00:00:00.000Z",
      updated_at: "2026-05-22T00:00:00.000Z"
    }
  ];
}

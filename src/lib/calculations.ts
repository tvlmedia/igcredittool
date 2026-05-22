import type {
  BreakdownPoint,
  DashboardData,
  ExpenseItem,
  ExpoDetail,
  GrowthPoint,
  ProfitabilityPoint,
  PurchaseDetail,
  RentalTourDetail,
  SaleDetail,
  Tag,
  TimelineEvent,
  Transaction,
  TransactionType
} from "@/lib/types/domain";

const incomeTypes: TransactionType[] = ["sale", "expo", "rental_tour", "expense"];
const trackedTypes: TransactionType[] = [
  "sale",
  "expo",
  "rental_tour",
  "expense",
  "purchase"
];

export function amountToUsd(transaction: Transaction, eurUsdRate: number) {
  if (transaction.currency === "EUR") {
    return Number(transaction.original_amount) * eurUsdRate;
  }

  return Number(transaction.original_amount);
}

export function expenseToUsd(item: ExpenseItem, eurUsdRate: number) {
  if (item.currency === "EUR") {
    return Number(item.amount) * eurUsdRate;
  }

  return Number(item.amount);
}

export function buildDashboardData(input: {
  transactions: Transaction[];
  saleDetails: SaleDetail[];
  expoDetails: ExpoDetail[];
  rentalTourDetails: RentalTourDetail[];
  expenseItems: ExpenseItem[];
  purchaseDetails: PurchaseDetail[];
  tagsByTransaction: Record<string, Tag[]>;
  reminders: DashboardData["reminders"];
  eurUsdRate: number;
}): DashboardData {
  const sortedTransactions = [...input.transactions].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const transactionsById = new Map(sortedTransactions.map((item) => [item.id, item]));
  const saleByTransaction = new Map(
    input.saleDetails.map((detail) => [detail.transaction_id, detail])
  );
  const expoByTransaction = new Map(
    input.expoDetails.map((detail) => [detail.transaction_id, detail])
  );
  const rentalByTransaction = new Map(
    input.rentalTourDetails.map((detail) => [detail.transaction_id, detail])
  );
  const purchaseByTransaction = new Map(
    input.purchaseDetails.map((detail) => [detail.transaction_id, detail])
  );
  const expenseItemsByTransaction = groupBy(
    input.expenseItems,
    (item) => item.transaction_id
  );

  let totalEarnedUsd = 0;
  let totalSpentUsd = 0;
  let eurReserve = 0;
  let usdReserve = 0;
  let cumulativeEarned = 0;
  let cumulativeBalance = 0;
  const growth: GrowthPoint[] = [];

  const breakdownMap = new Map<TransactionType, number>(
    trackedTypes.map((type) => [type, 0])
  );

  for (const transaction of sortedTransactions) {
    const amountUsd = transactionAmountToUsd({
      transaction,
      eurUsdRate: input.eurUsdRate,
      expenseItems: expenseItemsByTransaction.get(transaction.id) ?? [],
      expoDetail: expoByTransaction.get(transaction.id),
      rentalTourDetail: rentalByTransaction.get(transaction.id)
    });
    const isIncome = incomeTypes.includes(transaction.type);

    if (isIncome) {
      totalEarnedUsd += Math.max(amountUsd, 0);
      cumulativeEarned += Math.max(amountUsd, 0);
    } else {
      totalSpentUsd += Math.abs(Math.min(amountUsd, 0));
    }

    cumulativeBalance += amountUsd;
    breakdownMap.set(
      transaction.type,
      (breakdownMap.get(transaction.type) ?? 0) + Math.abs(amountUsd)
    );

    if (transaction.type === "purchase") {
      const purchase = purchaseByTransaction.get(transaction.id);
      usdReserve -= purchase?.usd_credit_used ?? Math.abs(transaction.original_amount);
      eurReserve -= purchase?.eur_credit_converted ?? 0;
    } else if (transaction.type === "expo" || transaction.type === "rental_tour") {
      const expo = expoByTransaction.get(transaction.id);
      const rental = rentalByTransaction.get(transaction.id);
      const multiplier = expo?.expenses_multiplier ?? rental?.expenses_multiplier ?? 1;

      if (transaction.type === "expo") {
        if (transaction.currency === "EUR") {
          eurReserve += Number(transaction.original_amount);
        } else {
          usdReserve += Number(transaction.original_amount);
        }
      }

      for (const item of expenseItemsByTransaction.get(transaction.id) ?? []) {
        if (item.currency === "EUR") {
          eurReserve += Number(item.amount) * multiplier;
        } else {
          usdReserve += Number(item.amount) * multiplier;
        }
      }
    } else if (transaction.currency === "EUR") {
      eurReserve += Number(transaction.original_amount);
    } else {
      usdReserve += Number(transaction.original_amount);
    }

    growth.push({
      date: transaction.date,
      earned: Math.round(cumulativeEarned),
      balance: Math.round(cumulativeBalance)
    });
  }

  const sourceTransactions = sortedTransactions.filter(
    (transaction) =>
      transaction.type === "expo" || transaction.type === "rental_tour"
  );

  const linkedSalesBySource = new Map<string, SaleDetail[]>();
  for (const sale of input.saleDetails) {
    const sourceId = sale.linked_source_transaction_id;
    if (!sourceId) {
      continue;
    }

    linkedSalesBySource.set(sourceId, [
      ...(linkedSalesBySource.get(sourceId) ?? []),
      sale
    ]);
  }

  const profitability: ProfitabilityPoint[] = sourceTransactions.map((source) => {
    const expo = expoByTransaction.get(source.id);
    const rental = rentalByTransaction.get(source.id);
    const multiplier = expo?.expenses_multiplier ?? rental?.expenses_multiplier ?? 1;
    const expenseCostUsd = (expenseItemsByTransaction.get(source.id) ?? []).reduce(
      (sum, item) => sum + expenseToUsd(item, input.eurUsdRate),
      0
    );
    const salesUsd = (linkedSalesBySource.get(source.id) ?? []).reduce(
      (sum, sale) =>
        sum +
        (sale.sale_currency === "EUR"
          ? Number(sale.sale_amount) * input.eurUsdRate
          : Number(sale.sale_amount)),
      0
    );
    const costUsd = expenseCostUsd * multiplier;

    return {
      id: source.id,
      name: expo?.expo_name ?? rental?.tour_name ?? source.title,
      type: source.type === "expo" ? "expo" : "rental_tour",
      costUsd: Math.round(costUsd),
      salesUsd: Math.round(salesUsd),
      roi: costUsd > 0 ? ((salesUsd - costUsd) / costUsd) * 100 : salesUsd > 0 ? 100 : 0
    };
  });

  const timeline: TimelineEvent[] = [...sortedTransactions]
    .reverse()
    .map((transaction) => {
      const linkedId =
        transaction.attributed_to_transaction_id ??
        saleByTransaction.get(transaction.id)?.linked_source_transaction_id ??
        null;
      const linkedTitle = linkedId ? transactionsById.get(linkedId)?.title : undefined;

      return {
        ...transaction,
        tags: input.tagsByTransaction[transaction.id] ?? [],
        linkedTitle
      };
    });

  const breakdown = Array.from(breakdownMap.entries()).map<BreakdownPoint>(
    ([type, value]) => ({ type, value: Math.round(value) })
  );

  const biggestIncomeType =
    breakdown
      .filter((item) => incomeTypes.includes(item.type))
      .sort((a, b) => b.value - a.value)[0]?.type ?? null;

  function getTransactionAmount(transaction: Transaction) {
    return transactionAmountToUsd({
      transaction,
      eurUsdRate: input.eurUsdRate,
      expenseItems: expenseItemsByTransaction.get(transaction.id) ?? [],
      expoDetail: expoByTransaction.get(transaction.id),
      rentalTourDetail: rentalByTransaction.get(transaction.id)
    });
  }

  const currentYear = new Date().getFullYear();
  const currentYearEarned = sortedTransactions
    .filter((transaction) => new Date(transaction.date).getFullYear() === currentYear)
    .filter((transaction) => incomeTypes.includes(transaction.type))
    .reduce((sum, transaction) => sum + getTransactionAmount(transaction), 0);
  const previousYearEarned = sortedTransactions
    .filter(
      (transaction) => new Date(transaction.date).getFullYear() === currentYear - 1
    )
    .filter((transaction) => incomeTypes.includes(transaction.type))
    .reduce((sum, transaction) => sum + getTransactionAmount(transaction), 0);

  const yearlyGrowth =
    previousYearEarned > 0
      ? ((currentYearEarned - previousYearEarned) / previousYearEarned) * 100
      : currentYearEarned > 0
        ? 100
        : 0;

  const sortedProfitability = [...profitability].sort((a, b) => b.salesUsd - a.salesUsd);

  return {
    transactions: timeline,
    saleDetails: input.saleDetails,
    expoDetails: input.expoDetails,
    rentalTourDetails: input.rentalTourDetails,
    expenseItems: input.expenseItems,
    purchaseDetails: input.purchaseDetails,
    reminders: input.reminders,
    sourceTransactions,
    metrics: {
      totalCreditUsd: Math.round(totalEarnedUsd - totalSpentUsd),
      totalEarnedUsd: Math.round(totalEarnedUsd),
      totalSpentUsd: Math.round(totalSpentUsd),
      currentBalanceUsd: Math.round(totalEarnedUsd - totalSpentUsd),
      eurReserve: Math.round(eurReserve),
      usdReserve: Math.round(usdReserve)
    },
    growth,
    breakdown,
    profitability,
    insights: {
      topExpo:
        profitability
          .filter((item) => item.type === "expo")
          .sort((a, b) => b.salesUsd - a.salesUsd)[0] ?? null,
      topRentalTour:
        profitability
          .filter((item) => item.type === "rental_tour")
          .sort((a, b) => b.salesUsd - a.salesUsd)[0] ?? null,
      averageRoi: profitability.length
        ? profitability.reduce((sum, item) => sum + item.roi, 0) / profitability.length
        : 0,
      biggestIncomeType,
      yearlyGrowth,
      mostValuableSource: sortedProfitability[0] ?? null
    }
  };
}

function transactionAmountToUsd(input: {
  transaction: Transaction;
  eurUsdRate: number;
  expenseItems: ExpenseItem[];
  expoDetail?: ExpoDetail;
  rentalTourDetail?: RentalTourDetail;
}) {
  if (input.transaction.type === "expo") {
    const baseUsd = amountToUsd(input.transaction, input.eurUsdRate);
    const multiplier = input.expoDetail?.expenses_multiplier ?? 1;
    const expenseUsd = input.expenseItems.reduce(
      (sum, item) => sum + expenseToUsd(item, input.eurUsdRate) * multiplier,
      0
    );
    return baseUsd + expenseUsd;
  }

  if (input.transaction.type === "rental_tour") {
    const multiplier = input.rentalTourDetail?.expenses_multiplier ?? 1;
    const expenseUsd = input.expenseItems.reduce(
      (sum, item) => sum + expenseToUsd(item, input.eurUsdRate) * multiplier,
      0
    );
    return expenseUsd || amountToUsd(input.transaction, input.eurUsdRate);
  }

  return amountToUsd(input.transaction, input.eurUsdRate);
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce((map, item) => {
    const key = getKey(item);
    map.set(key, [...(map.get(key) ?? []), item]);
    return map;
  }, new Map<string, T[]>());
}

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
  TransactionAttachment,
  TransactionType,
  Currency
} from "@/lib/types/domain";

const incomeTypes: TransactionType[] = ["sale", "expo", "rental_tour", "expense"];
const trackedTypes: TransactionType[] = [
  "sale",
  "expo",
  "rental_tour",
  "expense",
  "purchase"
];

export type CurrencyAmount = {
  currency: Currency;
  amount: number;
};

export type TransactionCalculationBreakdown = {
  transactionId: string;
  type: TransactionType;
  originalAmount: number;
  currency: Currency;
  exchangeRateSnapshot: number | null;
  grossCredit: CurrencyAmount;
  expenses: CurrencyAmount[];
  multiplier: number;
  finalCreditEarned: CurrencyAmount[];
  usdEquivalent: number;
  eurReserveImpact: number;
  usdReserveImpact: number;
  saleAmount?: CurrencyAmount;
  creditPercentage?: number;
  days?: number;
  dailyCreditAmount?: CurrencyAmount;
  paymentMode?: PurchaseDetail["payment_mode"];
};

export function amountToUsd(transaction: Transaction, eurUsdRate: number) {
  if (transaction.currency === "EUR") {
    return Number(transaction.original_amount) * snapshotRate(transaction.exchange_rate_snapshot, eurUsdRate);
  }

  return Number(transaction.original_amount);
}

export function expenseToUsd(item: ExpenseItem, eurUsdRate: number) {
  if (item.currency === "EUR") {
    return Number(item.amount) * snapshotRate(item.exchange_rate_snapshot, eurUsdRate);
  }

  return Number(item.amount);
}

export function calculateTransactionBreakdown(input: {
  transaction: Transaction;
  eurUsdRate: number;
  expenseItems: ExpenseItem[];
  saleDetail?: SaleDetail;
  expoDetail?: ExpoDetail;
  rentalTourDetail?: RentalTourDetail;
  purchaseDetail?: PurchaseDetail;
}): TransactionCalculationBreakdown {
  const originalAmount = Number(input.transaction.original_amount);
  const exchangeRateSnapshot =
    input.transaction.exchange_rate_snapshot === null
      ? null
      : Number(input.transaction.exchange_rate_snapshot);
  const base: CurrencyAmount = {
    currency: input.transaction.currency,
    amount: originalAmount
  };
  const expenses = input.expenseItems.map((item) => ({
    currency: item.currency,
    amount: Number(item.amount)
  }));

  if (input.transaction.type === "purchase") {
    const usdReserveImpact = -(input.purchaseDetail?.usd_credit_used ?? Math.abs(originalAmount));
    const eurReserveImpact = -(input.purchaseDetail?.eur_credit_converted ?? 0);

    return {
      transactionId: input.transaction.id,
      type: input.transaction.type,
      originalAmount,
      currency: input.transaction.currency,
      exchangeRateSnapshot,
      grossCredit: base,
      expenses: [],
      multiplier: 1,
      finalCreditEarned: [base],
      usdEquivalent: amountToUsd(input.transaction, input.eurUsdRate),
      eurReserveImpact,
      usdReserveImpact,
      paymentMode: input.purchaseDetail?.payment_mode
    };
  }

  if (input.transaction.type === "expo") {
    const multiplier = Number(input.expoDetail?.expenses_multiplier ?? 1);
    const expenseCredit = expenses.map((item) => ({
      currency: item.currency,
      amount: item.amount * multiplier
    }));
    const finalCreditEarned = groupCurrencyAmounts([base, ...expenseCredit]);

    return {
      transactionId: input.transaction.id,
      type: input.transaction.type,
      originalAmount,
      currency: input.transaction.currency,
      exchangeRateSnapshot,
      grossCredit: base,
      expenses,
      multiplier,
      finalCreditEarned,
      usdEquivalent:
        amountToUsd(input.transaction, input.eurUsdRate) +
        input.expenseItems.reduce(
          (sum, item) => sum + expenseToUsd(item, input.eurUsdRate) * multiplier,
          0
        ),
      ...reserveImpactFromAmounts(finalCreditEarned),
      days: Math.max(1, Number(input.expoDetail?.days_count ?? 1)),
      dailyCreditAmount: {
        currency: input.transaction.currency,
        amount: Number(input.expoDetail?.default_credit_per_day ?? originalAmount)
      }
    };
  }

  if (input.transaction.type === "rental_tour") {
    const multiplier = Number(input.rentalTourDetail?.expenses_multiplier ?? 1);
    const expenseCredit = expenses.map((item) => ({
      currency: item.currency,
      amount: item.amount * multiplier
    }));
    const finalCreditEarned =
      expenseCredit.length > 0 ? groupCurrencyAmounts(expenseCredit) : [base];
    const expenseUsd = input.expenseItems.reduce(
      (sum, item) => sum + expenseToUsd(item, input.eurUsdRate) * multiplier,
      0
    );

    return {
      transactionId: input.transaction.id,
      type: input.transaction.type,
      originalAmount,
      currency: input.transaction.currency,
      exchangeRateSnapshot,
      grossCredit: expenseCredit.length > 0 ? { currency: input.transaction.currency, amount: 0 } : base,
      expenses,
      multiplier,
      finalCreditEarned,
      usdEquivalent: expenseUsd || amountToUsd(input.transaction, input.eurUsdRate),
      ...reserveImpactFromAmounts(finalCreditEarned)
    };
  }

  return {
    transactionId: input.transaction.id,
    type: input.transaction.type,
    originalAmount,
    currency: input.transaction.currency,
    exchangeRateSnapshot,
    grossCredit: base,
    expenses,
    multiplier: 1,
    finalCreditEarned: [base],
    usdEquivalent: amountToUsd(input.transaction, input.eurUsdRate),
    ...reserveImpactFromAmounts([base]),
    saleAmount: input.saleDetail
      ? {
          currency: input.saleDetail.sale_currency,
          amount: Number(input.saleDetail.sale_amount)
        }
      : undefined,
    creditPercentage: input.saleDetail ? Number(input.saleDetail.credit_percentage) : undefined
  };
}

export function buildDashboardData(input: {
  transactions: Transaction[];
  saleDetails: SaleDetail[];
  expoDetails: ExpoDetail[];
  rentalTourDetails: RentalTourDetail[];
  expenseItems: ExpenseItem[];
  purchaseDetails: PurchaseDetail[];
  transactionAttachments: TransactionAttachment[];
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
  const attachmentsByTransaction = groupBy(
    input.transactionAttachments,
    (item) => item.transaction_id
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
    const calculation = calculateTransactionBreakdown({
      transaction,
      eurUsdRate: input.eurUsdRate,
      expenseItems: expenseItemsByTransaction.get(transaction.id) ?? [],
      saleDetail: saleByTransaction.get(transaction.id),
      expoDetail: expoByTransaction.get(transaction.id),
      rentalTourDetail: rentalByTransaction.get(transaction.id),
      purchaseDetail: purchaseByTransaction.get(transaction.id)
    });
    const amountUsd = calculation.usdEquivalent;
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

    eurReserve += calculation.eurReserveImpact;
    usdReserve += calculation.usdReserveImpact;

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
      (sum, sale) => {
        const saleTransaction = transactionsById.get(sale.transaction_id);
        const exchangeRate = snapshotRate(
          saleTransaction?.exchange_rate_snapshot ?? null,
          input.eurUsdRate
        );

        return (
          sum +
          (sale.sale_currency === "EUR"
            ? Number(sale.sale_amount) * exchangeRate
            : Number(sale.sale_amount))
        );
      },
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
        attachments: attachmentsByTransaction.get(transaction.id) ?? [],
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
    return calculateTransactionBreakdown({
      transaction,
      eurUsdRate: input.eurUsdRate,
      expenseItems: expenseItemsByTransaction.get(transaction.id) ?? [],
      saleDetail: saleByTransaction.get(transaction.id),
      expoDetail: expoByTransaction.get(transaction.id),
      rentalTourDetail: rentalByTransaction.get(transaction.id),
      purchaseDetail: purchaseByTransaction.get(transaction.id)
    }).usdEquivalent;
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
    transactionAttachments: input.transactionAttachments,
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

function snapshotRate(value: number | string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function transactionAmountToUsd(input: {
  transaction: Transaction;
  eurUsdRate: number;
  expenseItems: ExpenseItem[];
  saleDetail?: SaleDetail;
  expoDetail?: ExpoDetail;
  rentalTourDetail?: RentalTourDetail;
  purchaseDetail?: PurchaseDetail;
}) {
  return calculateTransactionBreakdown(input).usdEquivalent;
}

export function buildLiveFxMetrics(
  data: Pick<DashboardData, "metrics" | "purchaseDetails">,
  eurUsdRate: number
): DashboardData["metrics"] {
  const currentBalanceUsd = Math.round(
    data.metrics.eurReserve * eurUsdRate + data.metrics.usdReserve
  );
  const livePurchaseSpendUsd = data.purchaseDetails.reduce(
    (sum, purchase) =>
      sum +
      Number(purchase.usd_credit_used) +
      Number(purchase.eur_credit_converted) * eurUsdRate,
    0
  );
  const totalSpentUsd = Math.round(livePurchaseSpendUsd || data.metrics.totalSpentUsd);

  return {
    ...data.metrics,
    totalCreditUsd: currentBalanceUsd,
    totalEarnedUsd: currentBalanceUsd + totalSpentUsd,
    totalSpentUsd,
    currentBalanceUsd
  };
}

export function groupCurrencyAmounts(items: CurrencyAmount[]): CurrencyAmount[] {
  const grouped = items.reduce<Partial<Record<Currency, number>>>((acc, item) => {
    if (!Number.isFinite(item.amount)) {
      return acc;
    }

    acc[item.currency] = (acc[item.currency] ?? 0) + item.amount;
    return acc;
  }, {});

  return (["EUR", "USD"] as Currency[])
    .map((currency) => ({
      currency,
      amount: grouped[currency] ?? 0
    }))
    .filter((item) => Math.abs(item.amount) > 0.000001);
}

export function reserveImpactFromAmounts(amounts: CurrencyAmount[]) {
  return amounts.reduce(
    (impact, item) => {
      if (item.currency === "EUR") {
        impact.eurReserveImpact += item.amount;
      } else {
        impact.usdReserveImpact += item.amount;
      }

      return impact;
    },
    { eurReserveImpact: 0, usdReserveImpact: 0 }
  );
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce((map, item) => {
    const key = getKey(item);
    map.set(key, [...(map.get(key) ?? []), item]);
    return map;
  }, new Map<string, T[]>());
}

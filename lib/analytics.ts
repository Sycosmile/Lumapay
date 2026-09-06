export type SpendingTransaction = {
  type: string;
  amount: number;
  fee: number;
  createdAt: Date;
};

export type SpendingAnalytics = {
  payments: SpendingTransaction[];
  chartData: { date: string; amount: number }[];
  totalSpent: number;
  totalFees: number;
  averagePayment: number;
  biggestPayment: number;
};

// Deposits add funds to the wallet — they aren't spending, so spending
// analytics (chart, totals, averages) should only look at actual
// payments, not the combined activity feed.
export function computeSpendingAnalytics(
  transactions: SpendingTransaction[]
): SpendingAnalytics {
  const payments = transactions.filter(
    (tx) => tx.type === "PAYMENT"
  );

  const chartData = [...payments]
    .reverse()
    .map((tx) => ({
      date: new Date(tx.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      amount: tx.amount,
    }));

  const totalSpent = payments.reduce(
    (sum, tx) => sum + tx.amount,
    0
  );

  const totalFees = payments.reduce(
    (sum, tx) => sum + tx.fee,
    0
  );

  const averagePayment =
    payments.length > 0 ? totalSpent / payments.length : 0;

  const biggestPayment =
    payments.length > 0
      ? Math.max(...payments.map((t) => t.amount))
      : 0;

  return {
    payments,
    chartData,
    totalSpent,
    totalFees,
    averagePayment,
    biggestPayment,
  };
}

import { describe, it, expect } from "vitest";
import { computeSpendingAnalytics } from "./analytics";

function tx(
  overrides: Partial<{
    type: string;
    amount: number;
    fee: number;
    createdAt: Date;
  }> = {}
) {
  return {
    type: "PAYMENT",
    amount: 0,
    fee: 0,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("computeSpendingAnalytics", () => {
  it("returns all-zero analytics for no transactions", () => {
    const result = computeSpendingAnalytics([]);

    expect(result.totalSpent).toBe(0);
    expect(result.totalFees).toBe(0);
    expect(result.averagePayment).toBe(0);
    expect(result.biggestPayment).toBe(0);
    expect(result.chartData).toEqual([]);
  });

  it("excludes deposits from spending totals entirely", () => {
    const result = computeSpendingAnalytics([
      tx({ type: "DEPOSIT", amount: 500, fee: 0 }),
    ]);

    expect(result.totalSpent).toBe(0);
    expect(result.totalFees).toBe(0);
    expect(result.averagePayment).toBe(0);
    expect(result.biggestPayment).toBe(0);
    expect(result.payments).toHaveLength(0);
  });

  it("only counts PAYMENT-type transactions toward spending", () => {
    const result = computeSpendingAnalytics([
      tx({ type: "DEPOSIT", amount: 1000, fee: 0 }),
      tx({ type: "PAYMENT", amount: 10, fee: 0.5 }),
      tx({ type: "PAYMENT", amount: 20, fee: 0.5 }),
    ]);

    expect(result.payments).toHaveLength(2);
    expect(result.totalSpent).toBe(30);
    expect(result.totalFees).toBe(1);
    expect(result.averagePayment).toBe(15);
    expect(result.biggestPayment).toBe(20);
  });

  it("computes the average and biggest payment correctly across several payments", () => {
    const result = computeSpendingAnalytics([
      tx({ type: "PAYMENT", amount: 5 }),
      tx({ type: "PAYMENT", amount: 50 }),
      tx({ type: "PAYMENT", amount: 15 }),
    ]);

    expect(result.totalSpent).toBe(70);
    expect(result.averagePayment).toBeCloseTo(23.33, 2);
    expect(result.biggestPayment).toBe(50);
  });

  it("builds chart data in chronological order (oldest first) from payments only", () => {
    const result = computeSpendingAnalytics([
      // Input is newest-first, matching the Prisma query's orderBy: desc
      tx({
        type: "PAYMENT",
        amount: 20,
        createdAt: new Date("2026-01-02"),
      }),
      tx({
        type: "DEPOSIT",
        amount: 999,
        createdAt: new Date("2026-01-01T12:00:00"),
      }),
      tx({
        type: "PAYMENT",
        amount: 10,
        createdAt: new Date("2026-01-01"),
      }),
    ]);

    expect(result.chartData).toHaveLength(2);
    expect(result.chartData[0].amount).toBe(10);
    expect(result.chartData[1].amount).toBe(20);
  });
});

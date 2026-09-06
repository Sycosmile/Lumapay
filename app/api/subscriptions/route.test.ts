import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

const mockGetCurrentWallet = vi.fn();

vi.mock("@/lib/currentUser", () => ({
  getCurrentWallet: () => mockGetCurrentWallet(),
}));

import { POST, GET } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/subscriptions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/subscriptions", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockFindMany.mockReset();
    mockGetCurrentWallet.mockReset();
  });

  it("returns 401 when not signed in", async () => {
    mockGetCurrentWallet.mockResolvedValue(null);

    const res = await POST(makeRequest({ type: "monthly" }));

    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid plan type", async () => {
    mockGetCurrentWallet.mockResolvedValue({ id: "wallet_1" });

    const res = await POST(
      makeRequest({ type: "not_a_real_plan" })
    );

    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when type is missing entirely", async () => {
    mockGetCurrentWallet.mockResolvedValue({ id: "wallet_1" });

    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("derives name/amount server-side for 'monthly', ignoring any client-supplied pricing", async () => {
    mockGetCurrentWallet.mockResolvedValue({ id: "wallet_1" });
    mockCreate.mockResolvedValue({ id: "sub_1" });

    const res = await POST(
      makeRequest({
        type: "monthly",
        // An attempt to override server-side pricing - must be ignored.
        name: "Hacked Plan",
        amount: 0.01,
      })
    );

    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledTimes(1);

    const createArgs = mockCreate.mock.calls[0][0];
    expect(createArgs.data.walletId).toBe("wallet_1");
    expect(createArgs.data.name).toBe(
      "Infrastructure Management"
    );
    expect(createArgs.data.amount).toBe(1.5);
    expect(createArgs.data.type).toBe("monthly");
    expect(createArgs.data.status).toBe("ACTIVE");
    expect(createArgs.data.nextBill).toBeInstanceOf(Date);
  });

  it("derives correct pricing for 'card_issuance'", async () => {
    mockGetCurrentWallet.mockResolvedValue({ id: "wallet_2" });
    mockCreate.mockResolvedValue({ id: "sub_2" });

    const res = await POST(
      makeRequest({ type: "card_issuance" })
    );

    expect(res.status).toBe(200);

    const createArgs = mockCreate.mock.calls[0][0];
    expect(createArgs.data.name).toBe("Card Issuance");
    expect(createArgs.data.amount).toBe(3.0);
  });

  it("sets nextBill to roughly 30 days in the future", async () => {
    mockGetCurrentWallet.mockResolvedValue({ id: "wallet_1" });
    mockCreate.mockResolvedValue({ id: "sub_1" });

    await POST(makeRequest({ type: "monthly" }));

    const createArgs = mockCreate.mock.calls[0][0];
    const nextBill: Date = createArgs.data.nextBill;
    const diffDays =
      (nextBill.getTime() - Date.now()) /
      (1000 * 60 * 60 * 24);

    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);
  });
});

describe("GET /api/subscriptions", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockGetCurrentWallet.mockReset();
  });

  it("returns 401 when not signed in", async () => {
    mockGetCurrentWallet.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("scopes the query to the current wallet only", async () => {
    mockGetCurrentWallet.mockResolvedValue({ id: "wallet_1" });
    mockFindMany.mockResolvedValue([]);

    await GET();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { walletId: "wallet_1" },
      })
    );
  });
});

import { prisma } from "@/lib/prisma";

type ProcessDepositInput = {
  walletId: string;
  amount: number;
  token: string;
  signature: string;
  blockTime?: Date | null;
};

export async function processDeposit({
  walletId,
  amount,
  token,
  signature,
  blockTime = null,
}: ProcessDepositInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.deposit.findUnique({
      where: { signature },
    });

    if (existing) return existing;

    const deposit = await tx.deposit.create({
      data: {
        walletId,
        amount,
        token,
        signature,
        status: "CONFIRMED",
        blockTime,
      },
    });

    await tx.wallet.update({
      where: { id: walletId },
      data: {
        balance: { increment: amount },
      },
    });

    await tx.transaction.create({
      data: {
        walletId,
        amount,
        fee: 0,
        type: "DEPOSIT",
        description: `${token} deposit confirmed (${signature.slice(0, 8)}...)`,
      },
    });

    return deposit;
  });
}

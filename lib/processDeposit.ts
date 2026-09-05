import { prisma } from "@/lib/prisma";

type ProcessDepositInput = {
  walletId: string;
  amount: number;
  token: string;
  signature: string;
};

export async function processDeposit({
  walletId,
  amount,
  token,
  signature,
}: ProcessDepositInput) {
  return prisma.$transaction(async (tx) => {
    // Prevent duplicate processing
    const existing = await tx.deposit.findUnique({
      where: {
        signature,
      },
    });

    if (existing) {
      return existing;
    }

    const deposit = await tx.deposit.create({
      data: {
        walletId,
        amount,
        token,
        signature,
      },
    });

    await tx.wallet.update({
      where: {
        id: walletId,
      },
      data: {
        balance: {
          increment: amount,
        },
      },
    });

    return deposit;
  });
}
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ProcessDepositInput = {
  walletId: string;
  amount: string;
  token: string;
  signature: string;
  transferIndex: number;
  blockTime?: Date | null;
};

export async function processDeposit({
  walletId,
  amount,
  token,
  signature,
  transferIndex,
  blockTime = null,
}: ProcessDepositInput) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid deposit amount");
  }

  const decimalAmount = new Prisma.Decimal(amount);

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.deposit.findUnique({
        where: {
          signature_transferIndex: {
            signature,
            transferIndex,
          },
        },
      });

      if (existing) return existing;

      const deposit = await tx.deposit.create({
        data: {
          walletId,
          amount: decimalAmount,
          token,
          signature,
          transferIndex,
          status: "CONFIRMED",
          blockTime,
        },
      });

      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: decimalAmount } },
      });

      await tx.transaction.create({
        data: {
          walletId,
          amount: decimalAmount,
          fee: new Prisma.Decimal(0),
          type: "DEPOSIT",
          description: `${token} deposit confirmed (${signature.slice(0, 8)}... / transfer ${transferIndex})`,
        },
      });

      return deposit;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.deposit.findUnique({
        where: {
          signature_transferIndex: {
            signature,
            transferIndex,
          },
        },
      });

      if (existing) return existing;
    }

    throw error;
  }
}
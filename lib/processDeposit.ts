import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ProcessDepositInput = {
  walletId: string;
  amount: string;
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
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid deposit amount");
  }

  const decimalAmount = new Prisma.Decimal(amount);

  try {
    return await prisma.$transaction(async (tx) => {
      // Prevent duplicate deposits from crediting the wallet twice.
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
          amount: decimalAmount,
          token,
          signature,
          status: "CONFIRMED",
          blockTime,
        },
      });

      await tx.wallet.update({
        where: {
          id: walletId,
        },
        data: {
          balance: {
            increment: decimalAmount,
          },
        },
      });

      await tx.transaction.create({
        data: {
          walletId,
          amount: decimalAmount,
          fee: new Prisma.Decimal(0),
          type: "DEPOSIT",
          description: `${token} deposit confirmed (${signature.slice(0, 8)}...)`,
        },
      });

      return deposit;
    });
  } catch (error) {
    // Deposit.signature is unique.
    // If two webhook deliveries race, only one should credit the wallet.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.deposit.findUnique({
        where: {
          signature,
        },
      });

      if (existing) {
        return existing;
      }
    }

    throw error;
  }
}
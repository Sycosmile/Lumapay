import { Prisma, prisma } from "@/lib/prisma";

type ProcessDepositInput = {
  walletId: string;
  amount: string;
  token: string;
  signature: string;
  blockTime?: Date | null;
};

const MAX_TRANSACTION_RETRIES = 3;

export async function processDeposit({
  walletId,
  amount,
  token,
  signature,
  blockTime = null,
}: ProcessDepositInput) {
  for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
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
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          const existing = await prisma.deposit.findUnique({
            where: { signature },
          });
          if (existing) return existing;
        }

        if (error.code === "P2034" && attempt < MAX_TRANSACTION_RETRIES - 1) {
          continue;
        }
      }

      throw error;
    }
  }

  throw new Error(`Could not process deposit ${signature} after retries`);
}

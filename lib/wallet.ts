import { prisma } from "@/lib/prisma";
import { generateDepositWallet } from "@/lib/solana";

/**
 * Finds the wallet for a given user, creating it (and/or backfilling a
 * missing deposit address) if needed. This is the single source of truth
 * for wallet creation so we don't duplicate the logic across callers.
 */
export async function ensureWalletExists(userId: string) {
  let wallet = await prisma.wallet.findUnique({
    where: {
      userId,
    },
    include: {
      user: true,
    },
  });

  if (!wallet) {
    const { depositAddress } = generateDepositWallet();

    wallet = await prisma.wallet.create({
      data: {
        userId,
        balance: 0,
        depositAddress,
      },
      include: {
        user: true,
      },
    });

    return wallet;
  }

  // Existing wallet without a deposit address (e.g. created before
  // deposit wallets existed) — backfill one.
  if (!wallet.depositAddress) {
    const { depositAddress } = generateDepositWallet();

    wallet = await prisma.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        depositAddress,
      },
      include: {
        user: true,
      },
    });
  }

  return wallet;
}

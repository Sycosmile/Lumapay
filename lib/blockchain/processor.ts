import { prisma } from "@/lib/prisma";
import { verifySolanaDeposits } from "@/lib/blockchain/quicknode";
import { processDeposit } from "@/lib/processDeposit";

export async function processTransaction(signature: string) {
  console.log(`🔍 Processing ${signature}`);

  const wallets = await prisma.wallet.findMany({
    where: { depositAddress: { not: null } },
    select: { id: true, depositAddress: true },
  });

  const verifiedDeposits = await verifySolanaDeposits(signature, wallets);

  if (verifiedDeposits.length === 0) {
    console.log(`ℹ️ Transaction ${signature} was not a verified LumaPay deposit.`);
    return [];
  }

  const deposits = [];
  for (const verifiedDeposit of verifiedDeposits) {
    deposits.push(await processDeposit(verifiedDeposit));

    console.log(
      `💰 Verified ${verifiedDeposit.amount} ${verifiedDeposit.token} deposit for wallet ${verifiedDeposit.walletId} (transfer ${verifiedDeposit.transferIndex})`,
    );
  }

  return deposits;
}
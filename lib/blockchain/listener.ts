import { processTransaction } from "@/lib/blockchain/processor";
import { PublicKey } from "@solana/web3.js";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/blockchain/connection";

let started = false;

// Deposit addresses we already have an onLogs subscription for. Wallets
// created after the listener starts are picked up by the periodic
// refresh below instead of being missed forever.
const subscribedWallets = new Set<string>();

// Prevent duplicate processing of the same signature
const processedSignatures = new Set<string>();

// How often to check for newly created wallets that need a subscription.
const REFRESH_INTERVAL_MS = 30_000;

function subscribeToWallet(depositAddress: string) {
  if (subscribedWallets.has(depositAddress)) return;

  let publicKey: PublicKey;

  try {
    publicKey = new PublicKey(depositAddress);
  } catch (error) {
    // Don't let one malformed address stop us from subscribing to the rest.
    console.error(
      `❌ Invalid deposit address, skipping: ${depositAddress}`,
      error
    );
    return;
  }

  subscribedWallets.add(depositAddress);

  connection.onLogs(
    publicKey,
    async ({ signature, err }) => {
      try {
        if (err) return;

        if (!signature) return;

        if (processedSignatures.has(signature)) {
          return;
        }

        processedSignatures.add(signature);

        console.log("");
        console.log(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );
        console.log(
          `📥 Deposit activity detected`
        );
        console.log(
          `Wallet: ${depositAddress}`
        );
        console.log(
          `Signature: ${signature}`
        );

        await processTransaction(signature);
      } catch (error) {
        console.error(
          "❌ Deposit listener error:",
          error
        );
      }
    },
    "confirmed"
  );

  console.log(`✅ Listening to ${depositAddress}`);
}

async function subscribeToAllWallets() {
  const wallets = await prisma.wallet.findMany({
    where: {
      depositAddress: {
        not: null,
      },
    },
  });

  for (const wallet of wallets) {
    if (!wallet.depositAddress) continue;
    subscribeToWallet(wallet.depositAddress);
  }
}

export async function startDepositListener() {
  if (started) return;

  started = true;

  console.log("🚀 Deposit log listener started");

  await subscribeToAllWallets();

  if (subscribedWallets.size === 0) {
    console.log("⚠️ No deposit wallets found yet.");
  } else {
    console.log(
      `👀 Watching ${subscribedWallets.size} deposit wallet(s)`
    );
  }

  // New wallets (new signups) created after this point wouldn't otherwise
  // get an onLogs subscription — periodically pick them up.
  setInterval(() => {
    subscribeToAllWallets().catch((error) => {
      console.error(
        "❌ Failed to refresh deposit wallet subscriptions:",
        error
      );
    });
  }, REFRESH_INTERVAL_MS);
}
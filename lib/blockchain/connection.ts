import {
  Connection,
  Commitment,
  clusterApiUrl,
} from "@solana/web3.js";

// NOTE: this used to fall back to a hardcoded QuickNode devnet URL with an
// embedded API key. That key was committed to the public repo and should be
// rotated in the QuickNode dashboard regardless of this change. We now fall
// back to the public Solana devnet endpoint instead of a private/paid one.
//
// Never log the full RPC_URL anywhere in this file — a configured private
// RPC URL (QuickNode, Helius, etc.) may embed an API key/credentials, and
// logging it would leak that credential into server logs.
if (!process.env.SOLANA_RPC_URL) {
  console.warn(
    "⚠️ SOLANA_RPC_URL is not set — falling back to the public Solana devnet RPC, which is rate-limited. Set SOLANA_RPC_URL in your .env for reliable use."
  );
}

const RPC_URL =
  process.env.SOLANA_RPC_URL ?? clusterApiUrl("devnet");

const COMMITMENT: Commitment = "confirmed";

export const connection = new Connection(
  RPC_URL,
  COMMITMENT
);

console.log("🟢 Solana RPC connected");
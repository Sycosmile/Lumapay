export const dynamic = "force-dynamic";

import { Wallet, History } from "lucide-react";

import DepositCard from "@/components/DepositCard";
import DepositHistory from "@/components/DepositHistory";
import RefreshBalanceButton from "@/components/RefreshBalanceButton";

import { getCurrentWallet } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";

export default async function DepositPage() {
  const wallet = await getCurrentWallet();

  if (!wallet) {
    return (
      <div className="p-8">
        Wallet not found
      </div>
    );
  }

  const deposits = await prisma.deposit.findMany({
    where: {
      walletId: wallet.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8">

      {/* PAGE HEADER */}

      <div>

        <h1 className="text-4xl font-bold">
          Deposit
        </h1>

        <p className="mt-2 text-gray-400">
          Deposit USDC into your LumaPay wallet.
        </p>

      </div>

      {/* WALLET CARD */}

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="flex items-center gap-3 text-gray-400">

              <Wallet size={20} />

              <span>Wallet Balance</span>

            </div>

            <h2 className="mt-3 text-5xl font-bold">
              ${wallet.balance.toFixed(2)}
            </h2>

            <p className="mt-2 text-sm text-emerald-400">
              Solana Network
            </p>

          </div>

          <div className="flex gap-4">

            <RefreshBalanceButton />

            <button
              className="
                flex
                items-center
                gap-2
                rounded-xl
                border
                border-white/10
                bg-white/5
                px-5
                py-3
                transition
                hover:bg-white/10
              "
            >
              <History size={18} />
              History
            </button>

          </div>

        </div>

      </div>

      <DepositCard
        address={wallet.depositAddress ?? ""}
        network="Solana"
        supportedTokens={["USDC", "USDT"]}
      />

      <DepositHistory
        deposits={deposits.map((deposit) => ({
          id: deposit.id,
          amount: deposit.amount,
          status: deposit.status.toLowerCase() as
            | "pending"
            | "confirmed"
            | "failed",
          createdAt: deposit.createdAt,
        }))}
      />

    </div>
  );
}
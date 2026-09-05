"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import {
  Copy,
  CheckCircle2,
  ShieldCheck,
  Wallet,
} from "lucide-react";

type Props = {
  address: string;
  network: string;
  supportedTokens: string[];
};

export default function DepositCard({
  address,
  network,
  supportedTokens,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    await navigator.clipboard.writeText(address);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_420px]">

      {/* LEFT PANEL */}

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">

        <div className="flex items-center gap-3">

          <div className="rounded-2xl bg-emerald-500/10 p-3">
            <Wallet className="text-emerald-400" />
          </div>

          <div>
            <h2 className="text-2xl font-bold">
              Deposit Crypto
            </h2>

            <p className="text-gray-400">
              Fund your LumaPay wallet securely.
            </p>
          </div>

        </div>

        <div className="mt-8">

          <p className="mb-2 text-sm text-gray-400">
            Deposit Address
          </p>

          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/30 p-5 lg:flex-row lg:items-center lg:justify-between">

            <span className="break-all font-mono text-sm text-gray-200">
              {address}
            </span>

            <button
              onClick={copyAddress}
              className="
                flex items-center justify-center gap-2
                rounded-xl
                bg-emerald-500
                px-5
                py-3
                font-medium
                text-black
                transition
                hover:scale-105
              "
            >
              {copied ? (
                <>
                  <CheckCircle2 size={18} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy
                </>
              )}
            </button>

          </div>

        </div>

        <div className="mt-8">

          <p className="mb-3 text-sm text-gray-400">
            Network
          </p>

          <div className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 font-medium text-emerald-400">
            {network}
          </div>

        </div>

        <div className="mt-8">

          <p className="mb-3 text-sm text-gray-400">
            Supported Assets
          </p>

          <div className="flex flex-wrap gap-3">

            {supportedTokens.map((token) => (
              <div
                key={token}
                className="
                  rounded-full
                  border
                  border-white/10
                  bg-white/5
                  px-4
                  py-2
                  text-sm
                  font-medium
                "
              >
                {token}
              </div>
            ))}

          </div>

        </div>

        <div className="mt-10 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">

          <div className="flex items-center gap-2 font-semibold text-yellow-300">
            <ShieldCheck size={18} />
            Deposit Safety
          </div>

          <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-300">
            <li>• Only send USDC or USDT.</li>
            <li>• Only use the Solana network.</li>
            <li>• Deposits on unsupported networks may be permanently lost.</li>
            <li>• Deposits usually confirm within a few seconds.</li>
          </ul>

        </div>

      </div>

      {/* RIGHT PANEL */}

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">

        <h3 className="text-xl font-semibold">
          Scan to Deposit
        </h3>

        <p className="mt-2 text-sm text-gray-400">
          Use Phantom, Solflare or any Solana wallet.
        </p>

        <div className="mt-8 flex justify-center">

          <div className="rounded-3xl bg-white p-5 shadow-2xl">
            <QRCode
              value={address}
              size={240}
            />
          </div>

        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Scan this QR code to automatically fill your deposit address.
        </p>

      </div>

    </div>
  );
}
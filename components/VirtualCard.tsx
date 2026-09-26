"use client";

import { useState } from "react";
import { Wifi, Eye, Copy } from "lucide-react";

type Card = {
  id: string;
  holderName: string;
  last4: string;
  expiry: string;
  brand: string;
  status: string;
  frozen: boolean;
};

export default function VirtualCard({
  card,
}: {
  card?: Card;
}) {
  const [data, setData] = useState(card);
  const [loading, setLoading] = useState(false);

  if (!data) {
    return (
      <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold">
          Virtual Card
        </h2>

        <p className="mt-3 text-gray-400">
          You don't have a virtual USD card yet.
        </p>

        <button className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:opacity-90">
          Create Card
        </button>
      </div>
    );
  }

  const cardData = data;

  async function toggleFreeze() {
    setLoading(true);

    try {
      const res = await fetch("/api/cards", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: cardData.id,
        }),
      });

      if (!res.ok) {
        throw new Error("Unable to update card");
      }

      const updated = await res.json();
      setData(updated);
    } catch {
      alert("Unable to update card. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-700 to-blue-700 p-8 text-white shadow-2xl">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-wide">
                LumaPay
              </h2>

              <p className="mt-1 text-xs opacity-80">
                Virtual USD Card
              </p>
            </div>

            <div className="flex flex-col items-end gap-3">
              <Wifi
                size={22}
                className="rotate-90"
              />

              <span className="font-bold tracking-widest">
                {cardData.brand}
              </span>
            </div>
          </div>

          <div className="mb-6 mt-8 h-12 w-16 rounded-lg border border-yellow-300 bg-gradient-to-br from-yellow-200 to-yellow-500 shadow-inner" />

          <div>
            <p className="font-mono text-2xl tracking-[0.25em]">
              •••• •••• •••• {cardData.last4}
            </p>
          </div>

          <div className="mt-10 flex justify-between">
            <div>
              <p className="text-xs opacity-70">
                CARD HOLDER
              </p>

              <p className="font-semibold">
                {cardData.holderName}
              </p>
            </div>

            <div>
              <p className="text-xs opacity-70">
                EXPIRES
              </p>

              <p>{cardData.expiry}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled
          title="Full card details are not exposed to the browser"
          className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-white/50 px-4 py-2 text-black/60"
        >
          <Copy size={16} />
          Copy Number
        </button>

        <button
          type="button"
          onClick={toggleFreeze}
          disabled={loading}
          className="rounded-lg bg-red-500 px-4 py-2 text-white"
        >
          {loading
            ? "Updating..."
            : cardData.frozen
            ? "Unfreeze Card"
            : "Freeze Card"}
        </button>
      </div>

      <div className="max-w-md rounded-xl border border-white/10 bg-white/5 p-6">
        <p>
          <strong>Status:</strong> {cardData.status}
        </p>

        <p className="mt-3">
          <strong>Frozen:</strong>{" "}
          {cardData.frozen ? "Yes ❄️" : "No ✅"}
        </p>

        <p className="mt-3">
          <strong>Card:</strong> •••• •••• •••• {cardData.last4}
        </p>
      </div>
    </div>
  );
}
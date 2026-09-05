"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RefreshBalanceButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);

    router.refresh();

    setTimeout(() => {
      setLoading(false);
    }, 600);
  }

  return (
    <button
      onClick={refresh}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 transition hover:bg-white/10 disabled:opacity-60"
    >
      <RefreshCw
        size={18}
        className={loading ? "animate-spin" : ""}
      />

      {loading ? "Refreshing..." : "Refresh"}
    </button>
  );
}
// Next.js runs this once when the server process starts.
// See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
//
// Without this, the deposit listener (lib/blockchain/listener.ts) only ever
// starts if something sends a GET request to /api/listen — which nothing in
// this app does automatically. That meant deposits were never actually
// credited unless someone manually hit that endpoint after every deploy or
// restart.
export async function register() {
  // Only run in the Node.js runtime — the Solana web3.js client and
  // WebSocket-based subscriptions used by the listener aren't supported in
  // the Edge runtime.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { startDepositListener } = await import(
        "@/lib/blockchain/listener"
      );

      await startDepositListener();
    } catch (error) {
      // Don't let a startup hiccup (e.g. the database not being reachable
      // yet) take down the whole server.
      console.error(
        "❌ Failed to start deposit listener on boot:",
        error
      );
    }
  }
}

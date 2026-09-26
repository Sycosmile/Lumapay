import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  extractSignatures,
  verifyQuickNodeSignature,
  verifySolanaDeposits,
} from "@/lib/blockchain/quicknode";
import { processDeposit } from "@/lib/processDeposit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const verified = verifyQuickNodeSignature(
      rawBody,
      req.headers.get("x-qn-nonce"),
      req.headers.get("x-qn-timestamp"),
      req.headers.get("x-qn-signature"),
    );

    if (!verified) {
      return NextResponse.json({ success: false, error: "Invalid webhook signature" }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const signatures = extractSignatures(payload);
    if (signatures.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No transaction signatures found" });
    }

    const wallets = await prisma.wallet.findMany({
      where: { depositAddress: { not: null } },
      select: { id: true, depositAddress: true },
    });

    const results: Array<{ signature: string; status: string; processed: number }> = [];

    for (const signature of signatures) {
      const verifiedDeposits = await verifySolanaDeposits(signature, wallets);

      if (verifiedDeposits.length === 0) {
        results.push({ signature, status: "ignored", processed: 0 });
        continue;
      }

      for (const verifiedDeposit of verifiedDeposits) {
        await processDeposit(verifiedDeposit);
      }

      results.push({ signature, status: "processed", processed: verifiedDeposits.length });
    }

    return NextResponse.json({
      success: true,
      processed: results.reduce((total, result) => total + result.processed, 0),
      results,
    });
  } catch (error) {
    console.error("QuickNode webhook processing failed", error);

    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
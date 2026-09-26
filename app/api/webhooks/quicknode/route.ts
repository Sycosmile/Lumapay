import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  extractSignatures,
  verifyQuickNodeSignature,
  verifySolanaDeposit,
} from "@/lib/blockchain/quicknode";
import { processDeposit } from "@/lib/processDeposit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_WEBHOOK_BODY_BYTES = 1_048_576;
const MAX_WEBHOOK_SIGNATURES = 100;

async function readBodyWithLimit(req: NextRequest) {
  if (!req.body) {
    throw new Error("Missing webhook body");
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_WEBHOOK_BODY_BYTES) {
        throw new Error("Webhook payload too large");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength) {
      const declaredLength = Number(contentLength);
      if (!Number.isSafeInteger(declaredLength) || declaredLength > MAX_WEBHOOK_BODY_BYTES) {
        return NextResponse.json(
          { success: false, error: "Webhook payload too large" },
          { status: 413 },
        );
      }
    }

    let rawBody: string;
    try {
      rawBody = await readBodyWithLimit(req);
    } catch (error) {
      if (error instanceof Error && error.message === "Webhook payload too large") {
        return NextResponse.json(
          { success: false, error: "Webhook payload too large" },
          { status: 413 },
        );
      }

      return NextResponse.json(
        { success: false, error: "Invalid webhook body" },
        { status: 400 },
      );
    }

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

    if (signatures.length > MAX_WEBHOOK_SIGNATURES) {
      return NextResponse.json(
        { success: false, error: "Too many transaction signatures" },
        { status: 413 },
      );
    }

    const wallets = await prisma.wallet.findMany({
      where: { depositAddress: { not: null } },
      select: { id: true, depositAddress: true },
    });

    const results: Array<{ signature: string; status: string }> = [];

    for (const signature of signatures) {
      const verifiedDeposit = await verifySolanaDeposit(signature, wallets);

      if (!verifiedDeposit) {
        results.push({ signature, status: "ignored" });
        continue;
      }

      await processDeposit(verifiedDeposit);
      results.push({ signature, status: "processed" });
    }

    return NextResponse.json({
      success: true,
      processed: results.filter((result) => result.status === "processed").length,
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

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "QuickNode webhook endpoint is live",
  });
}

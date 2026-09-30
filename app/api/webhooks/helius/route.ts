import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  extractSignatures,
  verifySolanaDeposits,
} from "@/lib/blockchain/quicknode";
import { processDeposit } from "@/lib/processDeposit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_WEBHOOK_BODY_BYTES = 1_048_576;
const MAX_WEBHOOK_SIGNATURES = 100;

async function readBodyWithLimit(req: NextRequest) {
  if (!req.body) throw new Error("Missing webhook body");

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
  const expectedAuth = process.env.HELIUS_WEBHOOK_AUTH_SECRET;

  if (!expectedAuth) {
    console.error("HELIUS_WEBHOOK_AUTH_SECRET is not configured");
    return NextResponse.json(
      { success: false, error: "Webhook is not configured" },
      { status: 503 },
    );
  }

  if (req.headers.get("authorization") !== expectedAuth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength) {
      const declaredLength = Number(contentLength);
      if (
        !Number.isSafeInteger(declaredLength) ||
        declaredLength > MAX_WEBHOOK_BODY_BYTES
      ) {
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
      if (
        error instanceof Error &&
        error.message === "Webhook payload too large"
      ) {
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

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    const signatures = extractSignatures(payload);

    if (signatures.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No transaction signatures found",
      });
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

    const results: Array<{
      signature: string;
      status: string;
      processed: number;
    }> = [];

    for (const signature of signatures) {
      const verifiedDeposits = await verifySolanaDeposits(signature, wallets);

      if (verifiedDeposits.length === 0) {
        results.push({ signature, status: "ignored", processed: 0 });
        continue;
      }

      for (const verifiedDeposit of verifiedDeposits) {
        await processDeposit(verifiedDeposit);
      }

      results.push({
        signature,
        status: "processed",
        processed: verifiedDeposits.length,
      });
    }

    return NextResponse.json({
      success: true,
      processed: results.reduce(
        (total, result) => total + result.processed,
        0,
      ),
      results,
    });
  } catch (error) {
    console.error("Helius webhook processing failed", error);

    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: "Method Not Allowed" },
    {
      status: 405,
      headers: {
        Allow: "POST",
        "Cache-Control": "no-store",
      },
    },
  );
}

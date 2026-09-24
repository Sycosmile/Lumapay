import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentWallet } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

function randomDigits(length: number) {
  return Array.from({ length }, () => randomInt(0, 10)).join("");
}

function toPublicCard(card: {
  id: string;
  holderName: string;
  cardNumber: string;
  expiry: string;
  brand: string;
  status: string;
  frozen: boolean;
}) {
  return {
    id: card.id,
    holderName: card.holderName,
    last4: card.cardNumber.slice(-4),
    expiry: card.expiry,
    brand: card.brand,
    status: card.status,
    frozen: card.frozen,
  };
}

export async function GET() {
  try {
    const wallet = await getCurrentWallet();

    if (!wallet) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const cards = await prisma.card.findMany({
      where: {
        walletId: wallet.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json(cards.map(toPublicCard));
  } catch (error) {
    console.error("GET /api/cards:", error);

    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const wallet = await getCurrentWallet();

    if (!wallet) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const existing = await prisma.card.findFirst({
      where: {
        walletId: wallet.id,
      },
    });

    if (existing) {
      return Response.json(toPublicCard(existing));
    }

    const holderName =
      wallet.user.name ??
      wallet.user.email.split("@")[0];

    const card = await prisma.card.create({
      data: {
        walletId: wallet.id,
        holderName,
        cardNumber: "4532" + randomDigits(12),
        expiry: "12/30",
        brand: "VISA",
      },
    });

    return Response.json(toPublicCard(card));
  } catch (error) {
    console.error("POST /api/cards:", error);

    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { id } = await req.json();

    if (!id || typeof id !== "string") {
      return Response.json(
        { error: "Missing or invalid card id" },
        { status: 400 }
      );
    }

    const wallet = await getCurrentWallet();

    if (!wallet) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const card = await prisma.card.findFirst({
      where: {
        id,
        walletId: wallet.id,
      },
    });

    if (!card) {
      return Response.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.card.update({
      where: {
        id: card.id,
      },
      data: {
        frozen: !card.frozen,
        status: card.frozen ? "ACTIVE" : "FROZEN",
      },
    });

    return Response.json(toPublicCard(updated));
  } catch (error) {
    console.error("PATCH /api/cards:", error);

    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
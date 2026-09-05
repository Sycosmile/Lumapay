import { prisma } from "@/lib/prisma";
import { getCurrentWallet } from "@/lib/currentUser";

// Mirrors the fees shown on the Settings page. Pricing is defined here,
// server-side, rather than trusted from the request body.
const SUBSCRIPTION_PLANS = {
  monthly: {
    name: "Infrastructure Management",
    amount: 1.5,
  },
  card_issuance: {
    name: "Card Issuance",
    amount: 3.0,
  },
} as const;

type SubscriptionPlanType = keyof typeof SUBSCRIPTION_PLANS;

function isValidPlanType(
  type: unknown
): type is SubscriptionPlanType {
  return (
    typeof type === "string" &&
    Object.prototype.hasOwnProperty.call(
      SUBSCRIPTION_PLANS,
      type
    )
  );
}

export async function GET() {
  const wallet = await getCurrentWallet();

  if (!wallet) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const subscriptions = await prisma.subscription.findMany({
    where: {
      walletId: wallet.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return Response.json(subscriptions);
}

export async function POST(req: Request) {
  const wallet = await getCurrentWallet();

  if (!wallet) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const type = body.type;

  if (!isValidPlanType(type)) {
    return Response.json(
      { error: "Invalid subscription type" },
      { status: 400 }
    );
  }

  const plan = SUBSCRIPTION_PLANS[type];

  const nextBill = new Date();
  nextBill.setDate(nextBill.getDate() + 30);

  const subscription = await prisma.subscription.create({
    data: {
      walletId: wallet.id,
      name: plan.name,
      type,
      amount: plan.amount,
      nextBill,
      status: "ACTIVE",
    },
  });

  return Response.json(subscription);
}
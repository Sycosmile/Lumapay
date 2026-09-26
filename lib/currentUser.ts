import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureWalletExists } from "@/lib/wallet";

export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  let user = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
  });

  if (user) {
    return user;
  }

  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  try {
    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim(),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      user = await prisma.user.findUnique({
        where: {
          clerkId: userId,
        },
      });

      if (!user) {
        throw error;
      }
    } else {
      throw error;
    }
  }

  await ensureWalletExists(user.id);

  return user;
}

export async function getCurrentWallet() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return prisma.wallet.findUnique({
    where: {
      userId: user.id,
    },
    include: {
      user: true,
    },
  });
}

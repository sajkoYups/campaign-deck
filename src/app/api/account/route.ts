import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function DELETE() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) return jsonError("Unauthorized", 401);

    const owned = await prisma.workspace.findMany({
      where: { ownerId: session.user.id },
      select: { id: true, name: true },
    });

    if (owned.length > 0) {
      return jsonError(
        `Transfer or delete your owned workspace(s) first: ${owned.map((w) => w.name).join(", ")}`,
        400,
      );
    }

    await prisma.user.delete({
      where: { id: session.user.id },
    });

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

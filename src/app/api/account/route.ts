import { prisma } from "@/lib/db";
import { handleApiError, jsonOk } from "@/lib/api";
import { requireApiWorkspace } from "@/lib/api-auth";

export async function DELETE() {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;

    await prisma.user.delete({
      where: { id: result.session.user.id },
    });

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

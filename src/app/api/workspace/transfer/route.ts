import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";

const transferSchema = z.object({
  newOwnerUserId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "workspace.transfer");
    if (forbidden) return forbidden;

    const body = transferSchema.parse(await request.json());
    if (body.newOwnerUserId === result.session.user.id) {
      return jsonError("Already the owner", 400);
    }

    const target = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: result.workspace.id,
          userId: body.newOwnerUserId,
        },
      },
    });
    if (!target) return jsonError("User is not a workspace member", 404);

    await prisma.$transaction([
      prisma.workspaceMember.update({
        where: { id: target.id },
        data: { role: "OWNER" },
      }),
      prisma.workspaceMember.update({
        where: { id: result.member.id },
        data: { role: "ADMIN" },
      }),
      prisma.workspace.update({
        where: { id: result.workspace.id },
        data: { ownerId: body.newOwnerUserId },
      }),
    ]);

    return jsonOk({ ownerId: body.newOwnerUserId });
  } catch (error) {
    return handleApiError(error);
  }
}

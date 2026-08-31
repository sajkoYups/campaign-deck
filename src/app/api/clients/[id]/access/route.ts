import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";
import { canAccessClient, revokeClientAccess } from "@/lib/client-access";
import { can } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

const revokeSchema = z.object({
  userId: z.string().min(1),
});

export async function GET(_request: Request, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    if (!can(result.role, "members.invite") && !can(result.role, "members.manage")) {
      return jsonError("Forbidden", 403);
    }

    const { id } = await params;
    if (!canAccessClient(id, result.accessibleClientIds)) {
      return jsonError("Client not found", 404);
    }

    const client = await prisma.client.findFirst({
      where: { id, workspaceId: result.workspace.id },
    });
    if (!client) return jsonError("Client not found", 404);

    const access = await prisma.clientAccess.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return jsonOk(
      access.map((a) => ({
        id: a.id,
        role: a.role,
        createdAt: a.createdAt,
        user: a.user,
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "members.invite");
    if (forbidden) return forbidden;

    const { id } = await params;
    if (!canAccessClient(id, result.accessibleClientIds)) {
      return jsonError("Client not found", 404);
    }

    const client = await prisma.client.findFirst({
      where: { id, workspaceId: result.workspace.id },
    });
    if (!client) return jsonError("Client not found", 404);

    const body = revokeSchema.parse(await request.json());
    const { revoked } = await revokeClientAccess(id, body.userId);
    if (!revoked) return jsonError("Access not found", 404);

    return jsonOk({ userId: body.userId });
  } catch (error) {
    return handleApiError(error);
  }
}

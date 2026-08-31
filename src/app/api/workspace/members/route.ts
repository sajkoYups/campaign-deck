import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";
import { assignableRoles, can, canManageMember, roleRank } from "@/lib/permissions";

export async function GET() {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;

    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: result.workspace.id,
        role: { not: "GUEST" },
      },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return jsonOk(members);
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(["ADMIN", "MANAGER", "EDITOR", "VIEWER"]),
});

export async function PATCH(request: Request) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "members.manage");
    if (forbidden) {
      // Managers can adjust editor/viewer via invite permission path
      if (!(result.role === "MANAGER" && can(result.role, "members.invite"))) {
        return forbidden;
      }
    }

    const body = patchSchema.parse(await request.json());
    if (!assignableRoles(result.role).includes(body.role)) {
      return jsonError("You cannot assign that role", 403);
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { id: body.memberId, workspaceId: result.workspace.id },
    });
    if (!member) return jsonError("Member not found", 404);
    if (member.role === "OWNER") {
      return jsonError("Cannot change owner role here; transfer ownership instead", 400);
    }
    if (!canManageMember(result.role, member.role)) {
      return jsonError("Forbidden", 403);
    }
    if (roleRank(body.role) >= roleRank(result.role) && result.role !== "OWNER") {
      return jsonError("Cannot assign a role at or above your own", 403);
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: member.id },
      data: { role: body.role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

const deleteSchema = z.object({
  memberId: z.string().min(1),
});

export async function DELETE(request: Request) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "members.manage");
    if (forbidden) return forbidden;

    const body = deleteSchema.parse(await request.json());
    const member = await prisma.workspaceMember.findFirst({
      where: { id: body.memberId, workspaceId: result.workspace.id },
    });
    if (!member) return jsonError("Member not found", 404);
    if (member.role === "OWNER") {
      return jsonError("Cannot remove the workspace owner", 400);
    }
    if (!canManageMember(result.role, member.role)) {
      return jsonError("Forbidden", 403);
    }

    await prisma.workspaceMember.delete({ where: { id: member.id } });
    return jsonOk({ id: member.id });
  } catch (error) {
    return handleApiError(error);
  }
}

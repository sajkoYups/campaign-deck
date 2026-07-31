import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";
import {
  createInviteToken,
  inviteAcceptUrl,
  inviteExpiresAt,
  logInviteLink,
} from "@/lib/invitations";
import { can } from "@/lib/permissions";

const resendSchema = z.object({
  invitationId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "members.invite");
    if (forbidden) return forbidden;

    const body = resendSchema.parse(await request.json());
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: {
        id: body.invitationId,
        workspaceId: result.workspace.id,
        acceptedAt: null,
      },
    });
    if (!invitation) return jsonError("Invitation not found", 404);

    const token = createInviteToken();
    const updated = await prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: {
        token,
        expiresAt: inviteExpiresAt(),
      },
    });

    const url = inviteAcceptUrl(token);
    logInviteLink(updated.email, url);
    return jsonOk({ ...updated, acceptUrl: url });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    if (!can(result.role, "members.invite") && !can(result.role, "members.manage")) {
      return jsonError("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("Missing invitation id", 400);

    const invitation = await prisma.workspaceInvitation.findFirst({
      where: { id, workspaceId: result.workspace.id },
    });
    if (!invitation) return jsonError("Invitation not found", 404);

    await prisma.workspaceInvitation.delete({ where: { id } });
    return jsonOk({ id });
  } catch (error) {
    return handleApiError(error);
  }
}

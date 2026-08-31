import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";
import { canAccessClient } from "@/lib/client-access";
import {
  createInviteToken,
  inviteAcceptUrl,
  inviteExpiresAt,
  logClientInviteLink,
} from "@/lib/invitations";
import { can } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

const resendSchema = z.object({
  invitationId: z.string().min(1),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "members.invite");
    if (forbidden) return forbidden;

    const { id: clientId } = await params;
    if (!canAccessClient(clientId, result.accessibleClientIds)) {
      return jsonError("Client not found", 404);
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, workspaceId: result.workspace.id },
    });
    if (!client) return jsonError("Client not found", 404);

    const body = resendSchema.parse(await request.json());
    const invitation = await prisma.clientInvitation.findFirst({
      where: {
        id: body.invitationId,
        clientId,
        acceptedAt: null,
      },
    });
    if (!invitation) return jsonError("Invitation not found", 404);

    const token = createInviteToken();
    const updated = await prisma.clientInvitation.update({
      where: { id: invitation.id },
      data: {
        token,
        expiresAt: inviteExpiresAt(),
      },
    });

    const url = inviteAcceptUrl(token);
    logClientInviteLink(updated.email, client.name, url);
    return jsonOk({ ...updated, acceptUrl: url });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    if (!can(result.role, "members.invite") && !can(result.role, "members.manage")) {
      return jsonError("Forbidden", 403);
    }

    const { id: clientId } = await params;
    if (!canAccessClient(clientId, result.accessibleClientIds)) {
      return jsonError("Client not found", 404);
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("id");
    if (!invitationId) return jsonError("Missing invitation id", 400);

    const invitation = await prisma.clientInvitation.findFirst({
      where: {
        id: invitationId,
        clientId,
        client: { workspaceId: result.workspace.id },
      },
    });
    if (!invitation) return jsonError("Invitation not found", 404);

    await prisma.clientInvitation.delete({ where: { id: invitationId } });
    return jsonOk({ id: invitationId });
  } catch (error) {
    return handleApiError(error);
  }
}

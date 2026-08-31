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
  normalizeInviteEmail,
} from "@/lib/invitations";

type Params = { params: Promise<{ id: string }> };

const inviteSchema = z.object({
  email: z.string().email(),
});

async function findOwnedClient(
  clientId: string,
  workspaceId: string,
  accessibleClientIds: string[] | null,
) {
  if (!canAccessClient(clientId, accessibleClientIds)) return null;
  return prisma.client.findFirst({
    where: { id: clientId, workspaceId },
  });
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "members.invite");
    if (forbidden) return forbidden;

    const { id } = await params;
    const client = await findOwnedClient(
      id,
      result.workspace.id,
      result.accessibleClientIds,
    );
    if (!client) return jsonError("Client not found", 404);

    const invitations = await prisma.clientInvitation.findMany({
      where: {
        clientId: id,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return jsonOk(invitations);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "members.invite");
    if (forbidden) return forbidden;

    const { id } = await params;
    const client = await findOwnedClient(
      id,
      result.workspace.id,
      result.accessibleClientIds,
    );
    if (!client) return jsonError("Client not found", 404);

    const body = inviteSchema.parse(await request.json());
    const email = normalizeInviteEmail(body.email);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: result.workspace.id,
            userId: existingUser.id,
          },
        },
      });
      if (member && member.role !== "GUEST") {
        return jsonError("User is already a team member of this workspace", 409);
      }

      const existingAccess = await prisma.clientAccess.findUnique({
        where: {
          clientId_userId: { clientId: id, userId: existingUser.id },
        },
      });
      if (existingAccess) {
        return jsonError("User already has access to this client", 409);
      }
    }

    const pending = await prisma.clientInvitation.findFirst({
      where: {
        clientId: id,
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (pending) {
      return jsonError("Pending invitation already exists for this email", 409);
    }

    const token = createInviteToken();
    const invitation = await prisma.clientInvitation.create({
      data: {
        clientId: id,
        email,
        role: "VIEWER",
        token,
        invitedById: result.session.user.id,
        expiresAt: inviteExpiresAt(),
      },
    });

    const url = inviteAcceptUrl(token);
    logClientInviteLink(email, client.name, url);

    return jsonOk({ ...invitation, acceptUrl: url }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

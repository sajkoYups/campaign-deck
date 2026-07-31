import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";
import { assignableRoles, can } from "@/lib/permissions";
import {
  createInviteToken,
  inviteAcceptUrl,
  inviteExpiresAt,
  INVITE_ROLES,
  logInviteLink,
  normalizeInviteEmail,
} from "@/lib/invitations";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "EDITOR", "VIEWER"]),
});

export async function GET() {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    if (!can(result.role, "members.invite") && !can(result.role, "members.manage")) {
      return jsonError("Forbidden", 403);
    }

    const invitations = await prisma.workspaceInvitation.findMany({
      where: {
        workspaceId: result.workspace.id,
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

export async function POST(request: Request) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "members.invite");
    if (forbidden) return forbidden;

    const body = inviteSchema.parse(await request.json());
    if (!INVITE_ROLES.includes(body.role)) {
      return jsonError("Invalid role", 400);
    }
    if (!assignableRoles(result.role).includes(body.role)) {
      return jsonError("You cannot invite that role", 403);
    }

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
      if (member) return jsonError("User is already a member", 409);
    }

    const pending = await prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId: result.workspace.id,
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (pending) {
      return jsonError("Pending invitation already exists for this email", 409);
    }

    const token = createInviteToken();
    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId: result.workspace.id,
        email,
        role: body.role,
        token,
        invitedById: result.session.user.id,
        expiresAt: inviteExpiresAt(),
      },
    });

    const url = inviteAcceptUrl(token);
    logInviteLink(email, url);

    return jsonOk({ ...invitation, acceptUrl: url }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

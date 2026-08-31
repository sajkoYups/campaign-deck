import { cookies, headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { WORKSPACE_COOKIE } from "@/lib/permissions";
import { normalizeInviteEmail } from "@/lib/invitations";

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  password: z.string().min(8).optional(),
});

async function resolveInvitation(token: string) {
  const clientInvitation = await prisma.clientInvitation.findUnique({
    where: { token },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          workspaceId: true,
          workspace: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (clientInvitation) {
    return { type: "client" as const, invitation: clientInvitation };
  }

  const workspaceInvitation = await prisma.workspaceInvitation.findUnique({
    where: { token },
    include: { workspace: { select: { id: true, name: true } } },
  });

  if (workspaceInvitation) {
    return { type: "workspace" as const, invitation: workspaceInvitation };
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) return jsonError("Missing token", 400);

    const resolved = await resolveInvitation(token);
    if (!resolved) return jsonError("Invitation not found", 404);

    const { invitation } = resolved;
    if (invitation.acceptedAt) {
      return jsonError("Invitation not found", 404);
    }
    if (invitation.expiresAt < new Date()) {
      return jsonError("Invitation expired", 410);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });

    if (resolved.type === "client") {
      return jsonOk({
        type: "client",
        email: invitation.email,
        role: invitation.role,
        clientId: resolved.invitation.client.id,
        clientName: resolved.invitation.client.name,
        workspaceName: resolved.invitation.client.workspace.name,
        workspaceId: resolved.invitation.client.workspaceId,
        needsAccount: !existingUser,
      });
    }

    return jsonOk({
      type: "workspace",
      email: invitation.email,
      role: invitation.role,
      workspaceName: resolved.invitation.workspace.name,
      workspaceId: resolved.invitation.workspace.id,
      needsAccount: !existingUser,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function resolveOrCreateUser(
  inviteEmail: string,
  body: z.infer<typeof acceptSchema>,
): Promise<{ error: Response } | { userId: string }> {
  const existing = await prisma.user.findUnique({
    where: { email: inviteEmail },
  });

  if (existing) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return { error: jsonError("Sign in with the invited email to accept", 401) };
    }
    if (normalizeInviteEmail(session.user.email) !== inviteEmail) {
      return { error: jsonError("Signed-in email does not match invitation", 403) };
    }
    return { userId: session.user.id };
  }

  if (!body.name || !body.password) {
    return {
      error: jsonError("Name and password are required to create an account", 400),
    };
  }

  const signedUp = await auth.api.signUpEmail({
    body: {
      name: body.name,
      email: inviteEmail,
      password: body.password,
    },
    headers: await headers(),
  });

  return { userId: signedUp.user.id };
}

function setWorkspaceCookie(workspaceId: string) {
  return cookies().then((cookieStore) => {
    cookieStore.set(WORKSPACE_COOKIE, workspaceId, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
  });
}

export async function POST(request: Request) {
  try {
    const body = acceptSchema.parse(await request.json());
    const resolved = await resolveInvitation(body.token);

    if (!resolved) return jsonError("Invitation not found", 404);

    const { invitation } = resolved;
    if (invitation.acceptedAt) {
      return jsonError("Invitation not found", 404);
    }
    if (invitation.expiresAt < new Date()) {
      return jsonError("Invitation expired", 410);
    }

    const inviteEmail = normalizeInviteEmail(invitation.email);
    const userResult = await resolveOrCreateUser(inviteEmail, body);
    if ("error" in userResult) return userResult.error;
    const { userId } = userResult;

    if (resolved.type === "client") {
      const client = resolved.invitation.client;
      const workspaceId = client.workspaceId;

      const alreadyMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId },
        },
      });

      if (alreadyMember && alreadyMember.role !== "GUEST") {
        await prisma.clientInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });
        return jsonError("Already a team member of this workspace", 409);
      }

      const existingAccess = await prisma.clientAccess.findUnique({
        where: {
          clientId_userId: { clientId: client.id, userId },
        },
      });
      if (existingAccess) {
        await prisma.clientInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });
        await setWorkspaceCookie(workspaceId);
        return jsonOk({
          type: "client",
          workspaceId,
          clientId: client.id,
          role: "GUEST",
        });
      }

      await prisma.$transaction(async (tx) => {
        if (!alreadyMember) {
          await tx.workspaceMember.create({
            data: {
              workspaceId,
              userId,
              role: "GUEST",
            },
          });
        }

        await tx.clientAccess.create({
          data: {
            clientId: client.id,
            userId,
            role: resolved.invitation.role,
          },
        });

        await tx.clientInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });
      });

      await setWorkspaceCookie(workspaceId);

      return jsonOk({
        type: "client",
        workspaceId,
        clientId: client.id,
        role: "GUEST",
      });
    }

    const workspaceId = resolved.invitation.workspaceId;

    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });
    if (alreadyMember) {
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      return jsonError("Already a member of this workspace", 409);
    }

    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          role: resolved.invitation.role,
        },
      }),
      prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    await setWorkspaceCookie(workspaceId);

    return jsonOk({
      type: "workspace",
      workspaceId,
      role: resolved.invitation.role,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

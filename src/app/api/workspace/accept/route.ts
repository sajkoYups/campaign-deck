import { cookies, headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { WORKSPACE_COOKIE } from "@/lib/permissions";
import { normalizeInviteEmail } from "@/lib/invitations";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) return jsonError("Missing token", 400);

    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { token },
      include: { workspace: { select: { id: true, name: true } } },
    });

    if (!invitation || invitation.acceptedAt) {
      return jsonError("Invitation not found", 404);
    }
    if (invitation.expiresAt < new Date()) {
      return jsonError("Invitation expired", 410);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });

    return jsonOk({
      email: invitation.email,
      role: invitation.role,
      workspaceName: invitation.workspace.name,
      workspaceId: invitation.workspace.id,
      needsAccount: !existingUser,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  password: z.string().min(8).optional(),
});

export async function POST(request: Request) {
  try {
    const body = acceptSchema.parse(await request.json());
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { token: body.token },
      include: { workspace: true },
    });

    if (!invitation || invitation.acceptedAt) {
      return jsonError("Invitation not found", 404);
    }
    if (invitation.expiresAt < new Date()) {
      return jsonError("Invitation expired", 410);
    }

    const inviteEmail = normalizeInviteEmail(invitation.email);
    let userId: string | null = null;

    const existing = await prisma.user.findUnique({
      where: { email: inviteEmail },
    });

    if (existing) {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session?.user) {
        return jsonError("Sign in with the invited email to accept", 401);
      }
      if (normalizeInviteEmail(session.user.email) !== inviteEmail) {
        return jsonError("Signed-in email does not match invitation", 403);
      }
      userId = session.user.id;
    } else {
      if (!body.name || !body.password) {
        return jsonError("Name and password are required to create an account", 400);
      }

      const signedUp = await auth.api.signUpEmail({
        body: {
          name: body.name,
          email: inviteEmail,
          password: body.password,
        },
        headers: await headers(),
      });

      userId = signedUp.user.id;
    }

    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId: userId!,
        },
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
          workspaceId: invitation.workspaceId,
          userId: userId!,
          role: invitation.role,
        },
      }),
      prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    const cookieStore = await cookies();
    cookieStore.set(WORKSPACE_COOKIE, invitation.workspaceId, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });

    return jsonOk({
      workspaceId: invitation.workspaceId,
      role: invitation.role,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

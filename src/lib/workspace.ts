import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Workspace, WorkspaceMember, WorkspaceRole } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WORKSPACE_COOKIE } from "@/lib/permissions";

export type WorkspaceContext = {
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  workspace: Workspace;
  member: WorkspaceMember;
  role: WorkspaceRole;
};

async function resolveMembership(userId: string, preferredId: string | undefined) {
  if (preferredId) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: preferredId, userId },
      },
      include: { workspace: true },
    });
    if (member) return member;
  }

  const owned = await prisma.workspaceMember.findFirst({
    where: { userId, role: "OWNER" },
    orderBy: { createdAt: "asc" },
    include: { workspace: true },
  });
  if (owned) return owned;

  return prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { workspace: true },
  });
}

export const getCurrentWorkspace = cache(async (): Promise<WorkspaceContext | null> => {
  const session = await getSession();
  if (!session?.user) return null;

  const cookieStore = await cookies();
  const preferredId = cookieStore.get(WORKSPACE_COOKIE)?.value;

  const membership = await resolveMembership(session.user.id, preferredId);
  if (!membership) return null;

  return {
    session,
    workspace: membership.workspace,
    member: membership,
    role: membership.role,
  };
});

export async function requireWorkspace(): Promise<WorkspaceContext> {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const preferredId = cookieStore.get(WORKSPACE_COOKIE)?.value;
  const membership = await resolveMembership(session.user.id, preferredId);

  if (!membership) {
    redirect("/no-workspace");
  }

  return {
    session,
    workspace: membership.workspace,
    member: membership,
    role: membership.role,
  };
}

export async function listUserWorkspaces(userId: string) {
  return prisma.workspaceMember.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      workspace: {
        select: { id: true, name: true, slug: true, logoPath: true },
      },
    },
  });
}

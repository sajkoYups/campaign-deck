import { cookies, headers } from "next/headers";
import type { Workspace, WorkspaceMember, WorkspaceRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import {
  getAccessibleClientIds,
  type AccessibleClientIds,
} from "@/lib/client-access";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import {
  can,
  WORKSPACE_COOKIE,
  type Permission,
} from "@/lib/permissions";

export type ApiWorkspaceContext = {
  session: {
    user: { id: string; email: string; name: string };
  };
  workspace: Workspace;
  member: WorkspaceMember;
  role: WorkspaceRole;
  /** `null` = all clients; string[] = guest allowlist */
  accessibleClientIds: AccessibleClientIds;
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

export async function requireApiWorkspace(): Promise<
  { error: Response } | ApiWorkspaceContext
> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: jsonError("Unauthorized", 401) };
  }

  const cookieStore = await cookies();
  const preferredId = cookieStore.get(WORKSPACE_COOKIE)?.value;
  const membership = await resolveMembership(session.user.id, preferredId);

  if (!membership) {
    return { error: jsonError("Workspace not found", 404) };
  }

  const accessibleClientIds = await getAccessibleClientIds(
    session.user.id,
    membership.workspace.id,
    membership.role,
  );

  return {
    session: {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
    },
    workspace: membership.workspace,
    member: membership,
    role: membership.role,
    accessibleClientIds,
  };
}

export function requirePermission(
  ctx: ApiWorkspaceContext,
  permission: Permission,
): Response | null {
  if (!can(ctx.role, permission)) {
    return jsonError("Forbidden", 403);
  }
  return null;
}

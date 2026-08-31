import type { WorkspaceRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isGuest } from "@/lib/permissions";

/** `null` means full-team access (all clients). Guests get an allowlist. */
export type AccessibleClientIds = string[] | null;

export async function getAccessibleClientIds(
  userId: string,
  workspaceId: string,
  role: WorkspaceRole,
): Promise<AccessibleClientIds> {
  if (!isGuest(role)) return null;

  const rows = await prisma.clientAccess.findMany({
    where: {
      userId,
      client: { workspaceId },
    },
    select: { clientId: true },
  });

  return rows.map((r) => r.clientId);
}

export function clientWhereFilter(
  workspaceId: string,
  accessibleClientIds: AccessibleClientIds,
): { workspaceId: string; id?: { in: string[] } } {
  if (accessibleClientIds === null) {
    return { workspaceId };
  }
  return { workspaceId, id: { in: accessibleClientIds } };
}

/** Use as `where: { client: nestedClientWhere(...) }` on Campaign. */
export function nestedClientWhere(
  workspaceId: string,
  accessibleClientIds: AccessibleClientIds,
): { workspaceId: string; id?: { in: string[] } } {
  return clientWhereFilter(workspaceId, accessibleClientIds);
}

export function canAccessClient(
  clientId: string,
  accessibleClientIds: AccessibleClientIds,
): boolean {
  if (accessibleClientIds === null) return true;
  return accessibleClientIds.includes(clientId);
}

export async function revokeClientAccess(clientId: string, userId: string) {
  const access = await prisma.clientAccess.findUnique({
    where: { clientId_userId: { clientId, userId } },
    include: { client: { select: { workspaceId: true } } },
  });
  if (!access) return { revoked: false };

  await prisma.clientAccess.delete({
    where: { id: access.id },
  });

  const remaining = await prisma.clientAccess.count({
    where: {
      userId,
      client: { workspaceId: access.client.workspaceId },
    },
  });

  if (remaining === 0) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: access.client.workspaceId,
          userId,
        },
      },
    });
    if (member?.role === "GUEST") {
      await prisma.workspaceMember.delete({ where: { id: member.id } });
    }
  }

  return { revoked: true };
}

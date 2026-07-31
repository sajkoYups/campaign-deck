import type { WorkspaceRole } from "@/generated/prisma/client";

export type Permission =
  | "workspace.settings"
  | "workspace.delete"
  | "workspace.transfer"
  | "members.invite"
  | "members.manage"
  | "campaigns.write"
  | "links.write"
  | "assets.write"
  | "assets.read"
  | "clients.write";

const ALL: Permission[] = [
  "workspace.settings",
  "workspace.delete",
  "workspace.transfer",
  "members.invite",
  "members.manage",
  "campaigns.write",
  "links.write",
  "assets.write",
  "assets.read",
  "clients.write",
];

const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  OWNER: ALL,
  ADMIN: ALL.filter(
    (p) => p !== "workspace.delete" && p !== "workspace.transfer",
  ),
  MANAGER: [
    "members.invite",
    "campaigns.write",
    "links.write",
    "assets.write",
    "assets.read",
    "clients.write",
  ],
  EDITOR: [
    "campaigns.write",
    "links.write",
    "assets.write",
    "assets.read",
    "clients.write",
  ],
  VIEWER: ["assets.read"],
};

export function can(role: WorkspaceRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Roles an actor may assign when inviting or changing members. */
export function assignableRoles(actorRole: WorkspaceRole): WorkspaceRole[] {
  switch (actorRole) {
    case "OWNER":
      return ["ADMIN", "MANAGER", "EDITOR", "VIEWER"];
    case "ADMIN":
      return ["MANAGER", "EDITOR", "VIEWER"];
    case "MANAGER":
      return ["EDITOR", "VIEWER"];
    default:
      return [];
  }
}

export function roleRank(role: WorkspaceRole): number {
  switch (role) {
    case "OWNER":
      return 5;
    case "ADMIN":
      return 4;
    case "MANAGER":
      return 3;
    case "EDITOR":
      return 2;
    case "VIEWER":
      return 1;
  }
}

export function canManageMember(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
): boolean {
  if (targetRole === "OWNER") return false;
  if (!can(actorRole, "members.manage") && actorRole !== "MANAGER") {
    return can(actorRole, "members.invite") && ["EDITOR", "VIEWER"].includes(targetRole);
  }
  if (actorRole === "MANAGER") {
    return targetRole === "EDITOR" || targetRole === "VIEWER";
  }
  return roleRank(actorRole) > roleRank(targetRole);
}

export const WORKSPACE_COOKIE = "cd_workspace_id";

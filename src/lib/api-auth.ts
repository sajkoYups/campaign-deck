import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";

export async function requireApiWorkspace() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: jsonError("Unauthorized", 401) } as const;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { userId: session.user.id },
  });

  if (!workspace) {
    return { error: jsonError("Workspace not found", 404) } as const;
  }

  return { session, workspace } as const;
}

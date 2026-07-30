import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const getCurrentWorkspace = cache(async () => {
  const session = await getSession();
  if (!session?.user) {
    return null;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { userId: session.user.id },
  });

  return workspace ? { session, workspace } : null;
});

export async function requireWorkspace() {
  const result = await getCurrentWorkspace();
  if (!result) {
    redirect("/login");
  }
  return result;
}

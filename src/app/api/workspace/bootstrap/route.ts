import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { uniqueSlug } from "@/lib/slug";
import { customAlphabet } from "nanoid";
import { WORKSPACE_COOKIE } from "@/lib/permissions";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

/** Create first workspace + Owner membership after normal registration. */
export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) return jsonError("Unauthorized", 401);

    const existing = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
    });
    if (existing) {
      return jsonOk({ workspaceId: existing.workspaceId, existing: true });
    }

    const baseName = session.user.name?.trim() || "My Workspace";
    const name = baseName.endsWith("Workspace")
      ? baseName
      : `${baseName}'s Workspace`;

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug: uniqueSlug(baseName, nanoid()),
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
    });

    const cookieStore = await cookies();
    cookieStore.set(WORKSPACE_COOKIE, workspace.id, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });

    return jsonOk({ workspaceId: workspace.id }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

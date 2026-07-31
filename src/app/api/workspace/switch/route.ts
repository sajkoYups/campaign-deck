import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { WORKSPACE_COOKIE } from "@/lib/permissions";

const bodySchema = z.object({
  workspaceId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) return jsonError("Unauthorized", 401);

    const body = bodySchema.parse(await request.json());
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: body.workspaceId,
          userId: session.user.id,
        },
      },
    });
    if (!member) return jsonError("Not a member of this workspace", 403);

    const cookieStore = await cookies();
    cookieStore.set(WORKSPACE_COOKIE, body.workspaceId, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });

    return jsonOk({ workspaceId: body.workspaceId });
  } catch (error) {
    return handleApiError(error);
  }
}

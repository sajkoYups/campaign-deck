import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";
import { updateWorkspaceSchema } from "@/lib/validations";
import { WORKSPACE_COOKIE } from "@/lib/permissions";

export async function GET() {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    return jsonOk({
      ...result.workspace,
      role: result.role,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "workspace.settings");
    if (forbidden) return forbidden;

    const body = await request.json();
    const data = updateWorkspaceSchema.parse(body);

    if (data.slug && data.slug !== result.workspace.slug) {
      const taken = await prisma.workspace.findUnique({
        where: { slug: data.slug },
      });
      if (taken) return jsonError("Workspace slug already taken", 409);
    }

    const workspace = await prisma.workspace.update({
      where: { id: result.workspace.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      },
    });

    return jsonOk(workspace);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "workspace.delete");
    if (forbidden) return forbidden;

    await prisma.workspace.delete({ where: { id: result.workspace.id } });

    const cookieStore = await cookies();
    cookieStore.delete(WORKSPACE_COOKIE);

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

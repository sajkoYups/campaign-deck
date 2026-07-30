import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace } from "@/lib/api-auth";
import { updateWorkspaceSchema } from "@/lib/validations";

export async function GET() {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    return jsonOk(result.workspace);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;

    const body = await request.json();
    const data = updateWorkspaceSchema.parse(body);

    if (data.slug !== result.workspace.slug) {
      const taken = await prisma.workspace.findUnique({
        where: { slug: data.slug },
      });
      if (taken) return jsonError("Workspace slug already taken", 409);
    }

    const workspace = await prisma.workspace.update({
      where: { id: result.workspace.id },
      data,
    });

    return jsonOk(workspace);
  } catch (error) {
    return handleApiError(error);
  }
}

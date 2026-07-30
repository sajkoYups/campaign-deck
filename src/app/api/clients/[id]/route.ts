import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace } from "@/lib/api-auth";
import { updateClientSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const { id } = await params;

    const client = await prisma.client.findFirst({
      where: { id, workspaceId: result.workspace.id },
      include: {
        campaigns: {
          orderBy: { updatedAt: "desc" },
          include: { _count: { select: { links: true } } },
        },
      },
    });

    if (!client) return jsonError("Client not found", 404);
    return jsonOk(client);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const { id } = await params;

    const existing = await prisma.client.findFirst({
      where: { id, workspaceId: result.workspace.id },
    });
    if (!existing) return jsonError("Client not found", 404);

    const body = await request.json();
    const data = updateClientSchema.parse(body);

    const client = await prisma.client.update({
      where: { id },
      data,
    });

    return jsonOk(client);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const { id } = await params;

    const existing = await prisma.client.findFirst({
      where: { id, workspaceId: result.workspace.id },
    });
    if (!existing) return jsonError("Client not found", 404);

    await prisma.client.delete({ where: { id } });
    return jsonOk({ id });
  } catch (error) {
    return handleApiError(error);
  }
}

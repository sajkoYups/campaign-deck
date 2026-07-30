import { handleApiError, jsonOk } from "@/lib/api";
import { requireApiWorkspace } from "@/lib/api-auth";
import { createClientSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;

    const clients = await prisma.client.findMany({
      where: { workspaceId: result.workspace.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { campaigns: true } },
      },
    });

    return jsonOk(clients);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;

    const body = await request.json();
    const data = createClientSchema.parse(body);

    const client = await prisma.client.create({
      data: {
        workspaceId: result.workspace.id,
        name: data.name,
        website: data.website,
        notes: data.notes,
      },
    });

    return jsonOk(client, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

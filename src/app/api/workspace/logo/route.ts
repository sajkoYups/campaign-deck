import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";
import { getStorage } from "@/lib/storage";
import { logoStorageKey } from "@/lib/storage/assets";

const LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export async function GET() {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    if (!result.workspace.logoPath) {
      return jsonError("No logo", 404);
    }
    const buf = await getStorage().get(result.workspace.logoPath);
    if (!buf) return jsonError("Logo missing", 404);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "workspace.settings");
    if (forbidden) return forbidden;

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("File required", 400);
    if (!LOGO_TYPES.has(file.type)) return jsonError("Invalid logo type", 400);
    if (file.size > 5 * 1024 * 1024) return jsonError("Logo too large (max 5MB)", 400);

    const key = logoStorageKey(result.workspace.id, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();
    if (result.workspace.logoPath) {
      await storage.delete(result.workspace.logoPath);
    }
    await storage.put(key, buffer, file.type);

    const workspace = await prisma.workspace.update({
      where: { id: result.workspace.id },
      data: { logoPath: key },
    });

    return jsonOk(workspace);
  } catch (error) {
    return handleApiError(error);
  }
}

import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import type { StorageProvider } from "@/lib/storage/types";

const ROOT = path.join(process.cwd(), "data", "uploads");

export class LocalStorageProvider implements StorageProvider {
  private resolve(key: string) {
    const safe = key.replace(/\.\./g, "").replace(/^\/+/, "");
    return path.join(ROOT, safe);
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.resolve(key));
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolve(key));
    } catch {
      // ignore missing
    }
  }
}

let cached: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (cached) return cached;
  const provider = process.env.STORAGE_PROVIDER || "local";
  if (provider !== "local") {
    throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
  }
  cached = new LocalStorageProvider();
  return cached;
}

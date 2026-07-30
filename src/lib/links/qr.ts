import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

const DATA_DIR = "data";
const QR_SUBDIR = "qrcodes";

function qrDir(): string {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), DATA_DIR, QR_SUBDIR);
}

export function qrFilePath(linkId: string): string {
  return path.join(qrDir(), `${linkId}.png`);
}

export function qrRelativePath(linkId: string): string {
  return path.join(DATA_DIR, QR_SUBDIR, `${linkId}.png`);
}

export async function generateQrPng(
  linkId: string,
  shortUrl: string,
): Promise<string> {
  await fs.mkdir(qrDir(), { recursive: true });
  const filePath = qrFilePath(linkId);
  await QRCode.toFile(filePath, shortUrl, {
    type: "png",
    width: 512,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
  return qrRelativePath(linkId);
}

export async function readQrPng(
  linkId: string,
  shortUrl: string,
  storedPath?: string | null,
): Promise<Buffer> {
  const filePath = storedPath
    ? path.join(/*turbopackIgnore: true*/ process.cwd(), storedPath)
    : qrFilePath(linkId);

  try {
    return await fs.readFile(filePath);
  } catch {
    await generateQrPng(linkId, shortUrl);
    return fs.readFile(qrFilePath(linkId));
  }
}

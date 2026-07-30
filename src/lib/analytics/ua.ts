import { UAParser } from "ua-parser-js";

export type DeviceInfo = {
  device: string;
  browser: string;
  operatingSystem: string;
};

export function parseUserAgent(
  userAgent: string | null | undefined,
): DeviceInfo {
  if (!userAgent) {
    return {
      device: "Unknown",
      browser: "Unknown",
      operatingSystem: "Unknown",
    };
  }

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const deviceType = result.device.type;
  let device = "Desktop";
  if (deviceType === "mobile") device = "Mobile";
  else if (deviceType === "tablet") device = "Tablet";
  else if (deviceType) device = deviceType;

  const browser = result.browser.name || "Unknown";
  const operatingSystem = result.os.name || "Unknown";

  return { device, browser, operatingSystem };
}

export function normalizeReferrer(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return referrer.slice(0, 200);
  }
}

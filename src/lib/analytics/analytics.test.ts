import { describe, expect, it } from "vitest";
import { hashVisitor, isBot } from "@/lib/analytics/visitor";
import { normalizeReferrer, parseUserAgent } from "@/lib/analytics/ua";
import {
  applyUtmToUrl,
  normalizeUtmValue,
  validateUtmAgainstAllowlist,
} from "@/lib/analytics/utm";
import { resolveDateRange } from "@/lib/analytics/queries";

describe("bot detection", () => {
  it("flags known bots", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("Slackbot-LinkExpanding 1.0")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("Discordbot/2.0")).toBe(true);
  });

  it("allows normal browsers", () => {
    expect(
      isBot(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe(false);
  });

  it("treats empty UA as bot", () => {
    expect(isBot("")).toBe(true);
    expect(isBot(null)).toBe(true);
  });
});

describe("visitor hash", () => {
  it("is stable and never stores raw IP", () => {
    const a = hashVisitor("1.2.3.4", "Chrome");
    const b = hashVisitor("1.2.3.4", "Chrome");
    const c = hashVisitor("1.2.3.5", "Chrome");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toContain("1.2.3.4");
    expect(a).toHaveLength(32);
  });
});

describe("ua parsing", () => {
  it("detects mobile device", () => {
    const info = parseUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    );
    expect(info.device).toBe("Mobile");
  });

  it("normalizes referrer host", () => {
    expect(normalizeReferrer("https://www.facebook.com/ads")).toBe(
      "facebook.com",
    );
    expect(normalizeReferrer(null)).toBeNull();
  });
});

describe("utm helpers", () => {
  it("normalizes values", () => {
    expect(normalizeUtmValue("  Paid Social ")).toBe("paid-social");
    expect(normalizeUtmValue("FACEBOOK")).toBe("facebook");
  });

  it("applies utm params to destination url", () => {
    const url = applyUtmToUrl("https://example.com/products", {
      utmSource: "facebook",
      utmMedium: "paid-social",
      utmCampaign: "summer-sale",
    });
    expect(url).toContain("utm_source=facebook");
    expect(url).toContain("utm_medium=paid-social");
    expect(url).toContain("utm_campaign=summer-sale");
  });

  it("validates against allowlist", () => {
    const ok = validateUtmAgainstAllowlist("Facebook", ["facebook"], "Source");
    expect(ok).toEqual({ ok: true, value: "facebook" });

    const bad = validateUtmAgainstAllowlist("meta", ["facebook"], "Source");
    expect(bad.ok).toBe(false);
  });
});

describe("date range", () => {
  it("resolves presets", () => {
    const today = resolveDateRange("today");
    expect(today.from.toISOString().slice(0, 10)).toBe(
      new Date().toISOString().slice(0, 10),
    );

    const week = resolveDateRange("7d");
    const diffDays =
      (week.to.getTime() - week.from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThan(8);
  });
});

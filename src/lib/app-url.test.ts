import { afterEach, describe, expect, it } from "vitest";
import { getPublicAppUrl } from "@/lib/app-url";
import { getDatabaseUrl, withProductionSsl } from "@/lib/database-url";
import { getShortUrlBase } from "@/lib/links/url";

const keys = [
  "APP_URL",
  "BETTER_AUTH_URL",
  "RENDER_EXTERNAL_URL",
  "SHORT_URL_BASE",
  "DATABASE_URL",
  "NODE_ENV",
] as const;

const original: Record<string, string | undefined> = {};

for (const key of keys) {
  original[key] = process.env[key];
}

afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original[key];
    }
  }
});

describe("getPublicAppUrl", () => {
  it("prefers APP_URL", () => {
    process.env.APP_URL = "https://app.example.com/";
    process.env.BETTER_AUTH_URL = "https://auth.example.com";
    process.env.RENDER_EXTERNAL_URL = "https://unused.onrender.com";
    expect(getPublicAppUrl()).toBe("https://app.example.com");
  });

  it("falls back to RENDER_EXTERNAL_URL", () => {
    delete process.env.APP_URL;
    delete process.env.BETTER_AUTH_URL;
    process.env.RENDER_EXTERNAL_URL = "https://campaigndeck.onrender.com";
    expect(getPublicAppUrl()).toBe("https://campaigndeck.onrender.com");
  });
});

describe("getShortUrlBase", () => {
  it("uses the public app url when SHORT_URL_BASE is unset", () => {
    delete process.env.SHORT_URL_BASE;
    process.env.APP_URL = "https://app.example.com";
    expect(getShortUrlBase()).toBe("https://app.example.com/r");
  });
});

describe("withProductionSsl", () => {
  it("appends sslmode=require in production when missing", () => {
    process.env.NODE_ENV = "production";
    expect(
      withProductionSsl("postgresql://user:pass@host:5432/db"),
    ).toBe("postgresql://user:pass@host:5432/db?sslmode=require");
  });

  it("does not duplicate sslmode", () => {
    process.env.NODE_ENV = "production";
    expect(
      withProductionSsl(
        "postgresql://user:pass@host:5432/db?sslmode=require",
      ),
    ).toBe("postgresql://user:pass@host:5432/db?sslmode=require");
  });

  it("leaves local urls unchanged", () => {
    process.env.NODE_ENV = "test";
    expect(
      withProductionSsl("postgresql://campaigndeck:campaigndeck@localhost:5432/campaigndeck"),
    ).toBe(
      "postgresql://campaigndeck:campaigndeck@localhost:5432/campaigndeck",
    );
  });
});

describe("getDatabaseUrl", () => {
  it("throws in production when DATABASE_URL is missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.DATABASE_URL;
    expect(() => getDatabaseUrl()).toThrow("DATABASE_URL is not set");
  });
});

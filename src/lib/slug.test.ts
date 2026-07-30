import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";
import { buildShortUrl, slugFromName } from "@/lib/links/url";
import {
  createClientSchema,
  createLinkSchema,
  updateWorkspaceSchema,
  urlSchema,
} from "@/lib/validations";

describe("slugify", () => {
  it("normalizes names", () => {
    expect(slugify("Black Friday!")).toBe("black-friday");
    expect(slugify("  Nike  ")).toBe("nike");
  });

  it("builds unique workspace slugs", () => {
    expect(uniqueSlug("Acme Agency", "abc123")).toBe("acme-agency-abc123");
  });
});

describe("link slugs", () => {
  it("builds short urls from base", () => {
    process.env.SHORT_URL_BASE = "https://go.example.com/r";
    expect(buildShortUrl("summer/facebook")).toBe(
      "https://go.example.com/r/summer/facebook",
    );
  });

  it("creates slug from name", () => {
    expect(slugFromName("Facebook Carousel")).toBe("facebook-carousel");
  });
});

describe("validation", () => {
  it("accepts valid urls", () => {
    expect(urlSchema.parse("https://example.com/path")).toBe(
      "https://example.com/path",
    );
  });

  it("rejects non-http urls", () => {
    expect(() => urlSchema.parse("ftp://example.com")).toThrow();
  });

  it("validates client payloads", () => {
    const data = createClientSchema.parse({
      name: "BioShop",
      website: "https://bioshop.com",
      notes: "",
    });
    expect(data.website).toBe("https://bioshop.com");
    expect(data.notes).toBeUndefined();
  });

  it("validates nested link slugs", () => {
    const data = createLinkSchema.parse({
      campaignId: "cmp_1",
      name: "Facebook Carousel",
      destinationUrl: "https://example.com/shoes",
      slug: "summer/facebook",
    });
    expect(data.slug).toBe("summer/facebook");
  });

  it("rejects invalid slugs", () => {
    expect(() =>
      createLinkSchema.parse({
        campaignId: "cmp_1",
        name: "Bad",
        destinationUrl: "https://example.com",
        slug: "Bad Slug!",
      }),
    ).toThrow();
  });

  it("validates workspace updates", () => {
    const data = updateWorkspaceSchema.parse({
      name: "Agency",
      slug: "agency",
    });
    expect(data.slug).toBe("agency");
  });
});

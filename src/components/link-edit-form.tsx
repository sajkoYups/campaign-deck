"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LinkData = {
  id: string;
  name: string;
  destinationUrl: string;
  slug: string;
  shortUrl: string;
  notes: string | null;
  qrPlacement: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  campaign: {
    id: string;
    name: string;
    client: { id: string; name: string };
  };
};

type UtmSettings = {
  allowedSources: string[];
  allowedMediums: string[];
};

function stripUtm(url: string): string {
  try {
    const parsed = new URL(url);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(
      (key) => parsed.searchParams.delete(key),
    );
    return parsed.toString();
  } catch {
    return url;
  }
}

export function LinkEditForm({ link }: { link: LinkData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<UtmSettings | null>(null);

  useEffect(() => {
    fetch("/api/settings/utm")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setSettings(json.data);
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch(`/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        destinationUrl: form.get("destinationUrl"),
        slug: form.get("slug"),
        notes: form.get("notes") || undefined,
        utmSource: form.get("utmSource") || "",
        utmMedium: form.get("utmMedium") || "",
        utmCampaign: form.get("utmCampaign") || "",
        utmContent: form.get("utmContent") || "",
        utmTerm: form.get("utmTerm") || "",
        qrPlacement: form.get("qrPlacement") || "",
      }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(json.error?.message || "Failed to update link");
      return;
    }

    toast.success("Link updated");
    router.refresh();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link.shortUrl);
    toast.success("Link copied");
  }

  function downloadQr() {
    const a = document.createElement("a");
    a.href = `/api/links/${link.id}/qr?download=1`;
    a.download = `${link.slug.replace(/\//g, "-")}-qr.png`;
    a.click();
  }

  async function onDelete() {
    if (!confirm("Delete this link?")) return;
    const res = await fetch(`/api/links/${link.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete link");
      return;
    }
    toast.success("Link deleted");
    router.push(`/campaigns/${link.campaign.id}/links`);
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required defaultValue={link.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="destinationUrl">Destination URL (base)</Label>
          <Input
            id="destinationUrl"
            name="destinationUrl"
            type="url"
            required
            defaultValue={stripUtm(link.destinationUrl)}
          />
          <p className="text-xs text-muted-foreground">
            UTM params are applied automatically from the fields below.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" required defaultValue={link.slug} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shortUrl">Short URL</Label>
          <Input id="shortUrl" value={link.shortUrl} readOnly />
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="text-sm font-medium">UTM parameters</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="utmSource">Source</Label>
              {settings?.allowedSources.length ? (
                <select
                  id="utmSource"
                  name="utmSource"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  defaultValue={link.utmSource ?? ""}
                >
                  <option value="">None</option>
                  {settings.allowedSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="utmSource"
                  name="utmSource"
                  defaultValue={link.utmSource ?? ""}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="utmMedium">Medium</Label>
              {settings?.allowedMediums.length ? (
                <select
                  id="utmMedium"
                  name="utmMedium"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  defaultValue={link.utmMedium ?? ""}
                >
                  <option value="">None</option>
                  {settings.allowedMediums.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="utmMedium"
                  name="utmMedium"
                  defaultValue={link.utmMedium ?? ""}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="utmCampaign">Campaign</Label>
              <Input
                id="utmCampaign"
                name="utmCampaign"
                defaultValue={link.utmCampaign ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="utmContent">Content</Label>
              <Input
                id="utmContent"
                name="utmContent"
                defaultValue={link.utmContent ?? ""}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="utmTerm">Term</Label>
              <Input
                id="utmTerm"
                name="utmTerm"
                defaultValue={link.utmTerm ?? ""}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="qrPlacement">QR placement</Label>
          <Input
            id="qrPlacement"
            name="qrPlacement"
            defaultValue={link.qrPlacement ?? ""}
            list="qr-placements-edit"
          />
          <datalist id="qr-placements-edit">
            <option value="Store Poster" />
            <option value="Flyer" />
            <option value="Packaging" />
            <option value="Business Card" />
            <option value="Event Booth" />
          </datalist>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={link.notes ?? ""}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" variant="outline" onClick={copyLink}>
            <Copy className="size-4" />
            Copy link
          </Button>
          <Button type="button" variant="outline" onClick={downloadQr}>
            <Download className="size-4" />
            Download QR
          </Button>
          <Button type="button" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">QR code</h2>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/links/${link.id}/qr`}
            alt={`QR for ${link.name}`}
            className="mx-auto w-full max-w-[200px]"
          />
        </div>
        {link.qrPlacement && (
          <p className="text-xs text-muted-foreground">
            Placement: {link.qrPlacement}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Parent:{" "}
          <Link
            href={`/campaigns/${link.campaign.id}`}
            className="underline underline-offset-4"
          >
            {link.campaign.name}
          </Link>
        </p>
      </div>
    </div>
  );
}

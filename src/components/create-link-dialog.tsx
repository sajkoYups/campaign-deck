"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UtmFields } from "@/components/utm-fields";

type UtmSettings = {
  allowedSources: string[];
  allowedMediums: string[];
};

export function CreateLinkDialog({
  campaignId,
  campaignName,
}: {
  campaignId: string;
  campaignName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<UtmSettings | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/settings/utm")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setSettings(json.data);
      })
      .catch(() => undefined);
  }, [open]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        name: form.get("name"),
        destinationUrl: form.get("destinationUrl"),
        slug: form.get("slug") || undefined,
        notes: form.get("notes") || undefined,
        utmSource: form.get("utmSource") || undefined,
        utmMedium: form.get("utmMedium") || undefined,
        utmCampaign: form.get("utmCampaign") || undefined,
        utmContent: form.get("utmContent") || undefined,
        utmTerm: form.get("utmTerm") || undefined,
        qrPlacement: form.get("qrPlacement") || undefined,
      }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(json.error?.message || "Failed to create link");
      return;
    }

    toast.success("Link created");
    setOpen(false);
    router.push(`/links/${json.data.id}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Create link</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create link</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Facebook Carousel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="destinationUrl">Destination URL</Label>
            <Input
              id="destinationUrl"
              name="destinationUrl"
              type="url"
              required
              placeholder="https://example.com/shoes"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Custom slug (optional)</Label>
            <Input id="slug" name="slug" placeholder="summer/facebook" />
          </div>

          {open ? (
            <UtmFields campaignName={campaignName} settings={settings} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="qrPlacement">QR placement (optional)</Label>
            <Input
              id="qrPlacement"
              name="qrPlacement"
              placeholder="Store Poster"
              list="qr-placements"
            />
            <datalist id="qr-placements">
              <option value="Store Poster" />
              <option value="Flyer" />
              <option value="Packaging" />
              <option value="Business Card" />
              <option value="Event Booth" />
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WorkspaceSettingsForm({
  workspace,
  canEdit,
}: {
  workspace: {
    name: string;
    slug: string;
    timezone: string;
    logoPath: string | null;
  };
  canEdit: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        slug: form.get("slug"),
        timezone: form.get("timezone"),
      }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(json.error?.message || "Failed to update workspace");
      return;
    }

    toast.success("Workspace updated");
    router.refresh();
  }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !canEdit) return;
    setUploadingLogo(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/workspace/logo", {
      method: "POST",
      body: form,
    });
    setUploadingLogo(false);
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error?.message || "Failed to upload logo");
      return;
    }
    toast.success("Logo updated");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Workspace name</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={workspace.name}
          disabled={!canEdit}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Workspace slug</Label>
        <Input
          id="slug"
          name="slug"
          required
          defaultValue={workspace.slug}
          disabled={!canEdit}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="timezone">Default timezone</Label>
        <Input
          id="timezone"
          name="timezone"
          required
          defaultValue={workspace.timezone}
          disabled={!canEdit}
          placeholder="UTC"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="logo">Workspace logo</Label>
        {workspace.logoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/workspace/logo`}
            alt="Workspace logo"
            className="mb-2 h-12 w-12 rounded-md object-cover"
          />
        ) : null}
        <Input
          id="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          disabled={!canEdit || uploadingLogo}
          onChange={onLogo}
        />
      </div>
      {canEdit ? (
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save changes"}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          Only owners and admins can edit workspace settings.
        </p>
      )}
    </form>
  );
}

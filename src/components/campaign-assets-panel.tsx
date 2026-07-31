"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { can } from "@/lib/permissions";
import type { WorkspaceRole } from "@/generated/prisma/client";

type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  _count: { assets: number; children: number };
};

type Asset = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  thumbnailKey: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string };
  folder: { id: string; name: string } | null;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function CampaignAssetsPanel({
  campaignId,
  role,
}: {
  campaignId: string;
  role: WorkspaceRole;
}) {
  const canWrite = can(role, "assets.write");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [folderId, setFolderId] = useState<string | "root">("root");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Asset | null>(null);

  const loadFolders = useCallback(async () => {
    const res = await fetch(`/api/asset-folders?campaignId=${campaignId}`);
    const json = await res.json();
    if (res.ok) setFolders(json.data ?? []);
  }, [campaignId]);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      campaignId,
      page: String(page),
      pageSize: "24",
      folderId: folderId === "root" ? "root" : folderId,
    });
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    const res = await fetch(`/api/assets?${params}`);
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(json.error?.message || "Failed to load assets");
      return;
    }
    setAssets(json.data.items ?? []);
    setTotalPages(json.data.totalPages || 1);
  }, [campaignId, folderId, page, q, type]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  async function onUpload(files: FileList | null) {
    if (!files?.length || !canWrite) return;
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      form.append("campaignId", campaignId);
      if (folderId !== "root") form.append("folderId", folderId);
      const res = await fetch("/api/assets", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message || `Failed to upload ${file.name}`);
      }
    }
    toast.success("Upload complete");
    void loadAssets();
    void loadFolders();
  }

  async function createFolder() {
    const name = prompt("Folder name");
    if (!name) return;
    const res = await fetch("/api/asset-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        name,
        parentId: folderId === "root" ? null : folderId,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error?.message || "Failed to create folder");
      return;
    }
    void loadFolders();
  }

  async function renameAsset(asset: Asset) {
    const name = prompt("Rename file", asset.originalName);
    if (!name || name === asset.originalName) return;
    const res = await fetch(`/api/assets/${asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originalName: name }),
    });
    if (!res.ok) {
      toast.error("Rename failed");
      return;
    }
    void loadAssets();
  }

  async function deleteAsset(asset: Asset) {
    if (!confirm(`Delete ${asset.originalName}?`)) return;
    const res = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    setPreview(null);
    void loadAssets();
  }

  async function replaceAsset(asset: Asset, file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/assets/${asset.id}`, {
      method: "PATCH",
      body: form,
    });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error?.message || "Replace failed");
      return;
    }
    toast.success("File replaced");
    setPreview(null);
    void loadAssets();
  }

  const rootFolders = folders.filter((f) => !f.parentId);

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <aside className="space-y-2">
        <button
          type="button"
          onClick={() => {
            setFolderId("root");
            setPage(1);
          }}
          className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
            folderId === "root" ? "bg-muted font-medium" : "hover:bg-muted/50"
          }`}
        >
          All / Root
        </button>
        {rootFolders.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setFolderId(f.id);
              setPage(1);
            }}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
              folderId === f.id ? "bg-muted font-medium" : "hover:bg-muted/50"
            }`}
          >
            {f.name}
            <span className="ml-1 text-xs text-muted-foreground">
              ({f._count.assets})
            </span>
          </button>
        ))}
        {canWrite ? (
          <Button type="button" variant="outline" size="sm" onClick={createFolder}>
            New folder
          </Button>
        ) : null}
      </aside>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search by name"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
          <select
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="pdf">PDF</option>
            <option value="zip">ZIP</option>
          </select>
          {canWrite ? (
            <label className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80">
              Upload
              <input
                type="file"
                className="hidden"
                multiple
                accept=".png,.jpg,.jpeg,.webp,.svg,.mp4,.pdf,.zip"
                onChange={(e) => {
                  void onUpload(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : assets.length === 0 ? (
          <p className="rounded-xl border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            No assets yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setPreview(asset)}
                className="rounded-xl border border-border bg-card p-3 text-left shadow-sm hover:bg-muted/40"
              >
                <div className="mb-2 flex h-28 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {asset.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/assets/${asset.id}/file?thumb=1`}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {asset.mimeType}
                    </span>
                  )}
                </div>
                <div className="truncate text-sm font-medium">
                  {asset.originalName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatBytes(asset.sizeBytes)} · {asset.uploadedBy.name}
                </div>
              </button>
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{preview.originalName}</h2>
                <p className="text-xs text-muted-foreground">
                  {preview.mimeType} · {formatBytes(preview.sizeBytes)}
                </p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setPreview(null)}>
                Close
              </Button>
            </div>

            <div className="mb-4 flex min-h-[200px] items-center justify-center rounded-lg bg-muted p-4">
              {preview.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/assets/${preview.id}/file`}
                  alt={preview.originalName}
                  className="max-h-[50vh] max-w-full object-contain"
                />
              ) : preview.mimeType.startsWith("video/") ? (
                <video
                  src={`/api/assets/${preview.id}/file`}
                  controls
                  className="max-h-[50vh] max-w-full"
                />
              ) : preview.mimeType === "application/pdf" ? (
                <iframe
                  title={preview.originalName}
                  src={`/api/assets/${preview.id}/file`}
                  className="h-[50vh] w-full rounded-md bg-white"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Preview not available. Download to open.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <a href={`/api/assets/${preview.id}/file`} target="_blank" rel="noreferrer">
                <Button type="button" variant="outline">
                  Open
                </Button>
              </a>
              <a href={`/api/assets/${preview.id}/file?download=1`}>
                <Button type="button" variant="outline">
                  Download
                </Button>
              </a>
              {canWrite ? (
                <>
                  <Button type="button" variant="outline" onClick={() => renameAsset(preview)}>
                    Rename
                  </Button>
                  <label className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-border px-2.5 text-sm hover:bg-muted">
                    Replace
                    <input
                      type="file"
                      className="hidden"
                      accept=".png,.jpg,.jpeg,.webp,.svg,.mp4,.pdf,.zip"
                      onChange={(e) => {
                        void replaceAsset(preview, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => deleteAsset(preview)}
                  >
                    Delete
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

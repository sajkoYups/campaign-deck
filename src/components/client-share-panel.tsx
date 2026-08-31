"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Invitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

type AccessRow = {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
};

export function ClientSharePanel({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [access, setAccess] = useState<AccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  async function load() {
    const [iRes, aRes] = await Promise.all([
      fetch(`/api/clients/${clientId}/invite`),
      fetch(`/api/clients/${clientId}/access`),
    ]);
    const iJson = await iRes.json();
    const aJson = await aRes.json();
    if (iRes.ok) setInvites(iJson.data ?? []);
    if (aRes.ok) setAccess(aJson.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function onInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviting(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/clients/${clientId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });
    const json = await res.json();
    setInviting(false);
    if (!res.ok) {
      toast.error(json.error?.message || "Failed to invite");
      return;
    }
    toast.success("Invitation created — check server console for the link");
    (e.target as HTMLFormElement).reset();
    void load();
  }

  async function resend(invitationId: string) {
    const res = await fetch(`/api/clients/${clientId}/invite/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error?.message || "Failed to resend");
      return;
    }
    toast.success("Invitation resent — check server console for the link");
    void load();
  }

  async function cancelInvite(id: string) {
    const res = await fetch(
      `/api/clients/${clientId}/invite/resend?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error?.message || "Failed to cancel");
      return;
    }
    toast.success("Invitation cancelled");
    void load();
  }

  async function revoke(userId: string) {
    const res = await fetch(`/api/clients/${clientId}/access`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error?.message || "Failed to revoke");
      return;
    }
    toast.success("Access revoked");
    void load();
    router.refresh();
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading share settings…</p>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-medium">Share with client</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Invite external stakeholders with view-only access to this client,
          its campaigns, links, and assets.
        </p>
      </div>

      <form onSubmit={onInvite} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1 space-y-2">
          <Label htmlFor="client-share-email">Email</Label>
          <Input
            id="client-share-email"
            name="email"
            type="email"
            required
            placeholder="client@example.com"
          />
        </div>
        <Button type="submit" disabled={inviting}>
          {inviting ? "Sending…" : "Send invite"}
        </Button>
      </form>

      {access.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">
            People with access
          </h4>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {access.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {row.user.name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {row.user.email} · {row.role}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => revoke(row.user.id)}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {invites.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">
            Pending invitations
          </h4>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{inv.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => resend(inv.id)}
                  >
                    Resend
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelInvite(inv.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

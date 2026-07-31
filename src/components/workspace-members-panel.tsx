"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assignableRoles } from "@/lib/permissions";
import type { WorkspaceRole } from "@/generated/prisma/client";

type Member = {
  id: string;
  role: WorkspaceRole;
  user: { id: string; name: string; email: string };
};

type Invitation = {
  id: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
};

export function WorkspaceMembersPanel({
  currentRole,
  currentUserId,
}: {
  currentRole: WorkspaceRole;
  currentUserId: string;
}) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const canInvite =
    currentRole === "OWNER" ||
    currentRole === "ADMIN" ||
    currentRole === "MANAGER";
  const roles = assignableRoles(currentRole);

  async function load() {
    const [mRes, iRes] = await Promise.all([
      fetch("/api/workspace/members"),
      canInvite ? fetch("/api/workspace/invite") : Promise.resolve(null),
    ]);
    const mJson = await mRes.json();
    if (mRes.ok) setMembers(mJson.data ?? []);
    if (iRes) {
      const iJson = await iRes.json();
      if (iRes.ok) setInvites(iJson.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviting(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/workspace/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        role: form.get("role"),
      }),
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

  async function changeRole(memberId: string, role: string) {
    const res = await fetch("/api/workspace/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error?.message || "Failed to update role");
      return;
    }
    toast.success("Role updated");
    void load();
    router.refresh();
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member?")) return;
    const res = await fetch("/api/workspace/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error?.message || "Failed to remove");
      return;
    }
    toast.success("Member removed");
    void load();
  }

  async function resend(invitationId: string) {
    const res = await fetch("/api/workspace/invite/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error?.message || "Failed to resend");
      return;
    }
    toast.success("Invitation resent — check server console");
    void load();
  }

  async function cancelInvite(id: string) {
    const res = await fetch(`/api/workspace/invite/resend?id=${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to cancel");
      return;
    }
    toast.success("Invitation cancelled");
    void load();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading members…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{m.user.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {m.user.email}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.role === "OWNER" || m.user.id === currentUserId ? (
                  <span className="text-xs text-muted-foreground">{m.role}</span>
                ) : canInvite && roles.length > 0 ? (
                  <select
                    className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                    value={m.role}
                    onChange={(e) => changeRole(m.id, e.target.value)}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                    {!roles.includes(m.role) ? (
                      <option value={m.role}>{m.role}</option>
                    ) : null}
                  </select>
                ) : (
                  <span className="text-xs text-muted-foreground">{m.role}</span>
                )}
                {m.role !== "OWNER" &&
                m.user.id !== currentUserId &&
                (currentRole === "OWNER" || currentRole === "ADMIN") ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMember(m.id)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {canInvite ? (
        <form
          onSubmit={onInvite}
          className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div>
            <h3 className="text-sm font-medium">Invite member</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              The accept link is printed in the server console (no SMTP yet).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              name="role"
              defaultValue={roles[roles.length - 1] ?? "VIEWER"}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={inviting}>
            {inviting ? "Sending…" : "Send invite"}
          </Button>
        </form>
      ) : null}

      {canInvite && invites.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Pending invitations
          </h3>
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <ul className="divide-y divide-border">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium">{inv.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {inv.role} · expires{" "}
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
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
        </div>
      ) : null}
    </div>
  );
}

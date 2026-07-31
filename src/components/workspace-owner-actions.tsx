"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type MemberOption = {
  userId: string;
  name: string;
  email: string;
  role: string;
};

export function WorkspaceOwnerActions({
  members,
  isOwner,
}: {
  members: MemberOption[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const candidates = members.filter((m) => m.role !== "OWNER");

  if (!isOwner) return null;

  async function transfer(userId: string) {
    if (!confirm("Transfer ownership to this member? You will become Admin.")) {
      return;
    }
    setLoading(true);
    const res = await fetch("/api/workspace/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newOwnerUserId: userId }),
    });
    setLoading(false);
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error?.message || "Transfer failed");
      return;
    }
    toast.success("Ownership transferred");
    router.refresh();
  }

  async function deleteWorkspace() {
    const typed = prompt('Type "DELETE" to permanently delete this workspace:');
    if (typed !== "DELETE") return;
    setLoading(true);
    const res = await fetch("/api/workspace", { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error?.message || "Delete failed");
      return;
    }
    toast.success("Workspace deleted");
    window.location.href = "/no-workspace";
  }

  return (
    <div className="max-w-lg space-y-4 rounded-xl border border-red-200 bg-red-50/50 p-6 shadow-sm dark:border-red-900/50 dark:bg-red-950/20">
      <div>
        <h2 className="text-sm font-medium text-red-700 dark:text-red-400">
          Owner controls
        </h2>
        <p className="mt-1 text-xs text-red-700/80 dark:text-red-400/80">
          Transfer ownership or permanently delete this workspace.
        </p>
      </div>

      {candidates.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Transfer ownership to</p>
          <ul className="space-y-2">
            {candidates.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-2">
                <span className="truncate text-sm">
                  {m.name}{" "}
                  <span className="text-muted-foreground">({m.email})</span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => transfer(m.userId)}
                >
                  Transfer
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Invite another member before transferring ownership.
        </p>
      )}

      <Button
        type="button"
        variant="destructive"
        disabled={loading}
        onClick={deleteWorkspace}
      >
        Delete workspace
      </Button>
    </div>
  );
}

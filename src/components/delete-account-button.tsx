"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function DeleteAccountButton() {
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    const confirmed = confirm(
      "Delete your account permanently?\n\nThis will remove your workspace, clients, campaigns, links, and analytics. This cannot be undone.",
    );
    if (!confirmed) return;

    const typed = prompt('Type "DELETE" to confirm account deletion:');
    if (typed !== "DELETE") {
      if (typed !== null) toast.error('Confirmation text did not match "DELETE"');
      return;
    }

    setLoading(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setLoading(false);
      toast.error(json?.error?.message || "Failed to delete account");
      return;
    }

    await authClient.signOut();
    window.location.href = "/register";
  }

  return (
    <div className="max-w-lg rounded-xl border border-red-200 bg-red-50/50 p-6 shadow-sm dark:border-red-900/50 dark:bg-red-950/20">
      <h2 className="text-sm font-medium text-red-700 dark:text-red-400">
        Delete account
      </h2>
      <p className="mt-1 text-xs text-red-700/80 dark:text-red-400/80">
        Permanently delete your user account and workspace. All clients,
        campaigns, links, and analytics will be removed. This cannot be undone.
      </p>
      <Button
        className="mt-4"
        variant="destructive"
        onClick={onDelete}
        disabled={loading}
      >
        {loading ? "Deleting…" : "Delete account"}
      </Button>
    </div>
  );
}

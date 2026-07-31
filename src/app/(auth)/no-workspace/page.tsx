"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { authClient } from "@/lib/auth-client";

export default function NoWorkspacePage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function createWorkspace() {
    setCreating(true);
    const res = await fetch("/api/workspace/bootstrap", { method: "POST" });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) {
      toast.error(json.error?.message || "Could not create workspace");
      return;
    }
    toast.success("Workspace created");
    router.push("/onboarding");
    router.refresh();
  }

  async function signOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            No workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re signed in but not a member of any workspace. Create a
            new one, or delete your account.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-sm">
          <Button
            className="w-full"
            onClick={createWorkspace}
            disabled={creating}
          >
            {creating ? "Creating…" : "Create a new workspace"}
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={signOut}
          >
            Sign out
          </Button>
        </div>

        <DeleteAccountButton />
      </div>
    </div>
  );
}

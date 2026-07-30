"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ReplayOnboardingButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function replay() {
    setLoading(true);
    const res = await fetch("/api/workspace/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "replay" }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Could not restart onboarding");
      return;
    }
    router.push("/onboarding");
  }

  return (
    <div className="max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-sm font-medium">Product tour</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Replay the guided walkthrough that creates a client, campaign, and link
        while explaining how CampaignDeck works.
      </p>
      <Button
        className="mt-4"
        variant="outline"
        onClick={replay}
        disabled={loading}
      >
        {loading ? "Starting…" : "Replay product tour"}
      </Button>
    </div>
  );
}

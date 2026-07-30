"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function UtmRulesForm() {
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState("");
  const [mediums, setMediums] = useState("");

  useEffect(() => {
    fetch("/api/settings/utm")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setSources(json.data.allowedSources.join("\n"));
          setMediums(json.data.allowedMediums.join("\n"));
        }
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/settings/utm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allowedSources: sources
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        allowedMediums: mediums
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(json.error?.message || "Failed to save UTM rules");
      return;
    }

    setSources(json.data.allowedSources.join("\n"));
    setMediums(json.data.allowedMediums.join("\n"));
    toast.success("UTM rules updated");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div>
        <h2 className="text-sm font-medium">UTM naming rules</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Values are normalized to lowercase with hyphens. Sources and mediums
          must match the allowlists below.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sources">Allowed sources (one per line)</Label>
        <Textarea
          id="sources"
          rows={6}
          value={sources}
          onChange={(e) => setSources(e.target.value)}
          placeholder={"facebook\ninstagram\ngoogle\nnewsletter"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mediums">Allowed mediums (one per line)</Label>
        <Textarea
          id="mediums"
          rows={6}
          value={mediums}
          onChange={(e) => setMediums(e.target.value)}
          placeholder={"email\npaid-social\norganic-social\ncpc"}
        />
      </div>
      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        Naming convention: lowercase only, spaces become hyphens, whitespace
        trimmed. Invalid values are rejected when creating links.
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save UTM rules"}
      </Button>
    </form>
  );
}

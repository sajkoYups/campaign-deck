"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ClientOption = { id: string; name: string };

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((json) => {
        setClients(
          (json.data ?? []).map((c: ClientOption) => ({
            id: c.id,
            name: c.name,
          })),
        );
      })
      .catch(() => toast.error("Failed to load clients"))
      .finally(() => setLoadingClients(false));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const start = form.get("startDate") as string;
    const end = form.get("endDate") as string;

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: form.get("clientId"),
        name: form.get("name"),
        description: form.get("description") || undefined,
        status: form.get("status") || "DRAFT",
        startDate: start ? new Date(start).toISOString() : undefined,
        endDate: end ? new Date(end).toISOString() : undefined,
      }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(json.error?.message || "Failed to create campaign");
      return;
    }

    toast.success("Campaign created");
    router.push(`/campaigns/${json.data.id}`);
    router.refresh();
  }

  if (loadingClients) {
    return (
      <p className="text-sm text-muted-foreground">Loading…</p>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <Link
            href="/campaigns"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Campaigns
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            New campaign
          </h1>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            You need a client before you can create a campaign.
          </p>
          <Link href="/clients/new" className="mt-4 inline-block">
            <Button>Create a client</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/campaigns"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Campaigns
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          New campaign
        </h1>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="space-y-2">
          <Label htmlFor="clientId">Client</Label>
          <select
            id="clientId"
            name="clientId"
            required
            defaultValue={clients[0]?.id}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="Black Friday" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue="DRAFT"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" name="startDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End date</Label>
            <Input id="endDate" name="endDate" type="date" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Link href="/campaigns">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create campaign"}
          </Button>
        </div>
      </form>
    </div>
  );
}

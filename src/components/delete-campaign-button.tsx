"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteCampaignButton({
  campaignId,
  clientId,
}: {
  campaignId: string;
  clientId: string;
}) {
  const router = useRouter();

  async function onDelete() {
    if (!confirm("Delete this campaign and all links?")) return;
    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to delete campaign");
      return;
    }
    toast.success("Campaign deleted");
    router.push(`/clients/${clientId}`);
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={onDelete}>
      Delete
    </Button>
  );
}

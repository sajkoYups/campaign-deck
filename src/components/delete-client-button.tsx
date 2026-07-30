"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const router = useRouter();

  async function onDelete() {
    if (!confirm("Delete this client and all campaigns/links?")) return;
    const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete client");
      return;
    }
    toast.success("Client deleted");
    router.push("/clients");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={onDelete}>
      Delete
    </Button>
  );
}

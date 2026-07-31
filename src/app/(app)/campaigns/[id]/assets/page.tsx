import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { CampaignNav } from "@/components/analytics/shared";
import { CampaignAssetsPanel } from "@/components/campaign-assets-panel";

type Params = { params: Promise<{ id: string }> };

export default async function CampaignAssetsPage({ params }: Params) {
  const { workspace, role } = await requireWorkspace();
  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, client: { workspaceId: workspace.id } },
    include: { client: { select: { id: true, name: true } } },
  });

  if (!campaign) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/clients/${campaign.client.id}`}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← {campaign.client.name}
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {campaign.name}
          </h1>
          <Badge variant="secondary">{campaign.status}</Badge>
        </div>
      </div>

      <CampaignNav campaignId={campaign.id} active="assets" />

      <CampaignAssetsPanel campaignId={campaign.id} role={role} />
    </div>
  );
}

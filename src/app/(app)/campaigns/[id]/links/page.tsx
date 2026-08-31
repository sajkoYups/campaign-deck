import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { CreateLinkDialog } from "@/components/create-link-dialog";
import { LinksTable } from "@/components/links-table";
import { CampaignNav } from "@/components/analytics/shared";

type Params = { params: Promise<{ id: string }> };

export default async function CampaignLinksPage({ params }: Params) {
  const { workspace, accessibleClientIds, role } = await requireWorkspace();
  const guest = role === "GUEST";
  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      client: {
        workspaceId: workspace.id,
        ...(accessibleClientIds ? { id: { in: accessibleClientIds } } : {}),
      },
    },
    include: {
      client: { select: { id: true, name: true } },
      links: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!campaign) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
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
        {!guest ? (
          <CreateLinkDialog
            campaignId={campaign.id}
            campaignName={campaign.name}
          />
        ) : null}
      </div>

      <CampaignNav campaignId={campaign.id} active="links" />

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <LinksTable links={campaign.links} readOnly={guest} />
      </div>
    </div>
  );
}

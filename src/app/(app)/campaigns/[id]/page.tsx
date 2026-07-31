import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { CreateLinkDialog } from "@/components/create-link-dialog";
import { EditCampaignDialog } from "@/components/edit-campaign-dialog";
import { DeleteCampaignButton } from "@/components/delete-campaign-button";
import { CampaignNav, StatCard } from "@/components/analytics/shared";
import { sumDailyStats } from "@/lib/analytics/queries";

type Params = { params: Promise<{ id: string }> };

export default async function CampaignOverviewPage({ params }: Params) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, client: { workspaceId: workspace.id } },
    include: {
      client: { select: { id: true, name: true } },
      links: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          shortUrl: true,
          createdAt: true,
        },
      },
      assets: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          createdAt: true,
        },
      },
      _count: { select: { links: true, assets: true } },
    },
  });

  if (!campaign) notFound();

  const allLinkIds = await prisma.link.findMany({
    where: { campaignId: campaign.id },
    select: { id: true },
  });

  const totals = await sumDailyStats(
    allLinkIds.map((l) => l.id),
    { from: new Date(0), to: new Date() },
  );

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
          {campaign.description ? (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {campaign.description}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <EditCampaignDialog
            campaign={{
              id: campaign.id,
              name: campaign.name,
              description: campaign.description,
              status: campaign.status,
              startDate: campaign.startDate?.toISOString() ?? null,
              endDate: campaign.endDate?.toISOString() ?? null,
            }}
          />
          <CreateLinkDialog
            campaignId={campaign.id}
            campaignName={campaign.name}
          />
          <DeleteCampaignButton
            campaignId={campaign.id}
            clientId={campaign.client.id}
          />
        </div>
      </div>

      <CampaignNav campaignId={campaign.id} active="overview" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Links" value={campaign._count.links} />
        <StatCard label="Assets" value={campaign._count.assets} />
        <StatCard label="Total clicks" value={totals.totalClicks} />
        <StatCard label="Unique visitors" value={totals.uniqueClicks} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Latest links
            </h2>
            <Link
              href={`/campaigns/${campaign.id}/links`}
              className="text-xs underline underline-offset-4"
            >
              View all
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card shadow-sm">
            {campaign.links.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No links yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {campaign.links.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={`/links/${link.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
                    >
                      <span className="truncate text-sm font-medium">
                        {link.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {link.shortUrl}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Recent assets
            </h2>
            <Link
              href={`/campaigns/${campaign.id}/assets`}
              className="text-xs underline underline-offset-4"
            >
              View all
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card shadow-sm">
            {campaign.assets.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No assets yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {campaign.assets.map((asset) => (
                  <li
                    key={asset.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="truncate text-sm font-medium">
                      {asset.originalName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {asset.mimeType}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

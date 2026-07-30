import Link from "next/link";
import { Suspense } from "react";
import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import {
  resolveDateRange,
  sumDailyStats,
  topCampaignsByClicks,
  topLinksByClicks,
} from "@/lib/analytics/queries";
import { RangeFilter, StatCard } from "@/components/analytics/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type SearchParams = Promise<{ range?: string; from?: string; to?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { workspace } = await requireWorkspace();
  const params = await searchParams;
  const rangeKey = params.range ?? "30d";
  const range = resolveDateRange(rangeKey, params.from, params.to);
  const today = resolveDateRange("today");

  const [clientCount, campaignCount, links, recentCampaigns] = await Promise.all([
    prisma.client.count({ where: { workspaceId: workspace.id } }),
    prisma.campaign.count({ where: { client: { workspaceId: workspace.id } } }),
    prisma.link.findMany({
      where: { campaign: { client: { workspaceId: workspace.id } } },
      select: { id: true },
    }),
    prisma.campaign.findMany({
      where: { client: { workspaceId: workspace.id } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { client: { select: { name: true } } },
    }),
  ]);

  const linkIds = links.map((l) => l.id);
  const [allTime, todayStats, rangeStats, topCampaigns, topLinks] =
    await Promise.all([
      sumDailyStats(linkIds, { from: new Date(0), to: new Date() }),
      sumDailyStats(linkIds, today),
      sumDailyStats(linkIds, range),
      topCampaignsByClicks(workspace.id, range, 5),
      topLinksByClicks(workspace.id, range, 5),
    ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Campaign performance at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/campaigns/new">
            <Button>New campaign</Button>
          </Link>
          <Suspense fallback={null}>
            <RangeFilter />
          </Suspense>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Clients" value={clientCount} />
        <StatCard label="Campaigns" value={campaignCount} />
        <StatCard label="Links" value={linkIds.length} />
        <StatCard label="Total clicks" value={allTime.totalClicks} />
        <StatCard label="Today's clicks" value={todayStats.totalClicks} />
        <StatCard label="Clicks in range" value={rangeStats.totalClicks} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recent campaigns
          </h2>
          <div className="rounded-xl border border-border bg-card shadow-sm">
            {recentCampaigns.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No campaigns yet.{" "}
                <Link
                  href="/campaigns/new"
                  className="underline underline-offset-4"
                >
                  Create a campaign
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentCampaigns.map((campaign) => (
                  <li key={campaign.id}>
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {campaign.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {campaign.client.name}
                        </div>
                      </div>
                      <Badge variant="secondary">{campaign.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Top campaigns
          </h2>
          <div className="rounded-xl border border-border bg-card shadow-sm">
            {topCampaigns.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No clicks yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {topCampaigns.map((campaign) => (
                  <li key={campaign.id}>
                    <Link
                      href={`/campaigns/${campaign.id}/analytics`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {campaign.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {campaign.clientName}
                        </div>
                      </div>
                      <span className="text-sm tabular-nums">
                        {campaign.totalClicks}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Top links
          </h2>
          <div className="rounded-xl border border-border bg-card shadow-sm">
            {topLinks.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No clicks yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {topLinks.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={`/links/${link.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {link.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {link.campaign.name}
                        </div>
                      </div>
                      <span className="text-sm tabular-nums">
                        {link.totalClicks}
                      </span>
                    </Link>
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

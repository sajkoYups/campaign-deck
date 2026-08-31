import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BreakdownList,
  CampaignNav,
  RangeFilter,
  StatCard,
} from "@/components/analytics/shared";
import { ClicksChart } from "@/components/analytics/clicks-chart";
import {
  breakdown,
  clicksOverTime,
  resolveDateRange,
  sumDailyStats,
} from "@/lib/analytics/queries";

type Params = { params: Promise<{ id: string }> };
type SearchParams = Promise<{ range?: string; from?: string; to?: string }>;

export default async function CampaignAnalyticsPage({
  params,
  searchParams,
}: {
  params: Params["params"];
  searchParams: SearchParams;
}) {
  const { workspace, accessibleClientIds } = await requireWorkspace();
  const { id } = await params;
  const query = await searchParams;
  const rangeKey = query.range ?? "30d";
  const range = resolveDateRange(rangeKey, query.from, query.to);

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
      links: {
        select: {
          id: true,
          name: true,
          slug: true,
          shortUrl: true,
          utmSource: true,
          utmMedium: true,
          qrPlacement: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!campaign) notFound();

  const linkIds = campaign.links.map((l) => l.id);
  const [totals, series, countries, referrers, devices, linkStats] =
    await Promise.all([
      sumDailyStats(linkIds, range),
      clicksOverTime(linkIds, range),
      breakdown(linkIds, range, "country"),
      breakdown(linkIds, range, "referrer"),
      breakdown(linkIds, range, "device"),
      Promise.all(
        campaign.links.map(async (link) => ({
          ...link,
          ...(await sumDailyStats([link.id], range)),
        })),
      ),
    ]);

  const topLink = [...linkStats].sort((a, b) => b.totalClicks - a.totalClicks)[0];
  const exportHref = `/api/export/campaign/${campaign.id}?range=${encodeURIComponent(rangeKey)}${
    query.from ? `&from=${encodeURIComponent(query.from)}` : ""
  }${query.to ? `&to=${encodeURIComponent(query.to)}` : ""}`;

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
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <RangeFilter />
          </Suspense>
          <a href={exportHref}>
            <Button variant="outline">Export CSV</Button>
          </a>
        </div>
      </div>

      <CampaignNav campaignId={campaign.id} active="analytics" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total clicks" value={totals.totalClicks} />
        <StatCard label="Unique visitors" value={totals.uniqueClicks} />
        <StatCard
          label="Top link"
          value={topLink ? topLink.name : "—"}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Clicks over time
        </h2>
        <ClicksChart data={series} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownList title="Countries" items={countries} />
        <BreakdownList title="Referrers" items={referrers} />
        <BreakdownList title="Devices" items={devices} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Links</h2>
        <div className="rounded-xl border border-border bg-card shadow-sm">
          {linkStats.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No links yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>UTM</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Uniques</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkStats.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <Link
                        href={`/links/${link.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {link.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[link.utmSource, link.utmMedium]
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {link.qrPlacement || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {link.totalClicks}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {link.uniqueClicks}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}

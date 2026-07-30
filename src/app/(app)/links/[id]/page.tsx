import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { LinkEditForm } from "@/components/link-edit-form";
import {
  BreakdownList,
  RangeFilter,
  StatCard,
} from "@/components/analytics/shared";
import { ClicksChart } from "@/components/analytics/clicks-chart";
import {
  breakdown,
  clicksOverTime,
  lastClickedAt,
  resolveDateRange,
  sumDailyStats,
} from "@/lib/analytics/queries";

type Params = { params: Promise<{ id: string }> };
type SearchParams = Promise<{ range?: string; from?: string; to?: string }>;

export default async function LinkDetailPage({
  params,
  searchParams,
}: {
  params: Params["params"];
  searchParams: SearchParams;
}) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;
  const query = await searchParams;
  const rangeKey = query.range ?? "30d";
  const range = resolveDateRange(rangeKey, query.from, query.to);

  const link = await prisma.link.findFirst({
    where: { id, campaign: { client: { workspaceId: workspace.id } } },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          client: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!link) notFound();

  const linkIds = [link.id];
  const today = resolveDateRange("today");
  const last7 = resolveDateRange("7d");
  const last30 = resolveDateRange("30d");
  const allTime = { from: new Date(0), to: new Date() };

  const [
    total,
    todayStats,
    weekStats,
    monthStats,
    series,
    lastClick,
    countries,
    referrers,
    devices,
    browsers,
    operatingSystems,
  ] = await Promise.all([
    sumDailyStats(linkIds, allTime),
    sumDailyStats(linkIds, today),
    sumDailyStats(linkIds, last7),
    sumDailyStats(linkIds, last30),
    clicksOverTime(linkIds, range),
    lastClickedAt(linkIds),
    breakdown(linkIds, range, "country"),
    breakdown(linkIds, range, "referrer"),
    breakdown(linkIds, range, "device"),
    breakdown(linkIds, range, "browser"),
    breakdown(linkIds, range, "operatingSystem"),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/campaigns/${link.campaign.id}/links`}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← {link.campaign.name}
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            {link.name}
          </h1>
        </div>
        <Suspense fallback={null}>
          <RangeFilter />
        </Suspense>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total clicks" value={total.totalClicks} />
        <StatCard label="Unique visitors" value={total.uniqueClicks} />
        <StatCard label="Clicks today" value={todayStats.totalClicks} />
        <StatCard label="Last 7 days" value={weekStats.totalClicks} />
        <StatCard label="Last 30 days" value={monthStats.totalClicks} />
        <StatCard
          label="Last clicked"
          value={
            lastClick ? lastClick.toLocaleString() : "Never"
          }
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Clicks over time
        </h2>
        <ClicksChart data={series} />
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <BreakdownList title="Countries" items={countries} />
        <BreakdownList title="Top referrers" items={referrers} />
        <BreakdownList title="Devices" items={devices} />
        <BreakdownList title="Browsers" items={browsers} />
        <BreakdownList title="Operating systems" items={operatingSystems} />
        {link.qrPlacement && (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-medium">QR placement</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              {link.qrPlacement}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {total.totalClicks}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                scans
              </span>
            </p>
          </div>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Edit link</h2>
        <LinkEditForm link={link} />
      </section>
    </div>
  );
}

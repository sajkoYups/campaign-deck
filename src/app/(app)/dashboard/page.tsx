import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();

  const [
    clientCount,
    campaignCount,
    linkCount,
    recentCampaigns,
    recentLinks,
  ] = await Promise.all([
    prisma.client.count({ where: { workspaceId: workspace.id } }),
    prisma.campaign.count({
      where: { client: { workspaceId: workspace.id } },
    }),
    prisma.link.count({
      where: { campaign: { client: { workspaceId: workspace.id } } },
    }),
    prisma.campaign.findMany({
      where: { client: { workspaceId: workspace.id } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { client: { select: { name: true } } },
    }),
    prisma.link.findMany({
      where: { campaign: { client: { workspaceId: workspace.id } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        campaign: { select: { name: true } },
      },
    }),
  ]);

  const stats = [
    { label: "Clients", value: clientCount },
    { label: "Campaigns", value: campaignCount },
    { label: "Links", value: linkCount },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your campaign links at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recent campaigns
          </h2>
          <div className="rounded-xl border border-border bg-card shadow-sm">
            {recentCampaigns.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No campaigns yet.{" "}
                <Link href="/clients" className="underline underline-offset-4">
                  Create a client
                </Link>{" "}
                to get started.
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
            Recent links
          </h2>
          <div className="rounded-xl border border-border bg-card shadow-sm">
            {recentLinks.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No links yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentLinks.map((link) => (
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
                          {link.slug}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDistanceToNow(link.createdAt, { addSuffix: true })}
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

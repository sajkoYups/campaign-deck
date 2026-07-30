import Link from "next/link";
import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CampaignsPage() {
  const { workspace } = await requireWorkspace();
  const campaigns = await prisma.campaign.findMany({
    where: { client: { workspaceId: workspace.id } },
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      _count: { select: { links: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All campaigns across your clients.
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>New campaign</Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        {campaigns.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            No campaigns yet.{" "}
            <Link
              href="/campaigns/new"
              className="underline underline-offset-4"
            >
              Create your first campaign
            </Link>
            .
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Links</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {campaign.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/clients/${campaign.client.id}`}
                      className="text-muted-foreground underline-offset-4 hover:underline"
                    >
                      {campaign.client.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{campaign.status}</Badge>
                  </TableCell>
                  <TableCell>{campaign._count.links}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {campaign.updatedAt.toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

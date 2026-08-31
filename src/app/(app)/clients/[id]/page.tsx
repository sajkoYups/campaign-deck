import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { canAccessClient } from "@/lib/client-access";
import { can, isGuest } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateCampaignDialog } from "@/components/create-campaign-dialog";
import { DeleteClientButton } from "@/components/delete-client-button";
import { ClientSharePanel } from "@/components/client-share-panel";

type Params = { params: Promise<{ id: string }> };

export default async function ClientDetailPage({ params }: Params) {
  const { workspace, accessibleClientIds, role } = await requireWorkspace();
  const { id } = await params;
  const guest = isGuest(role);
  const canShare = can(role, "members.invite");

  if (!canAccessClient(id, accessibleClientIds)) notFound();

  const client = await prisma.client.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      campaigns: {
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { links: true } } },
      },
    },
  });

  if (!client) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/clients"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Clients
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            {client.name}
          </h1>
          {client.website && (
            <a
              href={client.website}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {client.website}
            </a>
          )}
        </div>
        {!guest ? (
          <div className="flex gap-2">
            <CreateCampaignDialog clientId={client.id} />
            <DeleteClientButton clientId={client.id} />
          </div>
        ) : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Client information
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="mt-1 text-sm">{client.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Website</dt>
              <dd className="mt-1 text-sm">{client.website || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Notes</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">
                {client.notes || "—"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {canShare ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Sharing</h2>
          <ClientSharePanel clientId={client.id} />
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Campaigns</h2>
        <div className="rounded-xl border border-border bg-card shadow-sm">
          {client.campaigns.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No campaigns yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Links</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.campaigns.map((campaign) => (
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
      </section>
    </div>
  );
}

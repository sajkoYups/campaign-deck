import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { CreateLinkDialog } from "@/components/create-link-dialog";
import { LinksTable } from "@/components/links-table";
import { DeleteCampaignButton } from "@/components/delete-campaign-button";

type Params = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: Params) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, client: { workspaceId: workspace.id } },
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
          {campaign.description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {campaign.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <CreateLinkDialog campaignId={campaign.id} />
          <DeleteCampaignButton
            campaignId={campaign.id}
            clientId={campaign.client.id}
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Campaign details
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Client</dt>
              <dd className="mt-1 text-sm">{campaign.client.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Start</dt>
              <dd className="mt-1 text-sm">
                {campaign.startDate
                  ? campaign.startDate.toLocaleDateString()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">End</dt>
              <dd className="mt-1 text-sm">
                {campaign.endDate ? campaign.endDate.toLocaleDateString() : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Links</h2>
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <LinksTable links={campaign.links} />
        </div>
      </section>
    </div>
  );
}

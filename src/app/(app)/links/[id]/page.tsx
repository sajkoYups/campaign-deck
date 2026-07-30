import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { LinkEditForm } from "@/components/link-edit-form";

type Params = { params: Promise<{ id: string }> };

export default async function LinkDetailPage({ params }: Params) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;

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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/campaigns/${link.campaign.id}`}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← {link.campaign.name}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {link.name}
        </h1>
      </div>
      <LinkEditForm link={link} />
    </div>
  );
}

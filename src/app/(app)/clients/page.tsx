import Link from "next/link";
import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { clientWhereFilter } from "@/lib/client-access";
import { isGuest } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ClientsPage() {
  const { workspace, accessibleClientIds, role } = await requireWorkspace();
  const guest = isGuest(role);
  const clients = await prisma.client.findMany({
    where: clientWhereFilter(workspace.id, accessibleClientIds),
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { campaigns: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {guest
              ? "Clients shared with you."
              : "Organize campaigns by client."}
          </p>
        </div>
        {!guest ? (
          <Link href="/clients/new">
            <Button>New client</Button>
          </Link>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        {clients.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            {guest ? (
              "No clients have been shared with you yet."
            ) : (
              <>
                No clients yet.{" "}
                <Link href="/clients/new" className="underline underline-offset-4">
                  Create your first client
                </Link>
                .
              </>
            )}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Campaigns</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.website || "—"}
                  </TableCell>
                  <TableCell>{client._count.campaigns}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {client.updatedAt.toLocaleDateString()}
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

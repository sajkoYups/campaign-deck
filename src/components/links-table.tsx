"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Download, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LinkRow = {
  id: string;
  name: string;
  destinationUrl: string;
  shortUrl: string;
  slug: string;
  createdAt: string | Date;
};

export function LinksTable({
  links,
  readOnly = false,
}: {
  links: LinkRow[];
  readOnly?: boolean;
}) {
  const router = useRouter();

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  function downloadQr(id: string, slug: string) {
    const a = document.createElement("a");
    a.href = `/api/links/${id}/qr?download=1`;
    a.download = `${slug.replace(/\//g, "-")}-qr.png`;
    a.click();
  }

  async function deleteLink(id: string) {
    if (!confirm("Delete this link?")) return;
    const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete link");
      return;
    }
    toast.success("Link deleted");
    router.refresh();
  }

  if (links.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        No links yet. Create your first campaign link.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Destination URL</TableHead>
          <TableHead>Short URL</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>QR</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {links.map((link) => (
          <TableRow key={link.id}>
            <TableCell>
              <Link
                href={`/links/${link.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {link.name}
              </Link>
            </TableCell>
            <TableCell className="max-w-[180px] truncate text-muted-foreground">
              {link.destinationUrl}
            </TableCell>
            <TableCell className="max-w-[180px] truncate font-mono text-xs">
              {link.shortUrl}
            </TableCell>
            <TableCell className="font-mono text-xs">{link.slug}</TableCell>
            <TableCell>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/links/${link.id}/qr`}
                alt={`QR for ${link.name}`}
                className="size-8 rounded border border-border"
              />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(link.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label="Actions" />
                  }
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!readOnly ? (
                    <DropdownMenuItem
                      onClick={() => router.push(`/links/${link.id}`)}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => router.push(`/links/${link.id}`)}
                    >
                      <Pencil className="size-4" />
                      View
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => copyLink(link.shortUrl)}>
                    <Copy className="size-4" />
                    Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => downloadQr(link.id, link.slug)}
                  >
                    <Download className="size-4" />
                    Download QR
                  </DropdownMenuItem>
                  {!readOnly ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => deleteLink(link.id)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

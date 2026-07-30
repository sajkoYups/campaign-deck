import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ slug: string[] }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { slug: parts } = await params;
  const slug = parts.map(decodeURIComponent).join("/");

  if (!slug) {
    return new NextResponse("Not found", { status: 404 });
  }

  const link = await prisma.link.findUnique({
    where: { slug },
    select: { destinationUrl: true },
  });

  if (!link) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.redirect(link.destinationUrl, 302);
}

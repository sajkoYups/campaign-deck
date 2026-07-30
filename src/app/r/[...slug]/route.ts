import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { recordClickEvent } from "@/lib/analytics/record-click";

type Params = { params: Promise<{ slug: string[] }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { slug: parts } = await params;
  const slug = parts.map(decodeURIComponent).join("/");

  if (!slug) {
    return new NextResponse("Not found", { status: 404 });
  }

  const link = await prisma.link.findUnique({
    where: { slug },
    select: { id: true, destinationUrl: true },
  });

  if (!link) {
    return new NextResponse("Not found", { status: 404 });
  }

  const headers = new Headers(request.headers);

  after(async () => {
    try {
      await recordClickEvent({ linkId: link.id, headers });
    } catch (error) {
      console.error("Failed to record click:", error);
    }
  });

  return NextResponse.redirect(link.destinationUrl, 302);
}

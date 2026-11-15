import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultFeeds } from "@/lib/news/rssService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDefaultFeeds();
    const feeds = await prisma.newsFeed.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json({ feeds });
  } catch (error: any) {
    console.error("[API news feeds GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to get feeds" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, category = "General" } = body;

    if (!name || !url) {
      return NextResponse.json({ error: "Name and URL are required" }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid RSS feed URL" }, { status: 400 });
    }

    const feed = await prisma.newsFeed.upsert({
      where: { url },
      update: { name, category, isActive: true },
      create: { name, url, category, isActive: true },
    });

    return NextResponse.json({ success: true, feed });
  } catch (error: any) {
    console.error("[API news feeds POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to add feed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Feed ID is required" }, { status: 400 });
    }

    await prisma.newsFeed.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Feed removed" });
  } catch (error: any) {
    console.error("[API news feeds DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete feed" }, { status: 500 });
  }
}

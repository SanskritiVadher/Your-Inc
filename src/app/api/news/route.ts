import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiCurrentUser } from "@/lib/auth";
import { getCachedNewsItems, syncNewsFeeds } from "@/lib/news/rssService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getApiCurrentUser();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const subjectCode = searchParams.get("subjectCode") || undefined;
    const source = searchParams.get("source") || undefined;
    const onlySaved = searchParams.get("onlySaved") === "true";

    const result = await getCachedNewsItems({
      userId: user?.id,
      subjectCode,
      source,
      limit,
      offset,
      onlySaved,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[API news GET] Error:", error);
    // Never show an error page; return empty cache fallback
    return NextResponse.json({
      items: [],
      totalCount: 0,
      lastUpdated: new Date().toISOString(),
      updatedLabel: "Updated recently",
    });
  }
}

export async function POST() {
  try {
    const result = await syncNewsFeeds(true);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[API news POST] Error syncing feeds:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sync feeds" },
      { status: 500 }
    );
  }
}

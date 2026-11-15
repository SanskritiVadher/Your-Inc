import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteAllLocationData, exportLocationData } from "@/lib/location/privacy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") as "csv" | "json" | null;
    const download = searchParams.get("download") === "true";

    if (format === "csv") {
      const content = await exportLocationData(user.id, "csv");
      return new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="you-inc-location-data.csv"',
        },
      });
    }

    const content = await exportLocationData(user.id, "json");
    if (download) {
      return new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="you-inc-location-data.json"',
        },
      });
    }

    // Return JSON object directly for privacy ledger UI table inspector
    return NextResponse.json(JSON.parse(content));
  } catch (err: unknown) {
    console.error("Location export error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to export data" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    if (action === "delete_all") {
      const result = await deleteAllLocationData(user.id);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Privacy POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process privacy action" },
      { status: 500 }
    );
  }
}

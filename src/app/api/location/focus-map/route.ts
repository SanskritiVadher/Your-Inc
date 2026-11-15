import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFocusMapStats, matchProximityPlace } from "@/lib/location/focusMap";
import { roundToCoarseCoordinate } from "@/lib/location/privacy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await getFocusMapStats(user.id);

    // Fetch saved places
    const savedPlaces = await prisma.location.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      ...data,
      savedPlaces,
    });
  } catch (err: unknown) {
    console.error("Focus Map API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load focus map" },
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

    // 1. Save Study Place (Library, Hostel, Café, Home)
    if (action === "save_place") {
      const { label, lat, lng } = body;
      if (!label || lat === undefined || lng === undefined) {
        return NextResponse.json({ error: "Missing place details" }, { status: 400 });
      }

      const coarseLat = roundToCoarseCoordinate(Number(lat));
      const coarseLng = roundToCoarseCoordinate(Number(lng));

      const place = await prisma.location.create({
        data: {
          userId: user.id,
          label: label.trim(),
          lat: coarseLat,
          lng: coarseLng,
          optIn: true,
        },
      });

      return NextResponse.json({ place });
    }

    // 2. Proximity Check for Study-Zone Review Reminders
    if (action === "proximity_check") {
      const { lat, lng } = body;
      if (lat === undefined || lng === undefined) {
        return NextResponse.json({ matchedPlace: null });
      }

      const matched = await matchProximityPlace(user.id, { lat: Number(lat), lng: Number(lng) });
      let dueCardsCount = 0;
      if (matched) {
        dueCardsCount = await prisma.card.count({
          where: {
            due: { lte: new Date() },
            concept: { subject: { userId: user.id } },
          },
        });
      }

      return NextResponse.json({
        matchedPlace: matched,
        dueCardsCount,
        shouldRemind: Boolean(matched && dueCardsCount > 0),
      });
    }

    // 3. Record Study Session Tagged with Place
    if (action === "record_session") {
      const { locationId, cardsReviewed = 10, accuracy = 85.0, durationMinutes = 15 } = body;

      const cardsPerMin =
        durationMinutes > 0 ? Number((cardsReviewed / durationMinutes).toFixed(1)) : 1.0;

      const session = await prisma.studySession.create({
        data: {
          userId: user.id,
          locationId: locationId || null,
          cardsReviewed: Number(cardsReviewed),
          accuracy: Number(accuracy),
          cardsPerMin,
          start: new Date(Date.now() - durationMinutes * 60 * 1000),
          end: new Date(),
        },
      });

      return NextResponse.json({ session });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Focus Map POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process focus map action" },
      { status: 500 }
    );
  }
}

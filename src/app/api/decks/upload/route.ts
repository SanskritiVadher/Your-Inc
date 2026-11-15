import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateFileHash, parsePptx, parsePdf, parseZipDecks, ParsedDeckData } from "@/lib/deckParser";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const subjectIdParam = formData.get("subjectId") as string | null;
    const sessionNumberParam = formData.get("sessionNumber") as string | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No presentation file uploaded" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File exceeds maximum size limit of 50 MB" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "User session required" }, { status: 401 });
    }

    // Default subject if not passed
    let subjectId = subjectIdParam;
    if (!subjectId) {
      const defaultSubj = await prisma.subject.findFirst({ where: { userId: user.id } });
      subjectId = defaultSubj?.id || "";
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = calculateFileHash(buffer);

    // HASH CHECK: Check if deck already exists to prevent duplicate uploads
    const existingDeck = await prisma.deck.findFirst({
      where: { fileHash, userId: user.id },
      include: {
        slides: { orderBy: { number: "asc" } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    if (existingDeck) {
      return NextResponse.json({
        duplicate: true,
        message: "Deck already uploaded. Redirecting to existing deck.",
        deck: existingDeck,
      });
    }

    const fileName = file.name.toLowerCase();
    const parsedDecks: ParsedDeckData[] = [];

    if (fileName.endsWith(".zip")) {
      const unzipped = await parseZipDecks(buffer);
      parsedDecks.push(...unzipped);
    } else if (fileName.endsWith(".pptx")) {
      const parsed = await parsePptx(buffer, file.name);
      parsedDecks.push(parsed);
    } else if (fileName.endsWith(".pdf")) {
      const parsed = await parsePdf(buffer, file.name);
      parsedDecks.push(parsed);
    } else {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload .pptx, .pdf, or a .zip archive." },
        { status: 400 }
      );
    }

    if (parsedDecks.length === 0) {
      return NextResponse.json(
        { error: "No valid slide presentations found inside uploaded file" },
        { status: 400 }
      );
    }

    // Create Deck and Slide records in Database
    const createdDecks = [];

    for (const d of parsedDecks) {
      const sessionNum = sessionNumberParam
        ? parseInt(sessionNumberParam, 10)
        : d.suggestedSessionNumber || (await prisma.deck.count({ where: { subjectId } })) + 1;

      const deck = await prisma.deck.create({
        data: {
          userId: user.id,
          subjectId,
          title: d.title,
          sessionNumber: sessionNum,
          fileHash: d.fileHash,
          slideCount: d.slides.length,
          status: "parsing",
          progress: 35,
          sessionStatus: "Untouched",
        },
      });

      // Insert slides
      for (const s of d.slides) {
        await prisma.slide.create({
          data: {
            deckId: deck.id,
            number: s.number,
            text: s.text,
            notes: s.notes,
            imageUrl: s.imageUrl,
            hasGap: s.hasGap,
            gapReason: s.gapReason,
          },
        });
      }

      createdDecks.push(deck);
    }

    return NextResponse.json({
      success: true,
      count: createdDecks.length,
      primaryDeckId: createdDecks[0].id,
      decks: createdDecks,
    });
  } catch (err: unknown) {
    console.error("Deck upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to upload and parse deck" },
      { status: 500 }
    );
  }
}

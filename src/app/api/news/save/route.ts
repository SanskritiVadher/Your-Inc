import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { newsItemId, createCard = false } = body;

    if (!newsItemId) {
      return NextResponse.json({ error: "newsItemId is required" }, { status: 400 });
    }

    const newsItem = await prisma.newsItem.findUnique({
      where: { id: newsItemId },
    });

    if (!newsItem) {
      return NextResponse.json({ error: "News item not found" }, { status: 404 });
    }

    const existingSave = await prisma.savedNewsItem.findUnique({
      where: {
        userId_newsItemId: {
          userId: user.id,
          newsItemId,
        },
      },
      include: { card: true },
    });

    // Case 1: If createCard is requested
    if (createCard) {
      let cardId = existingSave?.cardId;

      if (!cardId) {
        // Find or create concept to link the card to
        let subject = null;
        if (newsItem.subjectCode) {
          subject = await prisma.subject.findFirst({
            where: {
              userId: user.id,
              code: { contains: newsItem.subjectCode.substring(0, 3) },
            },
          });
        }
        if (!subject) {
          subject = await prisma.subject.findFirst({
            where: { userId: user.id },
          });
        }

        // If still no subject exists, create a default "Current Affairs & Strategy" subject
        if (!subject) {
          subject = await prisma.subject.create({
            data: {
              userId: user.id,
              name: "General Management & Current Affairs",
              code: "GMC601",
              credits: 3,
              color: "#B33925",
            },
          });
        }

        const conceptTitle = newsItem.topicName || "Current Affairs & Macroeconomic Analysis";
        let concept = await prisma.concept.findFirst({
          where: {
            subjectId: subject.id,
            name: conceptTitle,
          },
        });

        if (!concept) {
          concept = await prisma.concept.create({
            data: {
              subjectId: subject.id,
              name: conceptTitle,
              definition: newsItem.whyItMatters || "Real-world business case and macro trends.",
              value: 50.0,
              stability: 1.0,
              difficulty: 5.0,
            },
          });
        }

        // Create the active recall card
        const newCard = await prisma.card.create({
          data: {
            conceptId: concept.id,
            type: "APPLICATION",
            front: `[Current Affairs: ${newsItem.source}]\n${newsItem.title}\n\nGroup Discussion Prompt:\n${newsItem.gdQuestion || "How should corporate leadership position their strategy in response?"}`,
            back: `Why it matters for your MBA:\n${newsItem.whyItMatters || newsItem.summary}\n\nInterview Perspective:\n${newsItem.interviewQuestion || "Evaluate the operational and fiscal impact of this development."}`,
            stability: 2.0,
            difficulty: 4.5,
            due: new Date(),
          },
        });

        cardId = newCard.id;
      }

      if (existingSave) {
        await prisma.savedNewsItem.update({
          where: { id: existingSave.id },
          data: { cardId },
        });
      } else {
        await prisma.savedNewsItem.create({
          data: {
            userId: user.id,
            newsItemId,
            cardId,
          },
        });
      }

      return NextResponse.json({
        isSaved: true,
        cardCreated: true,
        cardId,
        message: "Saved and added as a review card!",
      });
    }

    // Case 2: Regular toggle save / unsave
    if (existingSave) {
      await prisma.savedNewsItem.delete({
        where: { id: existingSave.id },
      });
      return NextResponse.json({
        isSaved: false,
        message: "Removed from saved items",
      });
    } else {
      await prisma.savedNewsItem.create({
        data: {
          userId: user.id,
          newsItemId,
        },
      });
      return NextResponse.json({
        isSaved: true,
        message: "Saved to your notes",
      });
    }
  } catch (error: any) {
    console.error("[API news save POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update saved status" },
      { status: 500 }
    );
  }
}

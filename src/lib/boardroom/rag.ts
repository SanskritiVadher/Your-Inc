import { prisma } from "@/lib/prisma";

export interface RagChunk {
  type: "slide" | "note" | "concept" | "memory";
  id: string;
  title: string;
  subtitle: string;
  content: string;
  score: number;
  deckId?: string;
  slideNumber?: number;
  noteId?: string;
  conceptId?: string;
  subjectCode?: string;
  subjectName?: string;
}

export interface RagResult {
  inMaterial: boolean;
  chunks: RagChunk[];
  memories: { id: string; type: string; content: string }[];
  searchTerms: string[];
}

/**
 * Normalizes text into search tokens, removing punctuation and common stop words.
 */
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    "what", "how", "why", "when", "where", "who", "which", "is", "are", "was",
    "were", "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of",
    "with", "by", "from", "about", "explain", "describe", "tell", "me", "can",
    "you", "does", "do", "did", "have", "has", "had", "would", "could", "should"
  ]);

  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
}

/**
 * Calculates keyword relevance score between search tokens and a corpus string.
 */
function calculateKeywordScore(tokens: string[], text: string, title = ""): number {
  if (tokens.length === 0 || !text) return 0;
  const lowerText = text.toLowerCase();
  const lowerTitle = title.toLowerCase();

  let hits = 0;
  let titleBonus = 0;

  for (const token of tokens) {
    if (lowerTitle.includes(token)) {
      titleBonus += 2.0;
      hits++;
    } else if (lowerText.includes(token)) {
      hits++;
    }
  }

  const coverage = hits / tokens.length;
  return Math.min(1.0, coverage * 0.7 + (titleBonus > 0 ? 0.3 : 0.0));
}

/**
 * Hybrid retrieval engine across Slides, Notes, Concepts, and Memory entries.
 */
export async function retrieveRelevantMaterial(params: {
  userId: string;
  query: string;
  scope?: "all" | "subject" | "deck";
  subjectId?: string | null;
  deckId?: string | null;
  limit?: number;
}): Promise<RagResult> {
  const { userId, query, scope = "all", subjectId, deckId, limit = 6 } = params;
  const tokens = extractKeywords(query);

  const chunks: RagChunk[] = [];

  // 1. Retrieve Slides
  const slideWhere: Record<string, unknown> = {
    deck: {
      subject: { userId },
      ...(subjectId ? { subjectId } : {}),
      ...(deckId ? { id: deckId } : {}),
    },
  };

  const slides = await prisma.slide.findMany({
    where: slideWhere,
    include: {
      deck: {
        select: {
          id: true,
          title: true,
          subject: { select: { id: true, code: true, name: true } },
        },
      },
    },
    take: 100,
  });

  for (const slide of slides) {
    const combinedContent = `${slide.text || ""} ${slide.notes || ""} ${slide.studentExplanation || ""}`;
    const score = calculateKeywordScore(tokens, combinedContent, `${slide.deck.title} Slide ${slide.number}`);

    if (score > 0.15) {
      chunks.push({
        type: "slide",
        id: slide.id,
        title: `${slide.deck.subject.code} · Slide ${slide.number}`,
        subtitle: slide.deck.title,
        content: combinedContent.trim(),
        score,
        deckId: slide.deck.id,
        slideNumber: slide.number,
        subjectCode: slide.deck.subject.code,
        subjectName: slide.deck.subject.name,
      });
    }
  }

  // 2. Retrieve Classroom Notes (if not scoped strictly to a deck)
  if (scope !== "deck") {
    const noteWhere: Record<string, unknown> = {
      userId,
      ...(subjectId ? { subjectId } : {}),
    };

    const notes = await prisma.note.findMany({
      where: noteWhere,
      include: {
        subject: { select: { id: true, code: true, name: true } },
      },
      take: 50,
    });

    for (const note of notes) {
      const combined = `${note.title} ${note.content} ${note.tags || ""}`;
      const score = calculateKeywordScore(tokens, combined, note.title);

      if (score > 0.15) {
        chunks.push({
          type: "note",
          id: note.id,
          title: `Note: ${note.title}`,
          subtitle: `${note.subject.code}: ${note.subject.name}`,
          content: note.content,
          score: score * 1.05, // Slight priority to student's own notes
          noteId: note.id,
          subjectCode: note.subject.code,
          subjectName: note.subject.name,
        });
      }
    }
  }

  // 3. Retrieve Concepts
  if (scope !== "deck") {
    const conceptWhere: Record<string, unknown> = {
      subject: {
        userId,
        ...(subjectId ? { id: subjectId } : {}),
      },
    };

    const concepts = await prisma.concept.findMany({
      where: conceptWhere,
      include: {
        subject: { select: { id: true, code: true, name: true } },
      },
      take: 60,
    });

    for (const c of concepts) {
      const combined = `${c.name} ${c.definition}`;
      const score = calculateKeywordScore(tokens, combined, c.name);

      if (score > 0.2) {
        chunks.push({
          type: "concept",
          id: c.id,
          title: `Concept: ${c.name}`,
          subtitle: `${c.subject.code} (Mastery: ₹${c.value.toFixed(1)})`,
          content: c.definition,
          score: score * 1.1, // Priority to foundational concept definitions
          conceptId: c.id,
          subjectCode: c.subject.code,
          subjectName: c.subject.name,
        });
      }
    }
  }

  // 4. Retrieve Context Memories (e.g. Professor Preferences, Past Mistakes)
  const memories = await prisma.memoryEntry.findMany({
    where: {
      userId,
      ...(subjectId ? { subjectId } : {}),
    },
    take: 15,
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, content: true },
  });

  // Sort chunks by score descending
  chunks.sort((a, b) => b.score - a.score);

  const topChunks = chunks.slice(0, limit);
  const maxScore = topChunks.length > 0 ? topChunks[0].score : 0;

  // Honest guardrail check: if no chunk has score >= 0.25, question is outside course materials!
  const inMaterial = maxScore >= 0.25 && topChunks.length > 0;

  return {
    inMaterial,
    chunks: topChunks,
    memories,
    searchTerms: tokens,
  };
}

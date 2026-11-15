import { prisma } from "./prisma";
import { getEmbedding, cosineSimilarity, generateDeterministicEmbedding } from "./embeddings";
import { MemoryType } from "@prisma/client";

/**
 * Checks for sensitive personal data (health, bank accounts, passwords, ID numbers).
 * Strictly enforced before saving to persistent memory.
 */
export function isSensitivePersonalData(text: string): { isSensitive: boolean; reason?: string } {
  const lower = text.toLowerCase();

  // Credit card regex (13-16 digits)
  const creditCardRegex = /\b(?:\d[ -]*?){13,16}\b/;
  if (creditCardRegex.test(text.replace(/\s+/g, ""))) {
    return { isSensitive: true, reason: "Detected potential payment card number" };
  }

  // Social Security / National ID regex (e.g. XXX-XX-XXXX or 12 digit Aadhaar)
  const idRegex = /\b\d{3}-\d{2}-\d{4}\b|\b\d{4}\s\d{4}\s\d{4}\b/;
  if (idRegex.test(text)) {
    return { isSensitive: true, reason: "Detected national identity number" };
  }

  // Password / Secret key patterns
  if (/\b(?:password|passwd|api[_-]?key|secret[_-]?key|pin|cvv)\s*[:=]\s*\S+/i.test(text)) {
    return { isSensitive: true, reason: "Detected password or credentials" };
  }

  // Sensitive health / medical diagnoses
  const healthKeywords = [
    "bipolar", "depression", "prescription", "psychiatric", "medical diagnosis",
    "cancer", "hiv", "chemotherapy", "blood test result", "hospitalization"
  ];
  for (const kw of healthKeywords) {
    if (lower.includes(kw)) {
      return { isSensitive: true, reason: "Detected sensitive personal health information" };
    }
  }

  // Private personal banking balance / salary
  if (/\b(?:my bank balance|my salary|my savings account|account number \d+)\b/i.test(text)) {
    return { isSensitive: true, reason: "Detected private personal bank/salary information" };
  }

  return { isSensitive: false };
}

export interface ProposedMemory {
  type: MemoryType;
  content: string;
  source: string;
  subjectId?: string;
  reason: string;
}

/**
 * Scans an interaction text (e.g. from syllabus review or chat)
 * to propose durable learning habits, professor preferences, or exam rules.
 */
export function proposeMemoriesFromInteraction(
  text: string,
  source: string,
  subjectId?: string
): ProposedMemory[] {
  const proposed: ProposedMemory[] = [];
  const lines = text.split(/\n+/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 15 || trimmed.length > 280) continue;

    // Check if line contains professor preferences
    if (/(?:prof(?:essor)?|instructor|faculty)\s+(?:wants|prefers|emphasizes|stresses|requires|expects|likes)/i.test(trimmed)) {
      proposed.push({
        type: "PROFESSOR_PREFERENCE",
        content: trimmed.replace(/^[-*•\d.]+\s*/, ""),
        source,
        subjectId,
        reason: "Detected instructor expectation",
      });
    }
    // Check for personal rules or exam guidelines
    else if (/(?:always remember|rule of thumb|must structure|answers? in \d+ points?|penalty for|deduction for)/i.test(trimmed)) {
      proposed.push({
        type: "PERSONAL_RULE",
        content: trimmed.replace(/^[-*•\d.]+\s*/, ""),
        source,
        subjectId,
        reason: "Detected tactical answering rule",
      });
    }
    // Check for common past mistakes
    else if (/(?:common mistake|watch out for|frequent error|don't confuse|pitfall)/i.test(trimmed)) {
      proposed.push({
        type: "PAST_MISTAKE",
        content: trimmed.replace(/^[-*•\d.]+\s*/, ""),
        source,
        subjectId,
        reason: "Detected high-risk conceptual pitfall",
      });
    }
  }

  // Deduplicate and filter out any sensitive proposals
  return proposed.filter((p) => !isSensitivePersonalData(p.content).isSensitive).slice(0, 4);
}

export interface RetrievedMemory {
  id: string;
  type: MemoryType;
  content: string;
  source: string | null;
  subjectName?: string;
  score: number;
}

/**
 * Retrieves the top relevant memories for an AI prompt context.
 * Filters by subject match + semantic similarity, returning at most `limit` (max 8).
 */
export async function getRelevantMemories(
  userId: string,
  subjectId?: string,
  query?: string,
  limit: number = 8
): Promise<RetrievedMemory[]> {
  try {
    const allMemories = await prisma.memoryEntry.findMany({
      where: {
        userId,
        ...(subjectId ? { OR: [{ subjectId }, { subjectId: null }] } : {}),
      },
      include: {
        subject: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    });

    if (allMemories.length === 0) return [];

    let queryVec: number[] | null = null;
    if (query && query.trim()) {
      queryVec = await getEmbedding(query.trim());
    }

    const scored = allMemories.map((m) => {
      let score = 0.5;
      // Boost exact subject match
      if (subjectId && m.subjectId === subjectId) {
        score += 0.3;
      }
      // If query vector provided, add cosine similarity
      if (queryVec) {
        const memVec = generateDeterministicEmbedding(m.content);
        const sim = cosineSimilarity(queryVec, memVec);
        score += sim * 0.4;
      }

      return {
        id: m.id,
        type: m.type,
        content: m.content,
        source: m.source,
        subjectName: m.subject?.name,
        score,
      };
    });

    // Sort descending by relevance score and cap at limit (max 8)
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(limit, 8));
  } catch (err) {
    console.error("Error retrieving relevant memories:", err);
    return [];
  }
}

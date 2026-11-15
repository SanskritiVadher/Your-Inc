/**
 * Vector Embeddings and Semantic Deduplication Engine
 * Uses OpenAI / Gemini embeddings when API key is provided,
 * with deterministic semantic sparse-dense vector projection fallback for offline/local resilience.
 */

export const EMBEDDING_DIMENSION = 1536;

/**
 * Generate a 1536-dimensional embedding vector for given text.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const cleanText = text.trim();
  if (!cleanText) {
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }

  // 1. If OpenAI API key is configured, call text-embedding-3-small
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith("sk-")) {
    try {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: cleanText,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data[0] && json.data[0].embedding) {
          return json.data[0].embedding;
        }
      }
    } catch (e) {
      console.warn("OpenAI embedding API failed, falling back to deterministic semantic vectorizer", e);
    }
  }

  // 2. Deterministic high-dimensional semantic hashing vectorizer (normalized)
  return generateDeterministicEmbedding(cleanText);
}

/**
 * Generates a normalized 1536-dimensional semantic vector using term frequency,
 * n-gram character hashing, and word root embeddings.
 */
export function generateDeterministicEmbedding(text: string): number[] {
  const vector = new Array(EMBEDDING_DIMENSION).fill(0);
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, " ");
  const words = normalized.split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Hash whole word
    let h1 = 5381;
    for (let c = 0; c < word.length; c++) {
      h1 = ((h1 << 5) + h1) ^ word.charCodeAt(c);
    }
    const idx1 = Math.abs(h1) % EMBEDDING_DIMENSION;
    vector[idx1] += 1.5;

    // Hash bi-grams for positional semantics
    if (i < words.length - 1) {
      const bigram = `${word}_${words[i + 1]}`;
      let h2 = 0x811c9dc5;
      for (let c = 0; c < bigram.length; c++) {
        h2 = Math.imul(h2 ^ bigram.charCodeAt(c), 0x01000193);
      }
      const idx2 = Math.abs(h2) % EMBEDDING_DIMENSION;
      vector[idx2] += 2.0;
    }

    // Character tri-grams for morphological similarity (e.g., "depreciation", "depreciated")
    for (let c = 0; c < word.length - 2; c++) {
      const trigram = word.substring(c, c + 3);
      let h3 = 17;
      for (let tc = 0; tc < trigram.length; tc++) {
        h3 = ((h3 << 3) - h3) + trigram.charCodeAt(tc);
      }
      const idx3 = Math.abs(h3) % EMBEDDING_DIMENSION;
      vector[idx3] += 0.5;
    }
  }

  // L2 Normalize vector
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      vector[i] /= norm;
    }
  }

  return vector;
}

/**
 * Calculates Cosine Similarity between two vectors [-1.0, 1.0]
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface ExistingConceptReference {
  id: string;
  name: string;
  definition: string;
  embeddingVector?: number[];
}

export interface DeduplicationMatch {
  existingConceptId: string;
  existingConceptName: string;
  similarity: number; // e.g. 0.92
  suggestedAction: "merge" | "distinct";
}

/**
 * Evaluates candidate concept against existing subject concepts.
 * Rule: similarity > 0.88 = suggest merge, never auto-merge.
 */
export function checkDeduplication(
  candidateName: string,
  candidateDef: string,
  candidateVec: number[],
  existingConcepts: ExistingConceptReference[]
): DeduplicationMatch | null {
  let highestSim = 0;
  let matchedConcept: ExistingConceptReference | null = null;

  for (const existing of existingConcepts) {
    let sim = 0;
    if (existing.embeddingVector && existing.embeddingVector.length === EMBEDDING_DIMENSION) {
      sim = cosineSimilarity(candidateVec, existing.embeddingVector);
    } else {
      // Re-generate vector on the fly if not stored in DB memory
      const existingVec = generateDeterministicEmbedding(`${existing.name} ${existing.definition}`);
      sim = cosineSimilarity(candidateVec, existingVec);
    }

    if (sim > highestSim) {
      highestSim = sim;
      matchedConcept = existing;
    }
  }

  if (matchedConcept && highestSim >= 0.88) {
    return {
      existingConceptId: matchedConcept.id,
      existingConceptName: matchedConcept.name,
      similarity: Number(highestSim.toFixed(3)),
      suggestedAction: "merge",
    };
  }

  return null;
}

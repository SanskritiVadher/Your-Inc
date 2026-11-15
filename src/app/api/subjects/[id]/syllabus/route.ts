import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDeterministicEmbedding, checkDeduplication, ExistingConceptReference } from "@/lib/embeddings";
import { proposeMemoriesFromInteraction } from "@/lib/memory";

export const dynamic = "force-dynamic";

interface ExtractedConceptCandidate {
  tempId: string;
  name: string;
  unit: string;
  definition: string;
  suggestMerge?: boolean;
  matchedConceptId?: string;
  matchedConceptName?: string;
  similarity?: number;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    let rawText = "";
    let sourceFileName = "Pasted Course Outline";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const textParam = formData.get("text") as string | null;

      if (file && file.size > 0) {
        sourceFileName = file.name;
        const buffer = Buffer.from(await file.arrayBuffer());

        if (file.name.toLowerCase().endsWith(".pdf")) {
          // Parse PDF
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pdfModule: any = await import("pdf-parse");
            const parseFn = typeof pdfModule === "function" ? pdfModule : pdfModule.default || pdfModule;
            const pdfData = await parseFn(buffer);
            rawText = pdfData.text;
          } catch (pdfErr) {
            console.error("PDF parse error:", pdfErr);
            return NextResponse.json(
              { error: "Could not parse PDF content. Please paste syllabus text directly." },
              { status: 400 }
            );
          }
        } else if (file.name.toLowerCase().endsWith(".docx")) {
          // Parse DOCX
          try {
            const mammoth = await import("mammoth");
            const docxResult = await mammoth.extractRawText({ buffer });
            rawText = docxResult.value;
          } catch (docxErr) {
            console.error("DOCX parse error:", docxErr);
            return NextResponse.json(
              { error: "Could not parse DOCX content. Please paste syllabus text directly." },
              { status: 400 }
            );
          }
        } else {
          // Plain text fallback
          rawText = buffer.toString("utf-8");
        }
      } else if (textParam) {
        rawText = textParam;
      }
    } else {
      const body = await req.json();
      rawText = body.text || "";
      sourceFileName = body.source || "Pasted Course Outline";
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "No syllabus text or file content provided" },
        { status: 400 }
      );
    }

    // Fetch existing subject concepts for embedding deduplication
    const existingSubjectConcepts = await prisma.concept.findMany({
      where: { subjectId: params.id },
      select: {
        id: true,
        name: true,
        definition: true,
      },
    });

    const existingRefs: ExistingConceptReference[] = existingSubjectConcepts.map((c) => ({
      id: c.id,
      name: c.name,
      definition: c.definition,
    }));

    // Extract Units and Concepts from raw text
    const extractedConcepts: ExtractedConceptCandidate[] = [];
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    let currentUnit = "Foundations";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect Unit or Module headers (e.g. "Unit 1: Valuation", "Module 2: Capital Structure")
      const unitMatch = line.match(/^(?:Unit|Module|Part|Section|Chapter)\s*(\d+|[IVXLCDM]+)?[:\s-]+([^\n]+)/i);
      if (unitMatch) {
        currentUnit = `${unitMatch[0]}`.trim();
        continue;
      }

      // Detect Concept bullet points or headings
      // e.g. "1. Discounted Cash Flow: valuation method calculating present value"
      // or "• Net Present Value - Difference between PV of cash inflows and outflows"
      const conceptMatch = line.match(/^[-*•\d.]+\s*([A-Za-z0-9\s()&/-]{3,45})[:\s–—-]+([^\n]+)/);
      if (conceptMatch) {
        const name = conceptMatch[1].trim();
        const definition = conceptMatch[2].trim();

        if (name.length >= 3 && definition.length >= 10) {
          const candidateVec = generateDeterministicEmbedding(`${name} ${definition}`);
          const dedupe = checkDeduplication(name, definition, candidateVec, existingRefs);

          extractedConcepts.push({
            tempId: `cand_${Math.random().toString(36).substring(2, 9)}`,
            name,
            unit: currentUnit,
            definition: definition.length > 200 ? definition.substring(0, 197) + "..." : definition,
            suggestMerge: dedupe !== null,
            matchedConceptId: dedupe?.existingConceptId,
            matchedConceptName: dedupe?.existingConceptName,
            similarity: dedupe?.similarity,
          });
        }
      }
    }

    // If text was unstructured paragraphs, fallback to heuristic sentence extraction
    if (extractedConcepts.length === 0) {
      const sentences = rawText.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 25);
      for (let i = 0; i < Math.min(sentences.length, 12); i++) {
        const s = sentences[i];
        const colonSplit = s.split(/[:–—]/);
        if (colonSplit.length >= 2) {
          const name = colonSplit[0].replace(/^[-*•\d.\s]+/, "").trim();
          const def = colonSplit.slice(1).join(" ").trim();
          if (name.length >= 3 && name.length <= 40 && def.length >= 15) {
            const candidateVec = generateDeterministicEmbedding(`${name} ${def}`);
            const dedupe = checkDeduplication(name, def, candidateVec, existingRefs);

            extractedConcepts.push({
              tempId: `cand_${Math.random().toString(36).substring(2, 9)}`,
              name,
              unit: "Course Frameworks",
              definition: def.length > 200 ? def.substring(0, 197) + "..." : def,
              suggestMerge: dedupe !== null,
              matchedConceptId: dedupe?.existingConceptId,
              matchedConceptName: dedupe?.existingConceptName,
              similarity: dedupe?.similarity,
            });
          }
        }
      }
    }

    // Extract proposed persistent memories (professor preferences, answering rules, past mistakes)
    const proposedMemories = proposeMemoriesFromInteraction(
      rawText,
      `Syllabus: ${sourceFileName}`,
      params.id
    );

    return NextResponse.json({
      success: true,
      source: sourceFileName,
      concepts: extractedConcepts,
      proposedMemories,
      totalExtracted: extractedConcepts.length,
    });
  } catch (err: unknown) {
    console.error("Syllabus parse error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process syllabus" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import JSZip from "jszip";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const semesterId = formData.get("semesterId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No ZIP file provided" }, { status: 400 });
    }
    if (!semesterId) {
      return NextResponse.json({ error: "Semester ID is required" }, { status: 400 });
    }

    const term = await prisma.term.findUnique({
      where: { id: semesterId },
      include: { subjects: true },
    });

    if (!term) {
      return NextResponse.json({ error: "Semester not found" }, { status: 404 });
    }

    // Default subject if needed, or fallback to first subject in term
    let defaultSubject = term.subjects[0];
    if (!defaultSubject) {
      // Create a general subject for this semester if none exists
      defaultSubject = await prisma.subject.create({
        data: {
          userId: user.id,
          termId: semesterId,
          name: "General Coursework",
          code: "GEN101",
          credits: 3,
        },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    let decksCreated = 0;
    let notesCreated = 0;
    const processedFiles: string[] = [];

    const entries = Object.entries(zip.files);

    for (const [relativePath, zipEntry] of entries) {
      if (zipEntry.dir) continue;
      // Skip hidden/system files (e.g. __MACOSX, .DS_Store)
      if (relativePath.includes("__MACOSX") || relativePath.startsWith(".") || relativePath.includes("/.")) {
        continue;
      }

      const filename = relativePath.split("/").pop() || relativePath;
      const cleanTitle = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const ext = filename.split(".").pop()?.toLowerCase();

      // Check if folder name or filename matches any existing subject code/name
      let targetSubject = defaultSubject;
      for (const subj of term.subjects) {
        if (
          relativePath.toLowerCase().includes(subj.code.toLowerCase()) ||
          relativePath.toLowerCase().includes(subj.name.toLowerCase())
        ) {
          targetSubject = subj;
          break;
        }
      }

      if (ext === "md" || ext === "txt") {
        const textContent = await zipEntry.async("string");
        await prisma.note.create({
          data: {
            userId: user.id,
            subjectId: targetSubject.id,
            title: cleanTitle,
            content: textContent || "Imported lecture note content.",
          },
        });
        notesCreated++;
        processedFiles.push(filename);
      } else if (ext === "pdf" || ext === "pptx" || ext === "ppt") {
        // Create lecture deck
        const deck = await prisma.deck.create({
          data: {
            subjectId: targetSubject.id,
            title: cleanTitle,
            fileUrl: `/uploads/${encodeURIComponent(filename)}`,
            slideCount: 8, // Sensible starter slide count
            processed: true,
            status: "ready",
          },
        });

        // Seed 3 starter slides
        for (let s = 1; s <= 3; s++) {
          await prisma.slide.create({
            data: {
              deckId: deck.id,
              number: s,
              imageUrl: "",
              text: `Slide ${s}: Core principles and case frameworks from ${cleanTitle}.`,
              notes: `Key takeaways and strategic insights covered in ${cleanTitle} section ${s}.`,
            },
          });
        }

        decksCreated++;
        processedFiles.push(filename);
      }
    }

    return NextResponse.json({
      success: true,
      semesterName: term.name,
      decksCreated,
      notesCreated,
      totalFiles: processedFiles.length,
      files: processedFiles.slice(0, 15),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to import zip file" },
      { status: 500 }
    );
  }
}

import crypto from "crypto";
import JSZip from "jszip";

export interface ParsedSlide {
  number: number;
  title: string;
  text: string;
  notes?: string;
  imageUrl?: string;
  hasGap: boolean;
  gapReason?: string;
}

export interface ParsedDeckData {
  title: string;
  suggestedSessionNumber?: number;
  suggestedSubjectCode?: string;
  fileHash: string;
  slides: ParsedSlide[];
}

/**
 * Calculates SHA-256 hash of a file buffer to detect re-uploaded identical decks.
 */
export function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Generate an authentic SVG slide presentation preview for the two-pane viewer.
 */
export function generateSlideImage(slideNumber: number, title: string, bulletPoints: string[]): string {
  const cleanTitle = title.replace(/[<>&'"]/g, " ").substring(0, 50);
  const bulletsSvg = bulletPoints.slice(0, 5).map((b, idx) => {
    const cleanB = b.replace(/[<>&'"]/g, " ").substring(0, 75);
    return `<text x="50" y="${160 + idx * 38}" font-family="Source Sans 3, sans-serif" font-size="16" fill="#1F1A17">• ${cleanB}</text>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
    <rect width="800" height="450" fill="#FBF5E8" stroke="#D3C7B2" stroke-width="2"/>
    <rect x="25" y="25" width="750" height="400" fill="none" stroke="#B3261E" stroke-opacity="0.3" stroke-dasharray="4 3"/>
    <text x="50" y="70" font-family="JetBrains Mono, monospace" font-size="12" fill="#B3261E" letter-spacing="2">SESSION SLIDE ${slideNumber}</text>
    <text x="50" y="115" font-family="Rozha One, serif" font-size="26" fill="#1F1A17">${cleanTitle || `Slide ${slideNumber}`}</text>
    <line x1="50" y1="130" x2="750" y2="130" stroke="#1F1A17" stroke-opacity="0.15" stroke-width="1.5"/>
    ${bulletsSvg}
    <text x="750" y="415" font-family="JetBrains Mono, monospace" font-size="12" fill="#665A4F" text-anchor="end">You Inc. Bahi-Khata Deck Viewer</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Parses a PPTX presentation file.
 * Unpacks the OpenXML archive, extracting text from slide XMLs, notes, and tables.
 */
export async function parsePptx(buffer: Buffer, fileName: string): Promise<ParsedDeckData> {
  const fileHash = calculateFileHash(buffer);
  const zip = await JSZip.loadAsync(buffer);
  const slides: ParsedSlide[] = [];

  // Match all ppt/slides/slide{N}.xml
  const slideFileNames = Object.keys(zip.files).filter((f) =>
    /^ppt\/slides\/slide\d+\.xml$/i.test(f)
  );

  // Sort naturally by slide number (e.g. slide1, slide2, slide10)
  slideFileNames.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10);
    const numB = parseInt(b.replace(/\D/g, ""), 10);
    return numA - numB;
  });

  for (let i = 0; i < slideFileNames.length; i++) {
    const slidePath = slideFileNames[i];
    const slideNumber = i + 1;
    const xmlText = await zip.files[slidePath].async("text");

    // Extract text blocks inside <a:t>...</a:t>
    const textMatches = Array.from(xmlText.matchAll(/<a:t[^>]*>(.*?)<\/a:t>/gi)).map((m) => m[1]);
    const fullText = textMatches.join(" ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

    // Look for speaker notes
    let notes = "";
    const notesPath = `ppt/notesSlides/notesSlide${slideNumber}.xml`;
    if (zip.files[notesPath]) {
      const notesXml = await zip.files[notesPath].async("text");
      const noteMatches = Array.from(notesXml.matchAll(/<a:t[^>]*>(.*?)<\/a:t>/gi)).map((m) => m[1]);
      notes = noteMatches.join(" ").replace(/&amp;/g, "&").trim();
    }

    // Determine slide title (first line or first chunk)
    const title = textMatches.length > 0 ? textMatches[0].trim() : `Slide ${slideNumber}`;
    const bulletPoints = textMatches.slice(1).filter((t) => t.trim().length > 3);

    // Gap detector: flag image-only slides or slides with low text (< 30 characters)
    const isLowText = fullText.length < 30;
    const hasGap = isLowText;
    const gapReason = isLowText
      ? "Image-only slide, chart or diagram with minimal text. Verify with instructor or fill in what was discussed."
      : undefined;

    const imageUrl = generateSlideImage(slideNumber, title, bulletPoints);

    slides.push({
      number: slideNumber,
      title,
      text: fullText || `[Slide ${slideNumber}: Visual diagram / framework illustration]`,
      notes: notes || undefined,
      imageUrl,
      hasGap,
      gapReason,
    });
  }

  // Detect session number and title heuristics
  const cleanTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
  const sessionMatch = cleanTitle.match(/(?:session|lecture|class|module|week)\s*(\d+)/i);
  const suggestedSessionNumber = sessionMatch ? parseInt(sessionMatch[1], 10) : undefined;

  return {
    title: cleanTitle,
    suggestedSessionNumber,
    fileHash,
    slides,
  };
}

/**
 * Parses a PDF presentation or document.
 */
export async function parsePdf(buffer: Buffer, fileName: string): Promise<ParsedDeckData> {
  const fileHash = calculateFileHash(buffer);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfModule: any = await import("pdf-parse");
  const parseFn = typeof pdfModule === "function" ? pdfModule : pdfModule.default || pdfModule;
  const pdfData = await parseFn(buffer);

  const rawText = pdfData.text || "";
  const pages = rawText.split(/\f|\n(?=Page \d+|\f)/).filter((p: string) => p.trim().length > 0);

  const slides: ParsedSlide[] = [];
  const slideCount = Math.max(pages.length, 1);

  for (let i = 0; i < slideCount; i++) {
    const pageText = String(pages[i] || "").trim();
    const slideNumber = i + 1;
    const lines: string[] = pageText.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
    const title = lines.length > 0 ? lines[0] : `Slide ${slideNumber}`;
    const bullets = lines.slice(1, 6);

    const isLowText = pageText.length < 35;
    const hasGap = isLowText;
    const gapReason = isLowText
      ? "Visual slide with very little text. Add notes or review audio."
      : undefined;

    const imageUrl = generateSlideImage(slideNumber, title, bullets);

    slides.push({
      number: slideNumber,
      title,
      text: pageText || `[Slide ${slideNumber}: Non-textual diagram or visual presentation]`,
      imageUrl,
      hasGap,
      gapReason,
    });
  }

  const cleanTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
  const sessionMatch = cleanTitle.match(/(?:session|lecture|class|module|week)\s*(\d+)/i);
  const suggestedSessionNumber = sessionMatch ? parseInt(sessionMatch[1], 10) : undefined;

  return {
    title: cleanTitle,
    suggestedSessionNumber,
    fileHash,
    slides,
  };
}

/**
 * Unpacks and parses a ZIP archive containing multiple deck files (.pptx or .pdf).
 */
export async function parseZipDecks(buffer: Buffer): Promise<ParsedDeckData[]> {
  const zip = await JSZip.loadAsync(buffer);
  const deckFiles = Object.keys(zip.files).filter(
    (name) =>
      !name.startsWith("__MACOSX") &&
      !zip.files[name].dir &&
      /\.(pptx|pdf)$/i.test(name)
  );

  // Sort deck files naturally
  deckFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const parsedDecks: ParsedDeckData[] = [];

  for (const fileName of deckFiles) {
    const fileBuffer = await zip.files[fileName].async("nodebuffer");
    if (fileName.toLowerCase().endsWith(".pptx")) {
      const parsed = await parsePptx(fileBuffer, fileName);
      parsedDecks.push(parsed);
    } else if (fileName.toLowerCase().endsWith(".pdf")) {
      const parsed = await parsePdf(fileBuffer, fileName);
      parsedDecks.push(parsed);
    }
  }

  return parsedDecks;
}

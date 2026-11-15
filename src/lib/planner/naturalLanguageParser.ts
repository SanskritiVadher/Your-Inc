export interface ParsedAssignmentQuickAdd {
  title: string;
  matchedSubjectCode?: string;
  deliverableFormat?: string;
  deadline: string; // ISO string
  weight: number;
  confidence: number;
}

export interface ExtractedAssignmentBrief {
  title: string;
  deliverables: string[];
  formatRules: string[];
  pageOrWordLimit?: string;
  checklist: { item: string; done: boolean }[];
  suggestedDeliverableFormat?: string;
}

/**
 * Parses natural language assignment text into structured fields.
 * Example: "Marketing deck due Friday 5pm, 10 slides"
 */
export function parseNaturalLanguageAssignment(
  input: string,
  baseDate: Date = new Date(),
  availableSubjects: { id: string; code: string; name: string }[] = []
): ParsedAssignmentQuickAdd {
  const text = input.trim();
  const lower = text.toLowerCase();

  const defaultSubjects = [
    { id: "def-mkt", code: "MKT502", name: "Marketing Strategy" },
    { id: "def-fin", code: "FIN601", name: "Corporate Finance" },
    { id: "def-ops", code: "OPS601", name: "Operations Management" },
    { id: "def-strat", code: "STRAT601", name: "Strategy & Management" },
  ];
  const subjectList = availableSubjects.length > 0 ? availableSubjects : defaultSubjects;

  // 1. Identify Subject match
  let matchedSubjectCode: string | undefined = undefined;
  for (const subj of subjectList) {
    const codeMatch = lower.includes(subj.code.toLowerCase());
    const nameWords = subj.name.toLowerCase().split(/\s+/);
    const nameMatch = nameWords.some((w) => w.length > 3 && lower.includes(w));
    if (codeMatch || nameMatch) {
      matchedSubjectCode = subj.code;
      break;
    }
  }

  // Fallback to first available subject if no direct match found
  if (!matchedSubjectCode && availableSubjects.length > 0) {
    matchedSubjectCode = availableSubjects[0].code;
  }

  // 2. Extract Deliverable Format (e.g. "10 slides", "5 page pdf", "excel model")
  let deliverableFormat: string | undefined = undefined;
  const slideMatch = text.match(/(\d+\s*[-]?\s*slides?)/i);
  const pageMatch = text.match(/(\d+\s*[-]?\s*pages?(?:\s*pdf)?)/i);
  const reportMatch = text.match(/(pdf\s*(?:report|deck|memo|submission)?)/i);
  const wordMatch = text.match(/(\d+[\d,]*\s*words?)/i);

  if (slideMatch) {
    deliverableFormat = slideMatch[1];
  } else if (pageMatch) {
    deliverableFormat = pageMatch[1];
  } else if (wordMatch) {
    deliverableFormat = wordMatch[1];
  } else if (reportMatch) {
    deliverableFormat = reportMatch[1].toUpperCase();
  } else if (lower.includes("deck")) {
    deliverableFormat = "Slide Deck";
  } else if (lower.includes("case") || lower.includes("memo")) {
    deliverableFormat = "PDF Memo";
  }

  // 3. Extract Due Date and Time
  const targetDate = new Date(baseDate);
  let daysToAdd = 3; // Default 3 days out if unspecified
  let targetHour = 17; // Default 5:00 PM
  let targetMinute = 0;

  // Day of week detection
  const daysMap: Record<string, number> = {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
  };

  const dayRegex = /\b(mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday|tomorrow|today)\b/i;
  const dayMatch = lower.match(dayRegex);

  if (dayMatch) {
    const matchedDay = dayMatch[1].toLowerCase();
    if (matchedDay === "today") {
      daysToAdd = 0;
    } else if (matchedDay === "tomorrow") {
      daysToAdd = 1;
    } else {
      const targetDayOfWeek = daysMap[matchedDay];
      const currentDayOfWeek = baseDate.getDay();
      daysToAdd = (targetDayOfWeek - currentDayOfWeek + 7) % 7;
      if (daysToAdd === 0) daysToAdd = 7; // Next occurrence
    }
  }

  // Time detection (e.g. "5pm", "11:59pm", "5:00 pm", "23:59")
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch && (timeMatch[3] || lower.includes("at") || lower.includes("due"))) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3]?.toLowerCase();

    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;

    targetHour = hour;
    targetMinute = minute;
  }

  targetDate.setDate(targetDate.getDate() + daysToAdd);
  targetDate.setHours(targetHour, targetMinute, 0, 0);

  // 4. Clean Title extraction
  let title = text
    .replace(/due\s+.*$/i, "")
    .replace(/,\s*\d+.*$/i, "")
    .replace(/\b(for|in)\s+[a-z]{2,4}\d{2,4}\b/i, "")
    .trim();

  if (!title) {
    title = `${matchedSubjectCode || "Course"} Assignment`;
  }

  // Capitalize title properly
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    title,
    matchedSubjectCode,
    deliverableFormat: deliverableFormat || "PDF Document",
    deadline: targetDate.toISOString(),
    weight: 15.0,
    confidence: matchedSubjectCode ? 0.95 : 0.8,
  };
}

/**
 * Extracts structured checklist, format rules, deliverables, and limits from an assignment brief text.
 */
export function extractAssignmentBrief(briefText: string): ExtractedAssignmentBrief {
  const text = briefText.trim();
  const lower = text.toLowerCase();

  // Extract page or word limits
  let pageOrWordLimit: string | undefined = undefined;
  const limitMatch = text.match(
    /(?:max(?:imum)?|limit|length)?\s*(?:of)?\s*(\d+\s*[-]?\s*(?:pages?|words?|slides?))/i
  );
  if (limitMatch) {
    pageOrWordLimit = limitMatch[1];
  }

  // Format rules
  const formatRules: string[] = [];
  if (lower.includes("pdf")) formatRules.push("Format: Submit strictly as PDF document.");
  if (lower.includes("slide") || lower.includes("deck") || lower.includes("powerpoint")) {
    formatRules.push("Presentation: Maximum 10-12 professional executive slides.");
  }
  if (lower.includes("font") || lower.includes("times") || lower.includes("arial")) {
    formatRules.push("Typography: Standard 11-12pt font with 1.5 line spacing.");
  }
  if (lower.includes("margin") || lower.includes("1 inch")) {
    formatRules.push("Margins: Standard 1-inch margins on all sides.");
  }
  if (lower.includes("appendix") || lower.includes("appendices")) {
    formatRules.push("Appendices: Supporting models & data sheets placed in appendix.");
  }
  if (lower.includes("citation") || lower.includes("apa") || lower.includes("harvard")) {
    formatRules.push("Referencing: Formal APA / Harvard citations required.");
  }

  if (formatRules.length === 0) {
    formatRules.push("Executive memo format: Clear executive summary upfront.");
    formatRules.push("Submit verified PDF deliverable before deadline cutoff.");
  }

  // Deliverables & Checklist
  const deliverables: string[] = [];
  const checklist: { item: string; done: boolean }[] = [];

  // Look for bullet points or numbered lists in brief
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (
      line.startsWith("-") ||
      line.startsWith("•") ||
      line.startsWith("*") ||
      /^\d+[\.\)]/.test(line)
    ) {
      const clean = line.replace(/^[-•*\d\.\)\s]+/, "").trim();
      if (clean.length > 10 && clean.length < 150) {
        checklist.push({ item: clean, done: false });
        if (deliverables.length < 4) deliverables.push(clean);
      }
    }
  }

  // If no bullets found, generate standard business school deliverables from text keywords
  if (checklist.length === 0) {
    checklist.push({ item: "Executive Summary & Key Strategic Recommendation", done: false });
    if (lower.includes("financial") || lower.includes("valuation") || lower.includes("dcf")) {
      checklist.push({ item: "Financial Modeling & Sensitivity Valuation Table", done: false });
      deliverables.push("Financial Model & Valuation Table");
    }
    if (lower.includes("market") || lower.includes("competitor") || lower.includes("segment")) {
      checklist.push({ item: "Competitive Landscape & Market Segmentation Analysis", done: false });
      deliverables.push("Market Landscape Assessment");
    }
    if (lower.includes("risk") || lower.includes("implementation")) {
      checklist.push({ item: "Risk Mitigation Matrix & Implementation Timeline", done: false });
      deliverables.push("Implementation Roadmap");
    }
    checklist.push({ item: "Final Deliverable Review & Formatting Verification", done: false });
    deliverables.unshift("Executive Briefing Memorandum");
  }

  let suggestedFormat = "PDF Document";
  if (lower.includes("slide") || lower.includes("deck")) suggestedFormat = "10-Slide Deck (PDF)";
  else if (pageOrWordLimit) suggestedFormat = `PDF (${pageOrWordLimit})`;

  return {
    title: lines[0]?.slice(0, 60) || "Course Assignment",
    deliverables,
    formatRules,
    pageOrWordLimit,
    checklist,
    suggestedDeliverableFormat: suggestedFormat,
  };
}

export type ParsedQuestion = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation?: string;
};

/**
 * Parses bulk pasted MCQs. Handles formats like:
 *   1. Question text?
 *   A) option
 *   B) option
 *   C) option
 *   D) option
 *   Answer: B
 *
 * Tolerant of inline format on a single line.
 */
export function parseBulkQuestions(raw: string): ParsedQuestion[] {
  const text = raw.replace(/\r/g, "");
  // Split into blocks separated by blank lines, OR by a leading "N." pattern when condensed.
  const blocks = text
    .split(/\n\s*\n/)
    .flatMap((b) => splitInline(b))
    .map((b) => b.trim())
    .filter(Boolean);

  const out: ParsedQuestion[] = [];
  for (const block of blocks) {
    const q = parseBlock(block);
    if (q) out.push(q);
  }
  return out;
}

function splitInline(block: string): string[] {
  // If a single line has multiple "N. ..." entries, split them.
  if (block.split("\n").length > 1) return [block];
  const parts = block.split(/(?=\b\d{1,3}\.\s)/g).filter(Boolean);
  return parts.length ? parts : [block];
}

function parseBlock(block: string): ParsedQuestion | null {
  // Remove leading numbering
  const cleaned = block.replace(/^\s*\d{1,3}[\.\)]\s*/, "");
  const optionRegex = /([A-D])[\)\.\:]\s*([^\n]*?)(?=\s+[A-D][\)\.\:]\s|\s*Answer\s*[:\-]|$)/gis;
  const answerMatch = cleaned.match(/Answer\s*[:\-]\s*([A-D])/i);
  const explanationMatch = cleaned.match(/(?:Explanation|Explain)\s*[:\-]\s*([\s\S]*)$/i);

  if (!answerMatch) return null;
  const correct = answerMatch[1].toUpperCase() as ParsedQuestion["correct_answer"];

  const opts: Record<string, string> = {};
  for (const m of cleaned.matchAll(optionRegex)) {
    opts[m[1].toUpperCase()] = m[2].trim().replace(/\s+/g, " ");
  }
  if (!opts.A || !opts.B || !opts.C || !opts.D) return null;

  const firstOptionIdx = cleaned.search(/[A-D][\)\.\:]\s/);
  if (firstOptionIdx < 0) return null;
  const question_text = cleaned.slice(0, firstOptionIdx).trim().replace(/\s+/g, " ");
  if (!question_text) return null;

  return {
    question_text,
    option_a: opts.A,
    option_b: opts.B,
    option_c: opts.C,
    option_d: opts.D,
    correct_answer: correct,
    explanation: explanationMatch?.[1]?.trim(),
  };
}

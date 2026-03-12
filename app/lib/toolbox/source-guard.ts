const SOURCE_ONLY_TOOLS = new Set(["notes", "quiz"]);

// No blocked patterns — users can paste anything (Wikipedia, URLs, etc.).
// The guard only ensures AI output is grounded in user-provided text, not that
// the user's input is "clean".
const BLOCKED_PATTERNS: RegExp[] = [];

function collectText(value: any): string[] {
  if (value == null) return [];
  if (typeof value === "string") return [value];
  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(collectText);
  if (typeof value === "object") return Object.values(value).flatMap(collectText);
  return [];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4);
}

function overlapRatio(sourceText: string, outputText: string): number {
  const sourceTokens = new Set(tokenize(sourceText));
  const outputTokens = [...new Set(tokenize(outputText))];
  if (outputTokens.length === 0) return 0;
  const shared = outputTokens.filter((token) => sourceTokens.has(token)).length;
  return shared / outputTokens.length;
}

export function enforceSourceOnlyGuard(payload: {
  toolId: string;
  inputPayload?: Record<string, any>;
  outputPayload: any;
}) {
  if (!SOURCE_ONLY_TOOLS.has(payload.toolId)) return;

  const sourceText = String(payload.inputPayload?.sourceText || "").trim();

  const outputText = collectText(payload.outputPayload).join(" ");
  if (!outputText.trim()) {
    const err = new Error("Generated output is empty.");
    (err as any).code = "SOURCE_GUARD_FAILED";
    throw err;
  }

  const blocked = BLOCKED_PATTERNS.find((pattern) => pattern.test(outputText));
  if (blocked) {
    const err = new Error("Generated output references external sources, which is not allowed.");
    (err as any).code = "SOURCE_GUARD_FAILED";
    throw err;
  }

  const ratio = overlapRatio(sourceText, outputText);
  if (ratio < 0.06) {
    const err = new Error("Generated output is not sufficiently grounded in provided source text.");
    (err as any).code = "SOURCE_GUARD_FAILED";
    throw err;
  }
}


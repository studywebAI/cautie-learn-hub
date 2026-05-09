import { z } from "zod";
import { FlashcardSchema, McqQuestionSchema, QuizSchema } from "@/lib/types";

const NotesSchema = z.object({
  notes: z.array(
    z.object({
      title: z.string().min(1),
      content: z.union([z.string(), z.array(z.any())]),
    })
  ),
});

const FlashcardsSchema = z.object({
  flashcards: z.array(FlashcardSchema),
});

const SUPPORTED_OPENAI_FALLBACK_FLOWS = new Set([
  "generateQuiz",
  "generateFlashcards",
  "generateNotes",
  "generateMultipleChoiceFromFlashcard",
]);

export function canUseOpenAIFallback(flowName: string) {
  return SUPPORTED_OPENAI_FALLBACK_FLOWS.has(flowName);
}

export function shouldFallbackToOpenAI(error: unknown) {
  const code = String((error as any)?.code || "").toLowerCase();
  const status = Number((error as any)?.status || (error as any)?.statusCode || 0);
  const message = String((error as any)?.message || "").toLowerCase();
  const combined = `${code} ${message}`;

  // Do not retry functional/validation failures on another provider.
  if (
    combined.includes("source_guard_failed") ||
    combined.includes("validation") ||
    combined.includes("zod") ||
    combined.includes("unauthorized") ||
    combined.includes("forbidden") ||
    combined.includes("source_required") ||
    combined.includes("setting_conflict") ||
    combined.includes("invalid payload")
  ) {
    return false;
  }

  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }

  if (
    combined.includes("token") ||
    combined.includes("context length") ||
    combined.includes("maximum context") ||
    combined.includes("too large") ||
    combined.includes("resource exhausted") ||
    combined.includes("quota") ||
    combined.includes("rate limit") ||
    combined.includes("deadline exceeded") ||
    combined.includes("unavailable") ||
    combined.includes("overloaded")
  ) {
    return true;
  }

  // Auto-mode policy: unknown Gemini/runtime failures should still attempt OpenAI fallback.
  return true;
}

function parseJsonFromModel(content: string) {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Empty fallback response");

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());
    throw new Error("Invalid JSON from fallback model");
  }
}

function extractAssistantText(payload: any): string {
  const choice = payload?.choices?.[0];
  const message = choice?.message;
  const content = message?.content;

  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const text = content
      .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join("\n");
    if (text.trim()) return text;
  }

  const refusal =
    (typeof message?.refusal === "string" && message.refusal) ||
    (typeof choice?.finish_reason === "string" && choice.finish_reason === "content_filter"
      ? "Response blocked by content filter."
      : "");
  if (refusal) {
    const err = new Error(refusal) as Error & { code?: string };
    err.code = "OPENAI_RESPONSE_BLOCKED";
    throw err;
  }

  return "";
}

function normalizeNoteContentEntry(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const preferred =
      (typeof obj.text === "string" && obj.text) ||
      (typeof obj.content === "string" && obj.content) ||
      (typeof obj.value === "string" && obj.value) ||
      (typeof obj.title === "string" && obj.title);
    if (preferred) return preferred.trim();
    try {
      return JSON.stringify(obj);
    } catch {
      return "";
    }
  }
  return "";
}

function normalizeNotesOutput(payload: z.infer<typeof NotesSchema>) {
  return {
    notes: (payload.notes || []).map((section) => {
      const title = String(section.title || "Section").trim() || "Section";
      const rawContent = section.content;
      if (typeof rawContent === "string") {
        return { title, content: rawContent.trim() };
      }
      const normalizedList = (Array.isArray(rawContent) ? rawContent : [])
        .map((entry) => normalizeNoteContentEntry(entry))
        .filter(Boolean);
      return { title, content: normalizedList.length > 0 ? normalizedList : ["No content provided."] };
    }),
  };
}

async function callOpenAIJson<T>({
  apiKey,
  model,
  system,
  user,
  schema,
  baseUrl,
}: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  baseUrl?: string;
}) {
  const normalizedBaseUrl = String(baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const isOpenRouter = normalizedBaseUrl.includes("openrouter.ai");
  const response = await fetch(`${normalizedBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(isOpenRouter
        ? {
            "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || process.env.NEXT_PUBLIC_APP_URL || "",
            "X-Title": process.env.OPENROUTER_APP_TITLE || "Cautie Learn Hub",
          }
        : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({} as any));
    const err = new Error(
      `OpenAI ${response.status}: ${String(payload?.error?.message || response.statusText || "Request failed")}`
    ) as Error & { code?: string; status?: number };
    err.code = String(payload?.error?.code || `OPENAI_HTTP_${response.status}`);
    err.status = response.status;
    throw err;
  }
  const json: any = await response.json();
  const content = extractAssistantText(json);
  if (!String(content || "").trim()) {
    const err = new Error(
      `OpenAI returned empty content (finish_reason=${String(json?.choices?.[0]?.finish_reason || "unknown")})`
    ) as Error & { code?: string };
    err.code = "OPENAI_EMPTY_OUTPUT";
    throw err;
  }
  const parsed = parseJsonFromModel(content);
  return schema.parse(parsed);
}

export async function executeOpenAIFallbackFlow(flowName: string, input: any, apiKey: string, modelOverride?: string) {
  const model = String(modelOverride || process.env.OPENAI_FALLBACK_MODEL || "google/gemini-2.5-flash-lite").trim() || "google/gemini-2.5-flash-lite";
  const baseUrl = String(process.env.OPENAI_COMPAT_BASE_URL || "https://openrouter.ai/api/v1").trim();
  const grounding = String(input?.groundingInstruction || "").trim();
  const rawSourceText = String(input?.sourceText || "").trim();
  const maxSourceChars = 22000;
  const sourceText =
    rawSourceText.length > maxSourceChars
      ? `${rawSourceText.slice(0, maxSourceChars)}\n\n[TRUNCATED_FOR_OPENAI_FALLBACK]`
      : rawSourceText;

  if (flowName === "generateQuiz") {
    const questionCount = Number(input?.questionCount || 7);
    return callOpenAIJson({
      apiKey,
      model,
      baseUrl,
      schema: QuizSchema,
      system:
        "Generate clean educational quiz JSON only. Use only supplied source content. Never invent facts.",
      user: [
        grounding,
        `Language: ${String(input?.language || "en")}`,
        `Region: ${String(input?.regionCode || "global")}`,
        `Education level: ${String(input?.educationLevel || "2")}`,
        `Question count: ${String(Number.isFinite(questionCount) ? Math.max(1, Math.min(50, questionCount)) : 7)}`,
        `Quiz mode: ${String(input?.quizMode || 'classic')}`,
        `Question types: ${Array.isArray(input?.questionTypes) ? input.questionTypes.join(', ') : String(input?.questionType || 'multiple-choice')}`,
        `Knowledge score (0-100): ${String(Number.isFinite(Number(input?.knowledgeScore)) ? Number(input.knowledgeScore) : 50)}`,
        `Feedback timing: ${String(input?.feedbackTiming || 'end')}`,
        "Return JSON with fields: title, description, questions[].id/question/options[].id/text/isCorrect.",
        `Source:\n${sourceText}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
  }

  if (flowName === "generateFlashcards") {
    const count = Number(input?.count || 10);
    return callOpenAIJson({
      apiKey,
      model,
      baseUrl,
      schema: FlashcardsSchema,
      system:
        "Generate flashcards as strict JSON only. Use only source content. Do not hallucinate.",
      user: [
        grounding,
        `Language: ${String(input?.language || "en")}`,
        `Region: ${String(input?.regionCode || "global")}`,
        `Education level: ${String(input?.educationLevel || "2")}`,
        `Count: ${String(Number.isFinite(count) ? Math.max(1, Math.min(50, count)) : 10)}`,
        "Return JSON with field flashcards[].id/front/back/cloze.",
        `Source:\n${sourceText}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
  }

  if (flowName === "generateNotes") {
    const raw = await callOpenAIJson({
      apiKey,
      model,
      baseUrl,
      schema: NotesSchema,
      system:
        "Generate structured notes JSON only. Use only source content and stay concise and useful.",
      user: [
        grounding,
        `Length: ${String(input?.length || "medium")}`,
        `Style: ${String(input?.style || "structured")}`,
        `Region: ${String(input?.regionCode || "global")}`,
        `Education level: ${String(input?.educationLevel || "2")}`,
        "Return JSON with field notes[].title/content.",
        `Source:\n${sourceText}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    return normalizeNotesOutput(raw);
  }

  if (flowName === "generateMultipleChoiceFromFlashcard") {
    const front = String(input?.front || "").trim();
    const back = String(input?.back || "").trim();
    return callOpenAIJson({
      apiKey,
      model,
      baseUrl,
      schema: McqQuestionSchema,
      system: "Generate exactly one MCQ as strict JSON.",
      user: [
        "Return JSON with fields id, question, options[{id,text}], correctOptionId.",
        "Exactly 3 options total, one correct.",
        `Front: ${front}`,
        `Back (correct answer): ${back}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
  }

  throw new Error(`OpenAI fallback not supported for flow '${flowName}'`);
}

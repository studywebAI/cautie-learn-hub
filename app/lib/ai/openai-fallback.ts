import OpenAI from "openai";
import { z } from "zod";
import { FlashcardSchema, McqQuestionSchema, QuizSchema } from "@/lib/types";

const NotesSchema = z.object({
  notes: z.array(
    z.object({
      title: z.string().min(1),
      content: z.union([z.string(), z.array(z.string())]),
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
  const message = String((error as any)?.message || "").toLowerCase();
  if (!message) return false;
  return (
    message.includes("token") ||
    message.includes("context length") ||
    message.includes("maximum context") ||
    message.includes("too large") ||
    message.includes("resource exhausted") ||
    message.includes("quota")
  );
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

async function callOpenAIJson<T>({
  apiKey,
  model,
  system,
  user,
  schema,
}: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
}) {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = response.choices?.[0]?.message?.content || "";
  const parsed = parseJsonFromModel(content);
  return schema.parse(parsed);
}

export async function executeOpenAIFallbackFlow(flowName: string, input: any, apiKey: string) {
  const model = process.env.OPENAI_FALLBACK_MODEL || "gpt-4o-mini";
  const grounding = String(input?.groundingInstruction || "").trim();
  const sourceText = String(input?.sourceText || "").trim();

  if (flowName === "generateQuiz") {
    const questionCount = Number(input?.questionCount || 7);
    return callOpenAIJson({
      apiKey,
      model,
      schema: QuizSchema,
      system:
        "Generate clean educational quiz JSON only. Use only supplied source content. Never invent facts.",
      user: [
        grounding,
        `Language: ${String(input?.language || "en")}`,
        `Region: ${String(input?.regionCode || "global")}`,
        `Education level: ${String(input?.educationLevel || "2")}`,
        `Question count: ${String(Number.isFinite(questionCount) ? Math.max(1, Math.min(50, questionCount)) : 7)}`,
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
    return callOpenAIJson({
      apiKey,
      model,
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
  }

  if (flowName === "generateMultipleChoiceFromFlashcard") {
    const front = String(input?.front || "").trim();
    const back = String(input?.back || "").trim();
    return callOpenAIJson({
      apiKey,
      model,
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

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  readUserAIRuntimeOptions,
  saveUserAISettings,
  type AIProviderPreference,
} from "@/lib/ai/runtime-settings";

function normalizeProvider(value: unknown): AIProviderPreference {
  const raw = String(value || "").toLowerCase();
  if (raw === "openai" || raw === "gemini" || raw === "auto") return raw;
  return "auto";
}

function normalizeOpenAIKey(value: unknown) {
  const key = String(value || "").trim();
  return key;
}

function normalizeOpenAIModel(value: unknown) {
  const model = String(value || "").trim();
  return model || "google/gemini-2.5-flash-lite";
}

function normalizeSttProviderStrategy(value: unknown): "groq_with_openai_fallback" | "openai_only" {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "openai_only") return "openai_only";
  return "groq_with_openai_fallback";
}

export async function GET() {
  const supabase = await createClient(cookies());
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const runtime = await readUserAIRuntimeOptions(supabase, user.id);
  const hasGroqKey = Boolean(String(process.env.GROQ_API_KEY || "").trim());
  const defaultAiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "";
  const hasOpenAIKey = Boolean(runtime.openaiApiKey && runtime.openaiApiKey !== defaultAiKey);
  const usesDefaultOpenAIKey = Boolean(defaultAiKey) && !(runtime.openaiApiKey && runtime.openaiApiKey !== defaultAiKey);
  const effectiveSttProvider =
    runtime.sttProviderStrategy === "openai_only"
      ? "openai"
      : hasGroqKey
        ? "groq"
        : (runtime.openaiApiKey || defaultAiKey ? "openai" : "unavailable");
  return NextResponse.json({
    providerPreference: runtime.providerPreference,
    openaiModel: runtime.openaiModel || "google/gemini-2.5-flash-lite",
    sttProviderStrategy: runtime.sttProviderStrategy || "groq_with_openai_fallback",
    effectiveSttProvider,
    hasGroqKey,
    hasOpenAIKey,
    usesDefaultOpenAIKey,
  });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient(cookies());
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload", code: "INVALID_JSON" }, { status: 400 });
  }

  const providerPreference = normalizeProvider(body?.providerPreference);
  const openaiApiKey = normalizeOpenAIKey(body?.openaiApiKey);
  const openaiModel = normalizeOpenAIModel(body?.openaiModel);
  const sttProviderStrategy = normalizeSttProviderStrategy(body?.sttProviderStrategy);

  if (openaiApiKey && !(openaiApiKey.startsWith("sk-") || openaiApiKey.startsWith("sk-or-") || openaiApiKey.startsWith("sk-or-v1-"))) {
    return NextResponse.json(
      { error: "API key format is invalid", code: "OPENAI_KEY_INVALID" },
      { status: 422 }
    );
  }

  try {
    const saved = await saveUserAISettings(supabase, user.id, {
      providerPreference,
      openaiApiKey: openaiApiKey || null,
      openaiModel,
      sttProviderStrategy,
    });
    const hasGroqKey = Boolean(String(process.env.GROQ_API_KEY || "").trim());
    const effectiveSttProvider =
      saved.sttProviderStrategy === "openai_only"
        ? "openai"
        : hasGroqKey
          ? "groq"
          : (openaiApiKey || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY ? "openai" : "unavailable");
    return NextResponse.json({
      providerPreference: saved.providerPreference,
      openaiModel: saved.openaiModel || "google/gemini-2.5-flash-lite",
      sttProviderStrategy: saved.sttProviderStrategy || "groq_with_openai_fallback",
      effectiveSttProvider,
      hasGroqKey,
      hasOpenAIKey: saved.hasOpenAIKey,
      usesDefaultOpenAIKey: Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY) && !saved.hasOpenAIKey,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Could not save AI settings",
        code: "AI_SETTINGS_SAVE_FAILED",
      },
      { status: 500 }
    );
  }
}

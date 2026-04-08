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

export async function GET() {
  const supabase = await createClient(cookies());
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const runtime = await readUserAIRuntimeOptions(supabase, user.id);
  return NextResponse.json({
    providerPreference: runtime.providerPreference,
    hasOpenAIKey: Boolean(runtime.openaiApiKey && runtime.openaiApiKey !== process.env.OPENAI_API_KEY),
    usesDefaultOpenAIKey: Boolean(process.env.OPENAI_API_KEY) && !(runtime.openaiApiKey && runtime.openaiApiKey !== process.env.OPENAI_API_KEY),
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

  if (openaiApiKey && !openaiApiKey.startsWith("sk-")) {
    return NextResponse.json(
      { error: "OpenAI key format is invalid", code: "OPENAI_KEY_INVALID" },
      { status: 422 }
    );
  }

  try {
    const saved = await saveUserAISettings(supabase, user.id, {
      providerPreference,
      openaiApiKey: openaiApiKey || null,
    });
    return NextResponse.json({
      providerPreference: saved.providerPreference,
      hasOpenAIKey: saved.hasOpenAIKey,
      usesDefaultOpenAIKey: Boolean(process.env.OPENAI_API_KEY) && !saved.hasOpenAIKey,
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

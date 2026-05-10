import { decryptSecret, encryptSecret } from "@/lib/security/encrypted-secrets";
import {
  OPENROUTER_LOCKED_MODEL,
  OPENROUTER_PROVIDER_PREFERENCE,
  normalizeOpenRouterProviderPreference,
  resolveOpenRouterApiKey,
} from "@/lib/ai/openrouter-policy";

export type AIProviderPreference = "openai";

export type AIRuntimeOptions = {
  providerPreference: AIProviderPreference;
  openaiApiKey?: string;
  openaiModel?: string;
  sttProviderStrategy?: "groq_with_openai_fallback" | "openai_only";
};

type UserAISettingsRow = {
  provider_preference: AIProviderPreference | null;
  encrypted_openai_key: string | null;
};

const DEFAULT_PROVIDER: AIProviderPreference = "openai";
const DEFAULT_OPENAI_MODEL: string = OPENROUTER_LOCKED_MODEL;
const DEFAULT_STT_PROVIDER_STRATEGY: AIRuntimeOptions["sttProviderStrategy"] = "groq_with_openai_fallback";

export async function readUserAIRuntimeOptions(
  supabase: any,
  userId: string
): Promise<AIRuntimeOptions> {
  const fallback: AIRuntimeOptions = {
    providerPreference: DEFAULT_PROVIDER,
    openaiApiKey: resolveOpenRouterApiKey() || undefined,
    openaiModel: DEFAULT_OPENAI_MODEL,
    sttProviderStrategy: DEFAULT_STT_PROVIDER_STRATEGY,
  };

  try {
    const { data, error } = await supabase
      .from("user_ai_settings")
      .select("provider_preference, encrypted_openai_key")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return fallback;
    const row = data as UserAISettingsRow;

    const providerPreference = normalizeOpenRouterProviderPreference(row.provider_preference);

    let userOpenAIKey = "";
    if (row.encrypted_openai_key) {
      try {
        userOpenAIKey = decryptSecret(row.encrypted_openai_key);
      } catch {
        userOpenAIKey = "";
      }
    }

    let openaiModel = DEFAULT_OPENAI_MODEL;
    let sttProviderStrategy = DEFAULT_STT_PROVIDER_STRATEGY;
    try {
      const { data: prefRows } = await supabase
        .from("user_preferences")
        .select("preference_key, preference_value")
        .eq("user_id", userId)
        .in("preference_key", ["openai_model", "stt_provider_strategy"]);
      const rows = Array.isArray(prefRows) ? prefRows : [];
      const modelRow = rows.find((row: any) => row?.preference_key === "openai_model");
      const modelCandidate = String(modelRow?.preference_value || "").trim();
      if (modelCandidate) openaiModel = modelCandidate;
      const sttRow = rows.find((row: any) => row?.preference_key === "stt_provider_strategy");
      const sttCandidate = String(sttRow?.preference_value || "").trim().toLowerCase();
      if (sttCandidate === "openai_only" || sttCandidate === "groq_with_openai_fallback") {
        sttProviderStrategy = sttCandidate as AIRuntimeOptions["sttProviderStrategy"];
      }
    } catch {
      // Keep default model when preferences table/row is unavailable.
    }

    return {
      providerPreference,
      openaiApiKey: userOpenAIKey || resolveOpenRouterApiKey() || undefined,
      openaiModel,
      sttProviderStrategy,
    };
  } catch {
    return fallback;
  }
}

export async function saveUserAISettings(
  supabase: any,
  userId: string,
  payload: {
    providerPreference: AIProviderPreference;
    openaiApiKey?: string | null;
    openaiModel?: string | null;
      sttProviderStrategy?: AIRuntimeOptions["sttProviderStrategy"] | null;
  }
) {
  const providerPreference = normalizeOpenRouterProviderPreference(payload.providerPreference);

  const openaiApiKey = String(payload.openaiApiKey || "").trim();
  const encryptedOpenAIKey = openaiApiKey ? encryptSecret(openaiApiKey) : null;
  const openaiModel = String(payload.openaiModel || DEFAULT_OPENAI_MODEL).trim() || DEFAULT_OPENAI_MODEL;
  const sttProviderStrategy =
    payload.sttProviderStrategy === "openai_only" || payload.sttProviderStrategy === "groq_with_openai_fallback"
      ? payload.sttProviderStrategy
      : DEFAULT_STT_PROVIDER_STRATEGY;

  const { error } = await supabase.from("user_ai_settings").upsert(
    {
      user_id: userId,
      provider_preference: providerPreference,
      encrypted_openai_key: encryptedOpenAIKey,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;

  try {
    await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        preference_key: "openai_model",
        preference_value: openaiModel,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,preference_key" }
    );
    await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        preference_key: "stt_provider_strategy",
        preference_value: sttProviderStrategy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,preference_key" }
    );
  } catch {
    // Non-fatal: keep provider/key save successful even if model preference persistence fails.
  }

  return {
    providerPreference,
    hasOpenAIKey: Boolean(encryptedOpenAIKey),
    openaiModel,
    sttProviderStrategy,
  };
}

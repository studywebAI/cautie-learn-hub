import { decryptSecret, encryptSecret } from "@/lib/security/encrypted-secrets";

export type AIProviderPreference = "auto" | "gemini" | "openai";

export type AIRuntimeOptions = {
  providerPreference: AIProviderPreference;
  openaiApiKey?: string;
};

type UserAISettingsRow = {
  provider_preference: AIProviderPreference | null;
  encrypted_openai_key: string | null;
};

const DEFAULT_PROVIDER: AIProviderPreference = "auto";

export async function readUserAIRuntimeOptions(
  supabase: any,
  userId: string
): Promise<AIRuntimeOptions> {
  const fallback: AIRuntimeOptions = {
    providerPreference: DEFAULT_PROVIDER,
    openaiApiKey: process.env.OPENAI_API_KEY || undefined,
  };

  try {
    const { data, error } = await supabase
      .from("user_ai_settings")
      .select("provider_preference, encrypted_openai_key")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return fallback;
    const row = data as UserAISettingsRow;

    const providerPreference =
      row.provider_preference === "gemini" || row.provider_preference === "openai" || row.provider_preference === "auto"
        ? row.provider_preference
        : DEFAULT_PROVIDER;

    let userOpenAIKey = "";
    if (row.encrypted_openai_key) {
      try {
        userOpenAIKey = decryptSecret(row.encrypted_openai_key);
      } catch {
        userOpenAIKey = "";
      }
    }

    return {
      providerPreference,
      openaiApiKey: userOpenAIKey || process.env.OPENAI_API_KEY || undefined,
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
  }
) {
  const providerPreference =
    payload.providerPreference === "gemini" || payload.providerPreference === "openai" || payload.providerPreference === "auto"
      ? payload.providerPreference
      : DEFAULT_PROVIDER;

  const openaiApiKey = String(payload.openaiApiKey || "").trim();
  const encryptedOpenAIKey = openaiApiKey ? encryptSecret(openaiApiKey) : null;

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

  return {
    providerPreference,
    hasOpenAIKey: Boolean(encryptedOpenAIKey),
  };
}
